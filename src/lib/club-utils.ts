import type { Booking, Club } from "./mock-db";

export const is247 = (club: Pick<Club, "openFrom" | "openTo">) =>
  club.openFrom === "00:00" && (club.openTo === "24:00" || club.openTo === "00:00");

export function isOpenNow(club: Pick<Club, "openFrom" | "openTo">, now = new Date()) {
  if (is247(club)) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [fh = 0, fm = 0] = club.openFrom.split(":").map(Number);
  const [th = 0, tm = 0] = club.openTo.split(":").map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  return to > from ? cur >= from && cur < to : cur >= from || cur < to;
}

export const hoursLabel = (club: Pick<Club, "openFrom" | "openTo">, open247: string) =>
  is247(club) ? open247 : `${club.openFrom}–${club.openTo}`;

export const isImageCover = (cover: string) =>
  /^(https?:)?\/\//.test(cover) || cover.startsWith("data:");

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`;

/** Booking start/end as local Date objects. */
export function bookingWindow(b: Pick<Booking, "date" | "startTime" | "hours">) {
  const [y = 0, m = 1, d = 1] = b.date.split("-").map(Number);
  const [hh = 0, mm = 0] = b.startTime.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm, 0, 0);
  const end = new Date(start.getTime() + b.hours * 3_600_000);
  return { start, end };
}

export type SessionPhase = "upcoming" | "live" | "past";

export function sessionPhase(
  b: Pick<Booking, "date" | "startTime" | "hours">,
  now = new Date(),
): SessionPhase {
  const { start, end } = bookingWindow(b);
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "past";
}

/** mm:ss or h:mm:ss for a duration in ms. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Picks the booking the player cares about right now: live first, then the next upcoming. */
export function pickCurrentBooking(bookings: Booking[], now = new Date()): Booking | undefined {
  const relevant = bookings.filter((b) => b.status === "active" || b.status === "upcoming");
  const live = relevant.find((b) => sessionPhase(b, now) === "live");
  if (live) return live;
  return relevant
    .filter((b) => sessionPhase(b, now) === "upcoming")
    .sort((a, b) => bookingWindow(a).start.getTime() - bookingWindow(b).start.getTime())[0];
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "—";
