import { useState, useEffect } from "react";
import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import { toast } from "sonner";

const BatteryIndicator = () => {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const updateBatteryInfo = async () => {
      // @ts-ignore - Battery API is not in TypeScript definitions
      if ('getBattery' in navigator) {
        try {
          // @ts-ignore
          const battery = await navigator.getBattery();
          setIsSupported(true);
          
          const updateBattery = () => {
            const level = Math.round(battery.level * 100);
            setBatteryLevel(level);
            setIsCharging(battery.charging);
            
            // Alert if battery is low and not charging
            if (level < 20 && !battery.charging) {
              toast.warning("Low Battery Warning!", {
                description: `Battery at ${level}%. Please charge your device for safety.`,
              });
            }
          };

          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
        } catch (error) {
          console.log("Battery API not available");
        }
      }
    };

    updateBatteryInfo();
  }, []);

  if (!isSupported || batteryLevel === null) return null;

  const getBatteryIcon = () => {
    if (isCharging) return BatteryCharging;
    if (batteryLevel < 20) return BatteryWarning;
    return Battery;
  };

  const getBatteryColor = () => {
    if (isCharging) return "text-accent dark:text-green-400";
    if (batteryLevel < 20) return "text-destructive dark:text-red-400";
    if (batteryLevel < 50) return "text-orange-500 dark:text-orange-400";
    return "text-primary dark:text-blue-400";
  };

  const Icon = getBatteryIcon();

  return (
    <div className="glass-effect rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in dark:bg-white/5 dark:border-white/20">
      <Icon className={`h-5 w-5 ${getBatteryColor()}`} />
      <span className="text-sm font-medium text-foreground dark:text-white">
        {batteryLevel}%
        {isCharging && <span className="text-yellow-500 dark:text-yellow-400"> ⚡</span>}
      </span>
    </div>
  );
};

export default BatteryIndicator;
