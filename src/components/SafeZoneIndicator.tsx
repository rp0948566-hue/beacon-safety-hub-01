import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface SafeZone {
  lat: number;
  lng: number;
  radius: number; // in meters
  name: string;
}

// Example safe zones (home, office, etc.)
const SAFE_ZONES: SafeZone[] = [
  { lat: 51.505, lng: -0.09, radius: 500, name: "Home" },
];

const SafeZoneIndicator = () => {
  const [isInSafeZone, setIsInSafeZone] = useState<boolean | null>(null);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkSafeZone = (lat: number, lng: number) => {
    for (const zone of SAFE_ZONES) {
      const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
      if (distance <= zone.radius) {
        setIsInSafeZone(true);
        setCurrentZone(zone.name);
        return;
      }
    }
    setIsInSafeZone(false);
    setCurrentZone(null);
    
    toast.warning("Outside Safe Zone", {
      description: "You are currently outside your designated safe zones.",
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkSafeZone(position.coords.latitude, position.coords.longitude);
          setChecking(false);
        },
        () => {
          setChecking(false);
        }
      );

      // Update location every 30 seconds
      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            checkSafeZone(position.coords.latitude, position.coords.longitude);
          },
          () => {}
        );
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  if (checking) return null;

  const getIcon = () => {
    if (isInSafeZone === null) return Shield;
    if (isInSafeZone) return ShieldCheck;
    return ShieldAlert;
  };

  const getColor = () => {
    if (isInSafeZone === null) return "text-muted-foreground";
    if (isInSafeZone) return "text-primary";
    return "text-destructive";
  };

  const Icon = getIcon();

  return (
    <div className={`glass-effect rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in ${
      isInSafeZone ? 'animate-pulse-glow' : ''
    }`}>
      <Icon className={`h-5 w-5 ${getColor()}`} />
      <span className="text-sm font-medium">
        {isInSafeZone ? `Safe - ${currentZone}` : "Outside Safe Zone"}
      </span>
    </div>
  );
};

export default SafeZoneIndicator;
