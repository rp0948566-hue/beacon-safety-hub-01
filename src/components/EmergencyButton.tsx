import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmergencyButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "sos" | "buzzer" | "share";
  className?: string;
}

const EmergencyButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "share",
  className 
}: EmergencyButtonProps) => {
  const variantStyles = {
    sos: "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-pulse-glow",
    buzzer: "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-[0_0_25px_rgba(249,115,22,0.4)]",
    share: "bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        "group relative h-20 min-w-[120px] flex-col gap-2 text-white border-0 transition-all duration-300 hover:scale-105 active:scale-95",
        variantStyles[variant],
        className
      )}
    >
      <div className="relative">
        <Icon className="h-8 w-8 transition-transform group-hover:scale-110" />
        {variant === "sos" && (
          <div className="absolute inset-0 animate-ping opacity-75">
            <Icon className="h-8 w-8" />
          </div>
        )}
      </div>
      <span className="text-sm font-semibold tracking-wide">{label}</span>
    </Button>
  );
};

export default EmergencyButton;
