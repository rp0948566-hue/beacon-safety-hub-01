import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Share2, Volume2, Brain } from "lucide-react";
import EmergencyButton from "@/components/EmergencyButton";
import ContactForm from "@/components/ContactForm";
import LocationMap from "@/components/LocationMap";
import BatteryIndicator from "@/components/BatteryIndicator";
import SafeZoneIndicator from "@/components/SafeZoneIndicator";
import SOSCountdown from "@/components/SOSCountdown";
import SafetyIndicator3D from "@/components/SafetyIndicator3D";
import PanicMode from "@/components/PanicMode";
import RouteTracker from "@/components/RouteTracker";
import { toast } from "sonner";
import heroImage from "@/assets/hero-safety.jpg";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);
  const [showSOSCountdown, setShowSOSCountdown] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string; email: string }>>([]);
  const [panicLocation, setPanicLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleBuzzer = () => {
    toast.warning("Buzzer Activated!", {
      description: "Loud alarm is playing",
    });
    // In production: play actual buzzer sound
  };

  const handleShare = () => {
    toast.success("Sharing your location", {
      description: "Location sent to emergency contacts",
    });
    // In production: share location with contacts
  };

  const handlePanicLocationUpdate = (lat: number, lng: number) => {
    setPanicLocation({ lat, lng });
    console.log(`Panic mode location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 neural-grid relative overflow-hidden">
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
          <div className="inline-block p-6 rounded-3xl glass-effect mb-4 animate-float shadow-[var(--shadow-neural)]">
            <Brain className="h-20 w-20 text-primary animate-neural-pulse" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold gradient-text mb-6 animate-fade-in tracking-tight">
            NEUROSHIELD
          </h1>
          
          <p className="text-xl md:text-3xl font-semibold text-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            When Game-Changing, Becomes Life-Altering
          </p>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
            AI-Powered Safety System • Neural Protection Technology • 24/7 Monitoring
          </p>

          {/* Status indicators */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <SafeZoneIndicator />
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
          </div>

          <div className="mt-8 glass-effect rounded-full px-6 py-3 inline-block animate-fade-in shadow-[var(--shadow-glow)]" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm font-medium">
              <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
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

      {/* Route Tracking Section */}
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
              AI-Powered Route Safety
            </h2>
            <p className="text-lg text-muted-foreground">
              Intelligent monitoring detects deviations and auto-alerts your contacts
            </p>
          </div>
          
          <RouteTracker emergencyContacts={contacts} />
        </div>
      </section>

      {/* Location Map Section */}
      <section className="py-20 px-4 relative">
        <div 
          className="max-w-4xl mx-auto"
          style={{
            transform: `translateY(${Math.max(0, (scrollY - 1000) * -0.1)}px)`,
            opacity: Math.min(1, (scrollY - 900) / 200),
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
                className="glass-effect rounded-2xl p-8 text-center transform transition-all hover:scale-105 hover:shadow-2xl"
                style={{
                  animation: `fade-in 0.6s ease-out ${index * 0.2}s both`,
                }}
              >
                <div className="text-6xl mb-4 animate-float" style={{ animationDelay: `${index * 0.5}s` }}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 gradient-text">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
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
            <span className="text-2xl font-bold gradient-text tracking-wide">NEUROSHIELD</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            AI-Powered Neural Protection • Empowering Women with Advanced Technology
          </p>
          <p className="text-xs text-muted-foreground">
            © 2025 NeuroShield. When Game-Changing, Becomes Life-Altering. All rights reserved.
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
