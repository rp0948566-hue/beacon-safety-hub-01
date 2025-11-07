import { Shield } from "lucide-react";

const SafetyIndicator3D = () => {
  return (
    <div className="relative w-full max-w-md mx-auto my-12 perspective-1000">
      <div className="relative transform-gpu animate-float">
        {/* 3D Shield with neural network effect */}
        <div className="relative w-64 h-64 mx-auto">
          {/* Neural network rings */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-neural-pulse" />
          <div className="absolute inset-4 rounded-full border-4 border-primary/40 animate-neural-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute inset-8 rounded-full border-4 border-primary/50 animate-neural-pulse" style={{ animationDelay: "1s" }} />
          
          {/* Center shield */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative glass-effect rounded-full p-8 shadow-[var(--shadow-neural)]">
              <Shield className="h-24 w-24 text-primary animate-pulse-glow" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl animate-pulse" />
            </div>
          </div>

          {/* Scanning effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-spin" style={{ animationDuration: "8s" }} />
        </div>

        {/* Status text */}
        <div className="text-center mt-8 space-y-2">
          <h3 className="text-3xl font-bold gradient-text">
            YOU ARE PROTECTED
          </h3>
          <p className="text-lg text-muted-foreground">
            NeuroShield Active • 24/7 Monitoring
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary font-semibold">All Systems Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyIndicator3D;
