import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Share2 } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationState {
  lat: number;
  lng: number;
}

const LocationMap = () => {
  const [position, setPosition] = useState<LocationState>({ lat: 51.505, lng: -0.09 });
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize map only once
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([position.lat, position.lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker([position.lat, position.lng]).addTo(map);
    marker.bindPopup("Your current location").openPopup();

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    // Update map view when position changes
    if (mapRef.current) {
      mapRef.current.setView([position.lat, position.lng], 15);
      
      // Clear existing markers and add new one
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapRef.current?.removeLayer(layer);
        }
      });
      
      const marker = L.marker([position.lat, position.lng]).addTo(mapRef.current);
      marker.bindPopup("Your current location").openPopup();
    }
  }, [position]);

  const getCurrentLocation = () => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setIsLoading(false);
          toast.success("Location updated!");
        },
        (error) => {
          setIsLoading(false);
          toast.error("Unable to get location");
          console.error(error);
        }
      );
    } else {
      setIsLoading(false);
      toast.error("Geolocation not supported");
    }
  };

  const shareLocation = () => {
    const locationUrl = `https://www.google.com/maps?q=${position.lat},${position.lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: "My Location",
        text: "I'm sharing my current location with you for safety",
        url: locationUrl,
      }).then(() => {
        toast.success("Location shared!");
      }).catch(() => {
        copyToClipboard(locationUrl);
      });
    } else {
      copyToClipboard(locationUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Location link copied to clipboard!");
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass-effect rounded-2xl overflow-hidden shadow-[var(--shadow-card)] transform transition-all hover:scale-[1.01]">
        <div 
          ref={mapContainerRef}
          className="h-[400px] w-full relative z-0"
          style={{ background: '#e0e0e0' }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={shareLocation}
          className="bg-gradient-to-r from-primary to-secondary text-white border-0 hover:opacity-90 transition-all hover:scale-[1.02] h-14 text-base font-semibold shadow-lg"
        >
          <Share2 className="mr-2 h-5 w-5" />
          Share Location
        </Button>
        <Button
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="bg-gradient-to-r from-accent to-secondary text-white border-0 hover:opacity-90 transition-all hover:scale-[1.02] h-14 text-base font-semibold shadow-lg"
        >
          <Navigation className="mr-2 h-5 w-5" />
          {isLoading ? "Locating..." : "Update Location"}
        </Button>
      </div>

      <div className="glass-effect rounded-xl p-4 text-center dark:bg-white/5 dark:border-white/20">
        <p className="text-sm text-muted-foreground dark:text-gray-300 flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-primary dark:text-blue-400" />
          Current: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

export default LocationMap;
