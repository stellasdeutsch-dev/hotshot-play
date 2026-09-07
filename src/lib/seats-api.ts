import { supabase } from "@/integrations/supabase/client";
import { isDemoClub } from "./demo-data";
import type { Club, Zone } from "./mock-db";

/** Seat numbers of a zone: VIP seats are the last `vipSeats` numbers of the club. */
export function zoneSeats(club: Pick<Club, "totalSeats" | "vipSeats">, zone: Zone): number[] {
  const vip = Math.min(club.vipSeats, club.totalSeats);
  const standard = club.totalSeats - vip;
  return zone === "vip"
    ? Array.from({ length: vip }, (_, i) => standard + i + 1)
    : Array.from({ length: standard }, (_, i) => i + 1);
}

export const zonePrice = (club: Pick<Club, "pricePerHour" | "vipPricePerHour">, zone: Zone) =>
  zone === "vip" && club.vipPricePerHour > 0 ? club.vipPricePerHour : club.pricePerHour;

/** Deterministic pseudo-random occupancy so the demo looks alive but stable. */
function demoOccupied(clubId: string, date: string, start: string, total: number): number[] {
  let h = 0;
  for (const ch of `${clubId}|${date}|${start}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  for (let seat = 1; seat <= total; seat++) {
    h = (h * 1103515245 + 12345) >>> 0;
    if ((h >>> 16) % 100 < 35) out.push(seat);
  }
  return out;
}

/** Seats already booked for the given slot. Unknown (RPC missing) → treated as all free. */
export async function fetchOccupiedSeats(
  club: Pick<Club, "id" | "totalSeats">,
  date: string,
  start: string,
  hours: number,
): Promise<number[]> {
  if (isDemoClub(club.id)) return demoOccupied(club.id, date, start, club.totalSeats);
  const { data, error } = await supabase.rpc("occupied_seats", {
    _club_id: club.id,
    _date: date,
    _start: start,
    _hours: hours,
  });
  if (error) {
    console.error("occupied_seats", error);
    return [];
  }
  return data ?? [];
}
