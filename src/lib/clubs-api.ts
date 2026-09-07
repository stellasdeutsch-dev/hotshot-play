import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Club, ClubStatus } from "./mock-db";
import { DEMO_CLUBS } from "./demo-clubs";
import { demoEnabled } from "./demo-data";

type ClubUpdate = Database["public"]["Tables"]["clubs"]["Update"];

type Row = {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  rating: number;
  reviews_count: number;
  open_from: string;
  open_to: string;
  price_per_hour: number;
  total_seats: number;
  vip_seats?: number | null;
  vip_price_per_hour?: number | null;
  specs: string;
  description: string;
  cover: string;
  owner_id: string | null;
  status: string;
  rejection_reason: string | null;
  applied_at: string;
};

export const rowToClub = (r: Row): Club => ({
  id: r.id,
  name: r.name,
  city: r.city,
  address: r.address,
  phone: r.phone,
  lat: Number(r.lat),
  lng: Number(r.lng),
  rating: Number(r.rating),
  reviewsCount: r.reviews_count,
  openFrom: r.open_from,
  openTo: r.open_to,
  pricePerHour: r.price_per_hour,
  totalSeats: r.total_seats,
  vipSeats: r.vip_seats ?? 0,
  vipPricePerHour: r.vip_price_per_hour ?? 0,
  specs: r.specs,
  description: r.description,
  cover: r.cover,
  ownerId: r.owner_id ?? "",
  status: r.status as ClubStatus,
  appliedAt: r.applied_at?.slice(0, 10),
  ...(r.rejection_reason ? { rejectionReason: r.rejection_reason } : {}),
});

export async function fetchClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchClubs", error);
    return demoEnabled() ? DEMO_CLUBS : [];
  }
  const clubs = ((data ?? []) as unknown as Row[]).map(rowToClub);
  // An empty database renders demo clubs so the UI can be reviewed (dev, or VITE_DEMO_CLUBS=1 showcase builds).
  if (clubs.length === 0 && demoEnabled()) return DEMO_CLUBS;
  return clubs;
}

export const clubPatchToRow = (patch: Partial<Club>): ClubUpdate => {
  const row: ClubUpdate = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.openFrom !== undefined) row.open_from = patch.openFrom;
  if (patch.openTo !== undefined) row.open_to = patch.openTo;
  if (patch.pricePerHour !== undefined) row.price_per_hour = patch.pricePerHour;
  if (patch.totalSeats !== undefined) row.total_seats = patch.totalSeats;
  if (patch.vipSeats !== undefined) row.vip_seats = patch.vipSeats;
  if (patch.vipPricePerHour !== undefined) row.vip_price_per_hour = patch.vipPricePerHour;
  if (patch.specs !== undefined) row.specs = patch.specs;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.cover !== undefined) row.cover = patch.cover;
  if (patch.rating !== undefined) row.rating = patch.rating;
  if (patch.reviewsCount !== undefined) row.reviews_count = patch.reviewsCount;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.rejectionReason !== undefined) row.rejection_reason = patch.rejectionReason;
  return row;
};
