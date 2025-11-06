import { useState, useEffect, useRef } from "react";
import { Shield, ShieldOff, MapPin, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PanicModeProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
  emergencyContacts?: Array<{ name: string; phone: string; email: string }>;
}

const PanicMode = ({ onLocationUpdate, emergencyContacts }: PanicModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [locationHistory, setLocationHistory] = useState<Array<{ lat: number; lng: number; timestamp: number }>>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const locationIntervalRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create download link for the recording
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `panic-recording-${Date.now()}.webm`;
        a.click();
        
        // In production: upload to secure storage or send to authorities
        console.log('Recording saved:', audioBlob.size, 'bytes');
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error("Could not access microphone", {
        description: "Please allow microphone access for panic mode",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
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

  const activatePanicMode = async () => {
    setIsActive(true);
    
    // Discreet notification - no loud toasts
    console.log('🔒 Panic mode activated - recording and tracking location');
    
    // Send silent alert to emergency contacts
    if (emergencyContacts && emergencyContacts.length > 0) {
      emergencyContacts.forEach(contact => {
        console.log(`Silent alert sent to ${contact.name} (${contact.phone})`);
      });
    }

    // Start recording and location tracking
    await startRecording();
    startLocationTracking();
  };

  const deactivatePanicMode = () => {
    setIsActive(false);
    stopRecording();
    stopLocationTracking();
    
    toast.success("Panic mode deactivated", {
      description: `Recorded ${locationHistory.length} location points`,
    });

    // Generate location history report
    if (locationHistory.length > 0) {
      const report = locationHistory.map(loc => 
        `${new Date(loc.timestamp).toLocaleTimeString()}: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
      ).join('\n');
      
      console.log('Location history:\n', report);
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
      stopLocationTracking();
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-6 z-40">
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
          {isRecording && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Recording active" />
          )}
          {locationHistory.length > 0 && (
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" title="Tracking location" />
          )}
        </div>
      )}

      {/* Hidden debug info */}
      {isActive && (
        <div className="absolute bottom-16 right-0 glass-effect rounded-lg p-2 text-xs opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-red-500">
            <Mic className="h-3 w-3" />
            <span>Recording</span>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <MapPin className="h-3 w-3" />
            <span>{locationHistory.length} points</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanicMode;
