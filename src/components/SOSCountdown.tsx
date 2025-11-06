import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SOSCountdownProps {
  onComplete: () => void;
  onCancel: () => void;
}

const SOSCountdown = ({ onComplete, onCancel }: SOSCountdownProps) => {
  const [countdown, setCountdown] = useState(3);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playBeep = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  };

  useEffect(() => {
    playBeep();

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [countdown, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-destructive/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
      <div className="text-center space-y-8">
        <AlertTriangle className="h-32 w-32 text-white mx-auto animate-pulse" />
        
        <div className="space-y-4">
          <h2 className="text-6xl font-bold text-white">
            {countdown}
          </h2>
          <p className="text-2xl text-white font-semibold">
            Calling Emergency Services...
          </p>
          <p className="text-lg text-white/80">
            Alerting your emergency contacts
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-white">
          <Phone className="h-6 w-6 animate-bounce" />
          <span className="text-xl">SOS Alert Active</span>
        </div>

        <Button
          onClick={onCancel}
          variant="outline"
          size="lg"
          className="bg-white/20 text-white border-white/40 hover:bg-white/30 text-lg px-8 py-6"
        >
          Cancel SOS
        </Button>
      </div>
    </div>
  );
};

export default SOSCountdown;
