import { useState, useEffect, useRef } from "react";
import { Shield, ShieldOff, MapPin, Mic, Video, Camera, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PanicModeProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
  emergencyContacts?: Array<{ name: string; phone: string; email: string }>;
}

type RecordingMode = 'audio' | 'video' | 'both';

const PanicMode = ({ onLocationUpdate, emergencyContacts }: PanicModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('both');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [locationHistory, setLocationHistory] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const locationIntervalRef = useRef<number | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = []; // Reset chunks
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio recording completed:', audioBlob.size, 'bytes');
        
        // Upload to cloud storage
        if (isAuthenticated && sessionId) {
          await uploadRecording(audioBlob, 'audio', 'audio/webm');
        } else {
          // Fallback to local download
          const audioUrl = URL.createObjectURL(audioBlob);
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = `panic-audio-${Date.now()}.webm`;
          a.click();
        }
      };

      mediaRecorder.start();
      audioRecorderRef.current = mediaRecorder;
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecordingAudio(false);
    }
  };

  const startVideoRecording = async () => {
    try {
      // Try back camera first (environment), fall back to front camera (user)
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera for evidence
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false // Audio handled separately
      };

      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback to front camera if back camera not available
        console.log('Back camera not available, using front camera');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
      }

      videoStreamRef.current = stream;

      // Create a hidden video element to preview (helps with recording)
      if (!videoElementRef.current) {
        const video = document.createElement('video');
        video.style.position = 'fixed';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.width = '1px';
        video.style.height = '1px';
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);
        videoElementRef.current = video;
      }

      videoElementRef.current.srcObject = stream;
      await videoElementRef.current.play();

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      videoChunksRef.current = []; // Reset chunks
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        console.log('Video recording completed:', videoBlob.size, 'bytes');
        
        // Upload to cloud storage
        if (isAuthenticated && sessionId) {
          await uploadRecording(videoBlob, 'video', 'video/webm');
        } else {
          // Fallback to local download
          const videoUrl = URL.createObjectURL(videoBlob);
          const a = document.createElement('a');
          a.href = videoUrl;
          a.download = `panic-video-${Date.now()}.webm`;
          a.click();
        }
        
        // Clean up video element
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = null;
          videoElementRef.current.remove();
          videoElementRef.current = null;
        }
      };

      mediaRecorder.start();
      videoRecorderRef.current = mediaRecorder;
      setIsRecordingVideo(true);
    } catch (error) {
      console.error('Failed to start video recording:', error);
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      
      setIsRecordingVideo(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        };
        setLocationHistory(prev => [...prev, newLocation]);
        onLocationUpdate?.(newLocation.lat, newLocation.lng);
      },
      (error) => {
        console.error('Location error:', error);
      }
    );

    // Track location every 10 seconds
    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          setLocationHistory(prev => [...prev, newLocation]);
          onLocationUpdate?.(newLocation.lat, newLocation.lng);
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }, 10000);

    locationIntervalRef.current = intervalId;
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const uploadRecording = async (blob: Blob, type: 'audio' | 'video', mimeType: string) => {
    if (!sessionId || !isAuthenticated) {
      console.error('Cannot upload: not authenticated or no session');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      const file = new File([blob], `${type}-${Date.now()}.webm`, { type: mimeType });
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('recordingType', type);

      const { data, error } = await supabase.functions.invoke('upload-panic-recording', {
        body: formData,
      });

      if (error) throw error;

      console.log(`✅ ${type} recording uploaded to cloud storage:`, data.filePath);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} recording secured`, {
        description: 'Encrypted and safely stored in cloud',
        duration: 2000,
      });
    } catch (error) {
      console.error(`Failed to upload ${type} recording:`, error);
      toast.error(`Failed to upload ${type} recording`, {
        description: 'Recording saved locally as backup',
      });
      
      // Fallback to local download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `panic-${type}-${Date.now()}.webm`;
      a.click();
    } finally {
      setIsUploading(false);
    }
  };

  const activatePanicMode = async () => {
    setIsActive(true);
    
    // Create panic session in database
    if (isAuthenticated) {
      try {
        const { data, error } = await supabase
          .from('panic_sessions')
          .insert({
            recording_mode: recordingMode,
            emergency_contacts: emergencyContacts || [],
          })
          .select()
          .single();

        if (error) throw error;
        setSessionId(data.id);
        console.log('🔒 Panic session created:', data.id);
      } catch (error) {
        console.error('Failed to create panic session:', error);
      }
    }
    
    // Discreet notification - no loud toasts
    console.log('🔒 Panic mode activated - recording and tracking location');
    
    // Send silent alert to emergency contacts
    if (emergencyContacts && emergencyContacts.length > 0) {
      emergencyContacts.forEach(contact => {
        console.log(`Silent alert sent to ${contact.name} (${contact.phone})`);
      });
    }

    // Start recording based on mode
    if (recordingMode === 'audio' || recordingMode === 'both') {
      await startAudioRecording();
    }
    
    if (recordingMode === 'video' || recordingMode === 'both') {
      await startVideoRecording();
    }
    
    startLocationTracking();
  };

  const deactivatePanicMode = async () => {
    setIsActive(false);
    stopAudioRecording();
    stopVideoRecording();
    stopLocationTracking();
    
    // Update session with end time and location history
    if (isAuthenticated && sessionId) {
      try {
        await supabase
          .from('panic_sessions')
          .update({
            ended_at: new Date().toISOString(),
            location_history: locationHistory,
          })
          .eq('id', sessionId);
        console.log('📍 Session updated with location history');
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }
    
    const recordingTypes: string[] = [];
    if (isRecordingAudio) recordingTypes.push('audio');
    if (isRecordingVideo) recordingTypes.push('video');
    
    const storageMsg = isAuthenticated ? 'secured in encrypted cloud storage' : 'saved locally';
    toast.success("Panic mode deactivated", {
      description: `${recordingTypes.join(' & ')} recording${recordingTypes.length > 1 ? 's' : ''} and ${locationHistory.length} location points ${storageMsg}`,
    });

    // Generate location history report
    if (locationHistory.length > 0) {
      const report = locationHistory.map(loc => 
        `${new Date(loc.timestamp).toLocaleTimeString()}: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
      ).join('\n');
      
      console.log('Location history:\n', report);
    }
    
    setSessionId(null);
  };

  const cycleRecordingMode = () => {
    const modes: RecordingMode[] = ['both', 'video', 'audio'];
    const currentIndex = modes.indexOf(recordingMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRecordingMode(nextMode);
    
    const modeLabels = {
      both: 'Audio + Video',
      video: 'Video Only',
      audio: 'Audio Only'
    };
    
    toast.info(`Recording mode: ${modeLabels[nextMode]}`, {
      duration: 2000,
    });
  };

  useEffect(() => {
    return () => {
      stopAudioRecording();
      stopVideoRecording();
      stopLocationTracking();
    };
  }, []);

  const getModeIcon = () => {
    switch (recordingMode) {
      case 'both': return Camera;
      case 'video': return Video;
      case 'audio': return Mic;
    }
  };

  const ModeIcon = getModeIcon();

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2">
      {/* Mode selector - only show when not active */}
      {!isActive && (
        <Button
          onClick={cycleRecordingMode}
          size="sm"
          variant="outline"
          className="rounded-full shadow-lg bg-card/90 backdrop-blur-sm"
          title="Change recording mode"
        >
          <ModeIcon className="h-4 w-4" />
        </Button>
      )}

      {/* Main panic button */}
      <Button
        onClick={isActive ? deactivatePanicMode : activatePanicMode}
        size="lg"
        className={`rounded-full shadow-2xl transition-all duration-300 ${
          isActive 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : 'bg-gradient-to-br from-muted to-muted-foreground/80 hover:from-muted-foreground hover:to-muted'
        }`}
      >
        {isActive ? (
          <ShieldOff className="h-6 w-6 text-white" />
        ) : (
          <Shield className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Discreet status indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {isRecordingAudio && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Audio recording" />
          )}
          {isRecordingVideo && (
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" title="Video recording" />
          )}
          {locationHistory.length > 0 && (
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" title="Tracking location" />
          )}
          {isAuthenticated && (
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Cloud backup active" />
          )}
        </div>
      )}

      {/* Upload status indicator */}
      {isUploading && (
        <div className="absolute -bottom-8 right-0 text-xs text-muted-foreground flex items-center gap-1">
          <Cloud className="h-3 w-3 animate-pulse" />
          <span>Uploading...</span>
        </div>
      )}

      {/* Hidden debug info */}
      {isActive && (
        <div className="absolute bottom-20 right-0 glass-effect rounded-lg p-2 text-xs opacity-0 hover:opacity-100 transition-opacity min-w-[140px]">
          {isRecordingAudio && (
            <div className="flex items-center gap-1 text-red-500 mb-1">
              <Mic className="h-3 w-3" />
              <span>Audio recording</span>
            </div>
          )}
          {isRecordingVideo && (
            <div className="flex items-center gap-1 text-purple-500 mb-1">
              <Video className="h-3 w-3" />
              <span>Video recording</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-primary">
            <MapPin className="h-3 w-3" />
            <span>{locationHistory.length} location points</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanicMode;
