import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Share2, Volume2 } from "lucide-react";
import EmergencyButton from "@/components/EmergencyButton";
import ContactForm from "@/components/ContactForm";
import LocationMap from "@/components/LocationMap";
import { toast } from "sonner";
import heroImage from "@/assets/hero-safety.jpg";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSOS = () => {
    toast.error("SOS Alert Activated!", {
      description: "Emergency contacts are being notified",
      duration: 5000,
    });
    // In production: trigger actual SOS alert
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
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
          <div className="inline-block p-4 rounded-2xl glass-effect mb-4 animate-float">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-6 animate-fade-in">
            SafeGuard
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Your Personal Safety Companion. Stay protected, stay connected, stay empowered.
          </p>

          {/* Emergency Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
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

          <div className="mt-8 glass-effect rounded-full px-6 py-3 inline-block animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm text-muted-foreground">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              24/7 Emergency Support Active
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
              Add trusted contacts who will be notified in case of emergency
            </p>
          </div>
          
          <ContactForm />
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
      <footer className="py-8 px-4 border-t border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold gradient-text">SafeGuard</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Empowering women with technology. Your safety is our priority.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            © 2025 SafeGuard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
