import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, Brain, Loader2, MapPin, AlertTriangle } from "lucide-react";
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

interface CrimeStats {
  totalCrimes: number;
  violentCrimes: number;
  thefts: number;
  assaults: number;
  burglaries: number;
  riskLevel: number;
  recentIncidents: number;
  safetyScore: number;
}

interface SafeZoneIndicatorProps {
  status?: 'safe' | 'moderate' | 'risk' | 'unknown';
  rachAIStatus?: 'idle' | 'analyzing' | 'completed' | 'error' | 'active';
  crimeStats?: CrimeStats;
  city?: string;
  recommendations?: string[];
}

const SafeZoneIndicator = ({
  status = 'unknown',
  rachAIStatus = 'idle',
  crimeStats,
  city,
  recommendations = []
}: SafeZoneIndicatorProps) => {
  const [isInSafeZone, setIsInSafeZone] = useState<boolean | null>(null);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

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
    if (rachAIStatus === 'analyzing') return Loader2;
    if (rachAIStatus === 'error') return ShieldAlert;
    if (status === 'safe') return ShieldCheck;
    if (status === 'risk') return ShieldAlert;
    if (status === 'moderate') return Shield;
    return Brain; // Default for unknown/idle
  };

  const getColor = () => {
    if (rachAIStatus === 'analyzing') return "text-yellow-500 dark:text-yellow-400";
    if (rachAIStatus === 'error') return "text-destructive dark:text-red-400";
    if (rachAIStatus === 'active') return "text-green-500 dark:text-green-400";
    if (status === 'safe') return "text-green-500 dark:text-green-400";
    if (status === 'risk') return "text-red-500 dark:text-red-400";
    if (status === 'moderate') return "text-yellow-500 dark:text-yellow-400";
    return "text-muted-foreground dark:text-gray-300"; // Default for unknown/idle
  };

  const getStatusText = () => {
    if (rachAIStatus === 'analyzing') return "Rach-AI Analyzing...";
    if (rachAIStatus === 'error') return "Analysis Error";
    if (status === 'safe') return "Safe Zone";
    if (status === 'risk') return "High Risk Area";
    if (status === 'moderate') return "Moderate Risk";
    return "Rach-AI Active";
  };

  const getRiskPercentage = () => {
    if (crimeStats) {
      return `${(crimeStats.riskLevel * 100).toFixed(0)}%`;
    }
    return "Unknown";
  };

  const Icon = getIcon();

  return (
    <div className="relative">
      <div
        className={`glass-effect rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in cursor-pointer hover:scale-105 transition-transform ${
          status === 'safe' ? 'animate-pulse-glow' : ''
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <Icon className={`h-5 w-5 ${getColor()} ${rachAIStatus === 'analyzing' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        {city && (
          <MapPin className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        )}
        {crimeStats && (
          <span className="text-xs text-muted-foreground dark:text-gray-400">
            {getRiskPercentage()}
          </span>
        )}
      </div>

      {/* Detailed Crime Statistics Panel */}
      {showDetails && crimeStats && (
        <div className="absolute top-full mt-2 left-0 right-0 glass-effect rounded-2xl p-4 z-50 min-w-[300px] animate-fade-in dark:bg-white/5 dark:border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground dark:text-white">
              <AlertTriangle className="h-4 w-4 text-primary dark:text-blue-400" />
              Crime Analysis - {city?.toUpperCase() || 'Unknown'}
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Total Crimes:</span>
                <span className="font-medium text-foreground dark:text-white">{crimeStats.totalCrimes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Violent Crimes:</span>
                <span className="font-medium text-red-500 dark:text-red-400">{crimeStats.violentCrimes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Thefts:</span>
                <span className="font-medium text-yellow-500 dark:text-yellow-400">{crimeStats.thefts}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Assaults:</span>
                <span className="font-medium text-orange-500 dark:text-orange-400">{crimeStats.assaults}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Burglaries:</span>
                <span className="font-medium text-purple-500 dark:text-purple-400">{crimeStats.burglaries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-gray-400">Safety Score:</span>
                <span className="font-medium text-green-500 dark:text-green-400">{crimeStats.safetyScore}/100</span>
              </div>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 dark:border-white/20">
              <h5 className="text-xs font-medium mb-2 text-muted-foreground dark:text-gray-400">Safety Recommendations:</h5>
              <ul className="space-y-1">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="text-xs text-muted-foreground dark:text-gray-300">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafeZoneIndicator;