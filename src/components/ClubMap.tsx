import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Club } from "@/lib/mock-db";
import { isOpenNow } from "@/lib/club-utils";

/**
 * Interactive Leaflet map with price-pill markers.
 * Client-only: rendered behind a mounted-guard + React.lazy in the route.
 */
export default function ClubMap({
  clubs,
  selectedId,
  onSelect,
  userPos,
}: {
  clubs: Club[];
  selectedId: string | null;
  onSelect: (clubId: string) => void;
  userPos?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [51.128, 71.43],
      zoom: 12,
      scrollWheelZoom: false,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    // OSM tiles (no API key); the dark look comes from a CSS filter on the tile pane.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      className: "hs-tiles",
    }).addTo(map);
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const makeIcon = (club: Club, selected: boolean) =>
      L.divIcon({
        className: "hs-marker",
        html: `<div class="hs-pin${selected ? " hs-pin--active" : ""}${isOpenNow(club) ? "" : " hs-pin--closed"}"><span class="hs-pin-dot"></span>${club.pricePerHour.toLocaleString("ru-RU")} ₸</div>`,
      });

    markersRef.current.forEach((marker, id) => {
      if (!clubs.some((c) => c.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    clubs.forEach((club) => {
      const icon = makeIcon(club, club.id === selectedId);
      const existing = markersRef.current.get(club.id);
      if (existing) {
        existing.setIcon(icon);
        existing.setZIndexOffset(club.id === selectedId ? 1000 : 0);
      } else {
        const marker = L.marker([club.lat, club.lng], { icon }).addTo(map);
        marker.on("click", () => onSelectRef.current(club.id));
        markersRef.current.set(club.id, marker);
      }
    });
  }, [clubs, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPos) {
      userRef.current?.remove();
      userRef.current = null;
      return;
    }
    const icon = L.divIcon({
      className: "hs-marker",
      html: '<div style="width:16px;height:16px;border-radius:999px;background:#2A98E5;border:3px solid #fff;box-shadow:0 0 0 6px rgb(42 152 229 / .25);transform:translate(-50%,-50%)"></div>',
    });
    if (userRef.current) userRef.current.setLatLng([userPos.lat, userPos.lng]);
    else
      userRef.current = L.marker([userPos.lat, userPos.lng], { icon, interactive: false }).addTo(
        map,
      );
  }, [userPos]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const club = clubs.find((c) => c.id === selectedId);
    if (club) mapRef.current.flyTo([club.lat, club.lng], 14, { duration: 0.6 });
  }, [selectedId, clubs]);

  return <div ref={containerRef} className="h-full w-full" tabIndex={0} />;
}
