"use client";


import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import L from "leaflet";
import { markerToneClasses } from "@/lib/utils";
import type { CrisisMapPoint } from "./CrisisMap";
import type { Tone } from "@/types";

const iconHtml = (tone: Tone, label: string) => `
  <div class="flex flex-col items-center gap-2">
    <span class="inline-flex h-4 w-4 rounded-full border-2 border-white shadow-[0_10px_20px_rgba(0,0,0,0.22)] ${markerToneClasses[tone]}"></span>
    <div class="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-[0_12px_24px_rgba(0,0,0,0.22)] ${markerToneClasses[tone]} bg-white">
      ${label}
    </div>
  </div>
`;

interface LeafletMapProps {
  apiKey: string;
  points: CrisisMapPoint[];
  /** When provided, clicking a marker fires this callback with the point ID */
  onMarkerClick?: (pointId: string) => void;
}

export default function LeafletMap({ apiKey, points, onMarkerClick }: LeafletMapProps) {
  const validPoints = points.filter(p => p.location.lat !== 0 || p.location.lng !== 0);
  const center: [number, number] = validPoints.length > 0 
    ? [validPoints[0].location.lat, validPoints[0].location.lng]
    : [20.5937, 78.9629];

  return (
    <div className="relative mt-4 h-80 overflow-hidden rounded-[24px] border border-white/10" style={{ zIndex: 0 }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://locationiq.com/?ref=maps">LocationIQ</a>'
          url={`https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`}
        />
        {validPoints.map(point => {
          const icon = L.divIcon({
            html: iconHtml(point.tone, point.label),
            className: "custom-leaflet-icon bg-transparent border-none",
            iconSize: [120, 40],
            iconAnchor: [60, 20],
          });

          const eventHandlers = onMarkerClick
            ? { click: () => onMarkerClick(point.id) }
            : undefined;

          return (
            <Marker
              key={point.id}
              position={[point.location.lat, point.location.lng]}
              icon={icon}
              eventHandlers={eventHandlers}
            >
              {point.detail && (
                <Popup>
                  <div className="text-sm font-semibold text-gray-900">{point.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{point.detail}</div>
                  {onMarkerClick ? (
                    <div className="mt-2 text-[10px] font-medium text-blue-600">Click pin to view impact →</div>
                  ) : null}
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
