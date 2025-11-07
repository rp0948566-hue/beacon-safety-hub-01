import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Share2, Volume2, Brain, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import EmergencyButton from "@/components/EmergencyButton";
import ContactForm from "@/components/ContactForm";
import LocationMap from "@/components/LocationMap";
import BatteryIndicator from "@/components/BatteryIndicator";
import SafeZoneIndicator from "@/components/SafeZoneIndicator";
import SOSCountdown from "@/components/SOSCountdown";
import SafetyIndicator3D from "@/components/SafetyIndicator3D";
import PanicMode from "@/components/PanicMode";
import { toast } from "sonner";
import heroImage from "@/assets/app.png";

const Index = () => {
  const { theme, setTheme } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const [showSOSCountdown, setShowSOSCountdown] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string; email: string }>>([]);
  const [panicLocation, setPanicLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isBuzzerPlaying, setIsBuzzerPlaying] = useState(false);
  const [buzzerOscillator, setBuzzerOscillator] = useState<OscillatorNode | null>(null);
  const [buzzerAudioContext, setBuzzerAudioContext] = useState<AudioContext | null>(null);
  const [rachAIStatus, setRachAIStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [safeZoneStatus, setSafeZoneStatus] = useState<'safe' | 'moderate' | 'risk' | 'unknown'>('unknown');
  const [crimeStats, setCrimeStats] = useState<any>(null);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [safetyRecommendations, setSafetyRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Rach-AI Status Polling
  useEffect(() => {
    const pollRachAIStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/status');
        const data = await response.json();
        setRachAIStatus(data.analysisStatus);
        setSafeZoneStatus(data.safeZoneStatus);
      } catch (error) {
        console.error('Failed to fetch Rach-AI status:', error);
      }
    };

    const interval = setInterval(pollRachAIStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Update SafeZoneIndicator with crime data
  useEffect(() => {
    if (rachAIStatus === 'completed' && safeZoneStatus !== 'unknown') {
      // Fetch detailed analysis data
      fetch('http://localhost:3001/api/analysis/trigger')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.analysis) {
            setCrimeStats(data.analysis.crimeStats);
            setCurrentCity(data.analysis.city);
            setSafetyRecommendations(data.analysis.recommendations || []);
          }
        })
        .catch(error => {
          console.error('Failed to fetch detailed analysis:', error);
        });
    }
  }, [rachAIStatus, safeZoneStatus]);

  const handleSOS = () => {
    setShowSOSCountdown(true);
  };

  const handleSOSComplete = () => {
    setShowSOSCountdown(false);
    
    // Send alerts to emergency contacts
    if (contacts.length > 0) {
      contacts.forEach(contact => {
        toast.error(`Alert sent to ${contact.name}`, {
          description: `Emergency message sent to ${contact.phone}`,
          duration: 5000,
        });
      });
    }

    toast.error("🚨 SOS Alert Activated!", {
      description: "Emergency services contacted. Location shared with emergency contacts.",
      duration: 8000,
    });

    // Simulate calling emergency services
    setTimeout(() => {
      toast.success("📞 Connected to Emergency Services", {
        description: "Help is on the way. Stay safe!",
      });
    }, 1500);
  };

  const handleSOSCancel = () => {
    setShowSOSCountdown(false);
    toast.info("SOS Alert Cancelled", {
      description: "Emergency alert has been cancelled",
    });
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleBuzzer = () => {
    if (isBuzzerPlaying) {
      // Stop buzzer
      if (buzzerOscillator) {
        buzzerOscillator.stop();
        buzzerOscillator.disconnect();
        setBuzzerOscillator(null);
      }
      if (buzzerAudioContext) {
        buzzerAudioContext.close();
        setBuzzerAudioContext(null);
      }
      setIsBuzzerPlaying(false);
      toast.info("Buzzer Stopped", {
        description: "Alarm has been turned off",
      });
    } else {
      // Start buzzer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequency in Hz
      oscillator.type = 'square'; // Waveform type

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume

      oscillator.start(audioContext.currentTime);

      setBuzzerOscillator(oscillator);
      setBuzzerAudioContext(audioContext);
      setIsBuzzerPlaying(true);
      toast.warning("Buzzer Activated!", {
        description: "Loud alarm is playing continuously",
      });
    }
  };

  const handleBuzzer = () => {
    toggleBuzzer();
  };

  const handleShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          const message = `🚨 Emergency! I'm sharing my location for safety. Please check on me: ${locationUrl}`;
          const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

          // Open WhatsApp Web in a new tab
          window.open(whatsappUrl, '_blank');

          toast.success("Opening WhatsApp Web", {
            description: "Share your location with emergency contacts",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error("Location Access Denied", {
            description: "Please enable location permissions to share your location",
          });
        }
      );
    } else {
      toast.error("Geolocation not supported", {
        description: "Your browser doesn't support location sharing",
      });
    }
  };

  const handlePanicLocationUpdate = async (lat: number, lng: number) => {
    setPanicLocation({ lat, lng });
    console.log(`Panic mode location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Send location to Rach-AI backend for analysis
    try {
      const response = await fetch('http://localhost:3001/api/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng }),
      });

      const data = await response.json();
      console.log('Rach-AI analysis result:', data);

      // Show notification about analysis
      if (data.analysis.status === 'risk') {
        toast.error("⚠️ High Risk Area Detected!", {
          description: "Rach-AI has identified this area as high-risk. Stay alert!",
          duration: 10000,
        });

        // Send alert to emergency contacts if in risk area
        if (contacts.length > 0) {
          contacts.forEach(contact => {
            toast.warning(`Alert sent to ${contact.name}`, {
              description: `High-risk area notification sent to ${contact.phone}`,
              duration: 5000,
            });
          });
        }
      } else if (data.analysis.status === 'safe') {
        toast.success("✅ Safe Zone Confirmed", {
          description: "Rach-AI confirms this area is safe.",
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('Failed to send location to Rach-AI:', error);
      toast.error("Connection Error", {
        description: "Unable to connect to Rach-AI safety analysis.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat neural-grid relative overflow-hidden" style={{ backgroundImage: `url(${heroImage})` }}>
      {showSOSCountdown && (
        <SOSCountdown onComplete={handleSOSComplete} onCancel={handleSOSCancel} />
      )}
      
      {/* Neural network background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>
      {/* Hero Section with Emergency Controls */}
      <section 
        className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
          opacity: 1 - scrollY / 500,
        }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 animate-pulse-glow" />
          <img 
            src={heroImage} 
            alt="Safety Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-soft-light"
          />
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-primary/20 blur-xl animate-float" />
        <div className="absolute bottom-40 right-10 w-32 h-32 rounded-full bg-secondary/20 blur-xl animate-float" style={{ animationDelay: "2s" }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
          <h1 className="text-6xl md:text-8xl font-bold gradient-text mb-6 animate-fade-in tracking-tight">
            SAHAYNI
          </h1>

          <p className="text-xl md:text-3xl font-semibold text-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            AI-Powered Women's Safety | Neural Protection Technology
          </p>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
            Empowering safety through intelligent protection.
          </p>

          {/* Status indicators */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <SafeZoneIndicator
              status={safeZoneStatus}
              rachAIStatus={rachAIStatus}
              crimeStats={crimeStats}
              city={currentCity}
              recommendations={safetyRecommendations}
            />
            <BatteryIndicator />
          </div>

          {/* Emergency Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <EmergencyButton
              icon={AlertTriangle}
              label="SOS"
              onClick={handleSOS}
              variant="sos"
            />
            <EmergencyButton
              icon={Volume2}
              label="BUZZER"
              onClick={handleBuzzer}
              variant="buzzer"
            />
            <EmergencyButton
              icon={Share2}
              label="SHARE"
              onClick={handleShare}
              variant="share"
            />
            <EmergencyButton
              icon={theme === "dark" ? Sun : Moon}
              label="THEME"
              onClick={toggleTheme}
              variant="theme"
            />
          </div>

          <div className="mt-8 glass-effect rounded-full px-6 py-3 inline-block animate-fade-in shadow-[var(--shadow-glow)] dark:bg-white/5 dark:border-white/20" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm font-medium text-foreground dark:text-white">
              <span className="inline-block w-2 h-2 bg-primary dark:bg-blue-400 rounded-full mr-2 animate-pulse" />
              Neural Protection Active • Emergency Response Ready
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full p-1">
            <div className="w-1.5 h-3 bg-primary rounded-full mx-auto animate-pulse" />
          </div>
        </div>
      </section>

      {/* 3D Safety Indicator */}
      <section className="py-20 px-4 relative">
        <SafetyIndicator3D />
      </section>

      {/* Emergency Contacts Section */}
      <section className="py-20 px-4 relative">
        <div 
          className="max-w-4xl mx-auto"
          style={{
            transform: `translateY(${Math.max(0, (scrollY - 400) * -0.1)}px)`,
            opacity: Math.min(1, (scrollY - 300) / 200),
          }}
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Emergency Contacts
            </h2>
            <p className="text-lg text-muted-foreground">
              Add trusted contacts who will be auto-alerted during SOS
            </p>
          </div>
          
          <ContactForm onContactsChange={setContacts} />
        </div>
      </section>

      {/* Location Map Section */}
      <section className="py-20 px-4 relative">
        <div 
          className="max-w-4xl mx-auto"
          style={{
            transform: `translateY(${Math.max(0, (scrollY - 800) * -0.1)}px)`,
            opacity: Math.min(1, (scrollY - 700) / 200),
          }}
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Live Location Tracking
            </h2>
            <p className="text-lg text-muted-foreground">
              Share your real-time location with trusted contacts
            </p>
          </div>
          
          <LocationMap />
        </div>
      </section>

      {/* Safety Tips Section */}
      <section className="py-20 px-4 relative mb-20">
        <div 
          className="max-w-6xl mx-auto"
          style={{
            opacity: Math.min(1, (scrollY - 1200) / 200),
          }}
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Stay Safe, Stay Smart
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Quick Response",
                description: "One-tap emergency alerts sent to all your trusted contacts instantly",
                icon: "⚡",
              },
              {
                title: "Real-Time Tracking",
                description: "Share your live location with emergency contacts automatically",
                icon: "📍",
              },
              {
                title: "Smart Protection",
                description: "AI-powered threat detection and automatic emergency response",
                icon: "🛡️",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-effect rounded-2xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl bg-card/90 dark:bg-white/5 border border-border/80 dark:border-white/30"
                style={{
                  animation: `fade-in 0.6s ease-out ${index * 0.2}s both`,
                }}
              >
                <div className="text-6xl mb-4" style={{ animationDelay: `${index * 0.5}s` }}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 gradient-text text-foreground dark:text-white">{feature.title}</h3>
                <p className="text-muted-foreground dark:text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 bg-card/50 backdrop-blur-xl relative">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-7 w-7 text-primary animate-neural-pulse" />
            <span className="text-2xl font-bold gradient-text tracking-wide">SAHAYNI</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            AI-Powered Women's Safety • Neural Protection Technology
          </p>
          <p className="text-xs text-muted-foreground">
            © 2025 Sahayni. Empowering safety through intelligent protection. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Discreet Panic Mode Button */}
      <PanicMode 
        onLocationUpdate={handlePanicLocationUpdate}
        emergencyContacts={contacts}
      />
    </div>
  );
};

export default Index;
