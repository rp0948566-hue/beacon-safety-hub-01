import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SafeZoneIndicatorProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
}

interface SafetyData {
  safetyLevel: 'safe' | 'moderate' | 'unsafe';
  safetyScore: number;
  riskFactors: string[];
  safetyTips: string[];
  lastUpdated: string;
  summary: string;
}

const SafeZoneIndicator = ({ onLocationUpdate }: SafeZoneIndicatorProps) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Getting location...");
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze area safety using AI
  const analyzeAreaSafety = async (lat: number, lng: number, addr: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('🔍 Analyzing area safety with AI...');
      
      const { data, error: functionError } = await supabase.functions.invoke('check-area-safety', {
        body: { latitude: lat, longitude: lng, address: addr }
      });

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const safety = data.safety as SafetyData;
      setSafetyData(safety);

      // Alert user based on safety level
      if (safety.safetyLevel === 'unsafe') {
        toast.error("⚠️ Unsafe Area Detected", {
          description: safety.summary,
          duration: 8000,
        });
      } else if (safety.safetyLevel === 'moderate') {
        toast.warning("⚡ Moderate Risk Area", {
          description: safety.summary,
          duration: 6000,
        });
      } else {
        toast.success("✅ Safe Area", {
          description: safety.summary,
          duration: 4000,
        });
      }

      console.log('✅ Safety analysis complete:', safety.safetyLevel);

    } catch (error) {
      console.error('Failed to analyze area safety:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze area safety';
      setError(errorMessage);
      
      if (errorMessage.includes('Rate limit')) {
        toast.error("Too many requests", {
          description: "Please wait a moment before checking again",
        });
      } else if (errorMessage.includes('payment') || errorMessage.includes('credits')) {
        toast.error("AI service unavailable", {
          description: "Please contact support",
        });
      } else {
        toast.error("Analysis failed", {
          description: "Unable to check area safety. Please try again.",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        onLocationUpdate?.(latitude, longitude);

        // Get address from coordinates
        let addr = "Unknown location";
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          addr = data.display_name || "Unknown location";
          setAddress(addr);
        } catch (error) {
          console.error("Failed to get address:", error);
          setAddress("Address unavailable");
        }

        // Analyze area safety with AI
        await analyzeAreaSafety(latitude, longitude, addr);
      },
      (error) => {
        console.error("Location error:", error);
        toast.error("Failed to get location", {
          description: "Please enable location permissions",
        });
      }
    );
  }, []);

  const getStatusColor = () => {
    if (isAnalyzing) return "text-muted-foreground";
    if (!safetyData) return "text-muted-foreground";
    
    switch (safetyData.safetyLevel) {
      case 'safe': return "text-green-500";
      case 'moderate': return "text-yellow-500";
      case 'unsafe': return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    if (isAnalyzing) return Loader2;
    if (error) return AlertTriangle;
    if (!safetyData) return Shield;
    
    switch (safetyData.safetyLevel) {
      case 'safe': return ShieldCheck;
      case 'moderate': return Shield;
      case 'unsafe': return ShieldAlert;
      default: return Shield;
    }
  };

  const getStatusText = () => {
    if (isAnalyzing) return "Analyzing area...";
    if (error) return "Analysis failed";
    if (!safetyData) return "Checking location...";
    
    switch (safetyData.safetyLevel) {
      case 'safe': return "Safe Area";
      case 'moderate': return "Moderate Risk";
      case 'unsafe': return "Unsafe Area";
      default: return "Unknown";
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="glass-effect rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <StatusIcon className={`h-8 w-8 ${getStatusColor()} ${isAnalyzing ? 'animate-spin' : ''}`} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{getStatusText()}</h3>
          <p className="text-sm text-muted-foreground">
            {isAnalyzing ? "AI-powered safety analysis" : "Real-time safety monitoring"}
          </p>
        </div>
      </div>

      {currentLocation && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-muted-foreground">{address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>

          {safetyData && !isAnalyzing && (
            <div className="space-y-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Safety Score</span>
                <span className="text-lg font-bold">{safetyData.safetyScore}/100</span>
              </div>

              {safetyData.riskFactors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Risk Factors:</p>
                  <ul className="text-xs space-y-1">
                    {safetyData.riskFactors.slice(0, 3).map((factor, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-1">
                        <span className="text-red-500">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {safetyData.safetyTips.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Safety Tips:</p>
                  <ul className="text-xs space-y-1">
                    {safetyData.safetyTips.slice(0, 3).map((tip, idx) => (
                      <li key={idx} className="text-muted-foreground flex items-start gap-1">
                        <span className="text-green-500">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                Last updated: {safetyData.lastUpdated}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafeZoneIndicator;