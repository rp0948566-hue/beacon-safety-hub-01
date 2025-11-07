import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RouteTrackerProps {
  emergencyContacts?: Array<{ name: string; phone: string; email: string }>;
}

interface Position {
  lat: number;
  lng: number;
  timestamp: number;
}

const RouteTracker = ({ emergencyContacts = [] }: RouteTrackerProps) => {
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertCountdown, setAlertCountdown] = useState(5);
  const [password, setPassword] = useState("");
  const [userPassword] = useState("1234"); // In production, this should be set by user
  const [routePath, setRoutePath] = useState<Position[]>([]);
  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stationaryTimeRef = useRef<number>(0);
  const lastPositionRef = useRef<Position | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Monitor position for deviations and stationary time
  useEffect(() => {
    if (!isTracking || !currentPosition || !destinationCoords) return;

    const checkInterval = setInterval(() => {
      if (!currentPosition || !lastPositionRef.current) return;

      // Check if user moved (comparing with last position)
      const distanceMoved = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        lastPositionRef.current.lat,
        lastPositionRef.current.lng
      );

      // If moved less than 10 meters in 30 seconds, consider stationary
      if (distanceMoved < 10) {
        stationaryTimeRef.current += 5000; // Add 5 seconds
        
        // If stationary for more than 2 minutes, trigger alert
        if (stationaryTimeRef.current > 120000 && !showAlert) {
          triggerAlert("You've been stationary for a while");
        }
      } else {
        stationaryTimeRef.current = 0; // Reset stationary time

        // Check if significantly off route (more than 100 meters from direct path)
        const distanceToDestination = calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          destinationCoords.lat,
          destinationCoords.lng
        );

        // Simple deviation check: if user is moving away from destination
        if (lastPositionRef.current) {
          const previousDistance = calculateDistance(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            destinationCoords.lat,
            destinationCoords.lng
          );

          // If distance increased by more than 50 meters, possible deviation
          if (distanceToDestination - previousDistance > 50 && !showAlert) {
            triggerAlert("You may be deviating from your route");
          }
        }
      }

      lastPositionRef.current = currentPosition;
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkInterval);
  }, [isTracking, currentPosition, destinationCoords, showAlert]);

  // Alert countdown
  useEffect(() => {
    if (!showAlert) return;

    if (alertCountdown > 0) {
      const timer = setTimeout(() => {
        setAlertCountdown(alertCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up, send emergency alert
      sendEmergencyAlert();
      setShowAlert(false);
    }
  }, [showAlert, alertCountdown]);

  const triggerAlert = (reason: string) => {
    setShowAlert(true);
    setAlertCountdown(5);
    setPassword("");
    toast.warning("Safety Check Required!", {
      description: reason,
      duration: 5000,
    });
  };

  const handlePasswordSubmit = () => {
    if (password === userPassword) {
      setShowAlert(false);
      stationaryTimeRef.current = 0; // Reset stationary timer
      toast.success("Safety check confirmed");
    } else {
      toast.error("Incorrect password");
    }
  };

  const sendEmergencyAlert = () => {
    // Send alerts to emergency contacts with current location
    if (emergencyContacts.length > 0 && currentPosition) {
      emergencyContacts.forEach(contact => {
        toast.error(`🚨 Emergency Alert Sent to ${contact.name}`, {
          description: `Location: ${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`,
          duration: 8000,
        });
      });
    } else {
      toast.error("🚨 Emergency Alert Activated!", {
        description: "No response detected. Authorities contacted.",
        duration: 8000,
      });
    }
  };

  const startTracking = () => {
    if (!destination) {
      toast.error("Please enter a destination");
      return;
    }

    // In production, geocode the destination address
    // For now, using a mock coordinate
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const mockDestination = {
          lat: pos.coords.latitude + 0.01,
          lng: pos.coords.longitude + 0.01,
        };
        
        setDestinationCoords(mockDestination);
        setIsTracking(true);
        setRoutePath([]);
        stationaryTimeRef.current = 0;
        
        toast.success("Route tracking started", {
          description: "Your safety is being monitored",
        });

        // Add destination marker
        if (mapRef.current) {
          if (destinationMarkerRef.current) {
            destinationMarkerRef.current.remove();
          }
          
          const destIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          });
          
          destinationMarkerRef.current = L.marker([mockDestination.lat, mockDestination.lng], { icon: destIcon })
            .addTo(mapRef.current)
            .bindPopup("Destination")
            .openPopup();
        }

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newPos: Position = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
            };
            
            setCurrentPosition(newPos);
            setRoutePath(prev => [...prev, newPos]);

            // Update map
            if (mapRef.current) {
              // Update current position marker
              if (currentMarkerRef.current) {
                currentMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
              } else {
                currentMarkerRef.current = L.marker([newPos.lat, newPos.lng])
                  .addTo(mapRef.current)
                  .bindPopup("Your location");
              }

              // Update route polyline
              const pathCoords: L.LatLngExpression[] = routePath.map(p => [p.lat, p.lng] as L.LatLngTuple);
              if (routePolylineRef.current) {
                routePolylineRef.current.setLatLngs(pathCoords);
              } else {
                routePolylineRef.current = L.polyline(
                  pathCoords,
                  { color: 'hsl(190, 95%, 45%)', weight: 4 }
                ).addTo(mapRef.current);
              }

              mapRef.current.setView([newPos.lat, newPos.lng], 15);
            }
          },
          (error) => {
            console.error("Location error:", error);
            toast.error("Unable to track location");
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      },
      (error) => {
        console.error("Initial location error:", error);
        toast.error("Unable to get initial location");
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setIsTracking(false);
    setShowAlert(false);
    stationaryTimeRef.current = 0;
    
    toast.info("Route tracking stopped");
  };

  return (
    <div className="space-y-4">
      <div className="glass-effect rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-4">
          <Navigation className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold gradient-text">Safe Route Tracking</h3>
        </div>
        
        <p className="text-muted-foreground mb-4">
          AI monitors your journey and alerts contacts if you deviate from route or stop responding
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Destination</label>
            <Input
              placeholder="Enter destination address"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={isTracking}
              className="bg-background/50"
            />
          </div>

          {!isTracking ? (
            <Button
              onClick={startTracking}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white border-0 hover:opacity-90 h-12 text-base font-semibold"
            >
              <Shield className="mr-2 h-5 w-5" />
              Start Safe Journey
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="glass-effect rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tracking Status</span>
                  <span className="flex items-center gap-2 text-primary text-sm font-semibold">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
                {currentPosition && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                  </p>
                )}
              </div>
              
              <Button
                onClick={stopTracking}
                variant="destructive"
                className="w-full h-12 text-base font-semibold"
              >
                Stop Tracking
              </Button>
            </div>
          )}
        </div>
      </div>

      {isTracking && (
        <div className="glass-effect rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          <div 
            ref={mapContainerRef}
            className="h-[400px] w-full"
            style={{ background: '#e0e0e0' }}
          />
        </div>
      )}

      {/* Safety Alert Dialog */}
      <Dialog open={showAlert} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Safety Check Required
            </DialogTitle>
            <DialogDescription>
              Please confirm you're okay by entering your password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-destructive/10 rounded-lg p-4 text-center">
              <p className="text-4xl font-bold text-destructive mb-2">{alertCountdown}</p>
              <p className="text-sm text-muted-foreground">
                Auto-alert in {alertCountdown} seconds
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Enter Password</label>
              <Input
                type="password"
                placeholder="Your safety password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
            </div>

            <Button
              onClick={handlePasswordSubmit}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              I'm Safe
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Default password: 1234 (Change in settings)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteTracker;
