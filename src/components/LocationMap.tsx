import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Share2 } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default markers in React Leaflet
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

const LocationUpdater = ({ position }: { position: LocationState }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], 15);
  }, [position, map]);
  return null;
};

const LocationMap = () => {
  const [position, setPosition] = useState<LocationState>({ lat: 51.505, lng: -0.09 });
  const [isLoading, setIsLoading] = useState(false);

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
        <div className="h-[400px] w-full relative">
          <MapContainer
            center={[position.lat, position.lng]}
            zoom={15}
            scrollWheelZoom={false}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[position.lat, position.lng]}>
              <Popup>Your current location</Popup>
            </Marker>
            <LocationUpdater position={position} />
          </MapContainer>
        </div>
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

      <div className="glass-effect rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4" />
          Current: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

export default LocationMap;
