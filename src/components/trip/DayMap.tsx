"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  approximate: boolean;
}

const SIGNAL = "#f4c430";

function numberIcon(n: number, approximate: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#0d1b2a;color:${SIGNAL};font:700 14px var(--font-barlow-condensed),sans-serif;border:2px ${approximate ? "dashed" : "solid"} ${SIGNAL};box-shadow:0 2px 6px rgb(0 0 0/.5)">${n}</span>`,
  });
}

function FitBounds({ stops }: { stops: MapStop[] }) {
  const map = useMap();
  useEffect(() => {
    if (!stops.length) return;
    // The container may still be settling into its layout: measure first, then fit.
    const fit = () => {
      // No animation: the map is remounted on day change, and an animation finishing
      // after unmount throws inside Leaflet ("_leaflet_pos" of undefined).
      map.invalidateSize({ animate: false });
      map.fitBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lng])), { paddingTopLeft: [64, 56], paddingBottomRight: [36, 36], maxZoom: 15, animate: false });
    };
    fit();
    const t = window.setTimeout(fit, 250);
    return () => window.clearTimeout(t);
  }, [map, stops]);
  return null;
}

/** The active day's stops in visiting order; the route line uses the one colour reserved for it. */
export default function DayMap({ stops }: { stops: MapStop[] }) {
  const centre: [number, number] = stops.length ? [stops[0].lat, stops[0].lng] : [42.5, 12.5];
  return (
    <MapContainer center={centre} zoom={13} scrollWheelZoom={false} className="size-full" attributionControl>
      {/* Standard OSM tiles (no key), darkened in CSS (.map-tiles) to sit in the night palette. */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="map-tiles"
        maxZoom={19}
      />
      <Polyline positions={stops.map((s) => [s.lat, s.lng])} pathOptions={{ color: SIGNAL, weight: 3, opacity: 0.9 }} />
      {stops.map((s, i) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={numberIcon(i + 1, s.approximate)}>
          <Tooltip direction="top" offset={[0, -12]}>
            {s.name}
            {s.approximate ? " (approximate location)" : ""}
          </Tooltip>
        </Marker>
      ))}
      <FitBounds stops={stops} />
    </MapContainer>
  );
}
