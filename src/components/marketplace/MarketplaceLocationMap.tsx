import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { MapPin } from "lucide-react";

type MarketplaceLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
};

function SyncLocation({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      map.setView([latitude, longitude], 16, { animate: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [latitude, longitude, map]);
  return null;
}

export function MarketplaceLocationMap({
  latitude,
  longitude,
  title,
  address,
}: MarketplaceLocationMapProps) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <div className="marketplace-location-map marketplace-location-map--empty">
        <MapPin aria-hidden="true" /> Localização indisponível
      </div>
    );
  }

  return (
    <div className="marketplace-location-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom
        className="marketplace-location-map__canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SyncLocation latitude={latitude} longitude={longitude} />
        <CircleMarker
          center={[latitude, longitude]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#3267f6",
            fillOpacity: 1,
            weight: 4,
          }}
        >
          <Popup>
            <strong>{title}</strong>
            <br />
            {address}
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
