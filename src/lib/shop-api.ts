import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { DEMO_PRODUCTS, isDemoClub, localId, readLocal, writeLocal } from "./demo-data";
import { isDemoUserId } from "./demo-user";
import {
  makeOrderCode,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
  type ProductCategory,
} from "./mock-db";

type ProductRow = Database["public"]["Tables"]["club_products"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  clubId: r.club_id,
  category: r.category as ProductCategory,
  name: r.name,
  description: r.description,
  sizeLabel: r.size_label,
  priceKzt: r.price_kzt,
  oldPriceKzt: r.old_price_kzt,
  imageUrl: r.image_url,
  isActive: r.is_active,
  sortOrder: r.sort_order,
});

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  code: r.code,
  userId: r.user_id,
  clubId: r.club_id,
  bookingId: r.booking_id,
  seat: r.seat,
  playerName: r.player_name,
  items: (Array.isArray(r.items) ? r.items : []) as unknown as OrderItem[],
  totalKzt: r.total_kzt,
  comment: r.comment,
  status: r.status as OrderStatus,
  createdAt: r.created_at,
});

const LOCAL_ORDERS = "hsp-demo-orders";
const isLocalId = (id: string) => id.startsWith("local-");
const localOrders = () => readLocal<Order[]>(LOCAL_ORDERS, []);

/** Active catalogue of a club (owners/staff also receive inactive rows via RLS). */
export async function fetchProducts(clubId: string): Promise<Product[]> {
  if (isDemoClub(clubId)) return DEMO_PRODUCTS.map((p) => ({ ...p, clubId }));
  const { data, error } = await supabase
    .from("club_products")
    .select("*")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("fetchProducts", error);
    return [];
  }
  return (data ?? []).map(toProduct);
}

export async function upsertProduct(
  input: Omit<Product, "id"> & { id?: string },
): Promise<Product | null> {
  const row: Database["public"]["Tables"]["club_products"]["Insert"] = {
    club_id: input.clubId,
    category: input.category,
    name: input.name,
    description: input.description,
    size_label: input.sizeLabel,
    price_kzt: input.priceKzt,
    old_price_kzt: input.oldPriceKzt,
    image_url: input.imageUrl,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    ...(input.id ? { id: input.id } : {}),
  };
  const { data, error } = await supabase.from("club_products").upsert(row).select("*").single();
  if (error || !data) {
    console.error("upsertProduct", error);
    return null;
  }
  return toProduct(data);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from("club_products").delete().eq("id", id);
  if (error) console.error("deleteProduct", error);
  return !error;
}

export interface CreateOrderInput {
  userId: string;
  clubId: string;
  bookingId: string | null;
  seat: number | null;
  playerName: string;
  items: OrderItem[];
  comment: string;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const total = input.items.reduce((s, i) => s + i.priceKzt * i.qty, 0);
  if (input.items.length === 0) return { ok: false, error: "empty" };

  if (isDemoClub(input.clubId) || isDemoUserId(input.userId)) {
    const order: Order = {
      id: localId(),
      code: makeOrderCode(),
      userId: input.userId,
      clubId: input.clubId,
      bookingId: input.bookingId,
      seat: input.seat,
      playerName: input.playerName,
      items: input.items,
      totalKzt: total,
      comment: input.comment,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    writeLocal(LOCAL_ORDERS, [order, ...localOrders()]);
    return { ok: true, order };
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      code: makeOrderCode(),
      user_id: input.userId,
      club_id: input.clubId,
      booking_id: input.bookingId,
      seat: input.seat,
      player_name: input.playerName,
      items: input.items as unknown as Json,
      total_kzt: total,
      comment: input.comment,
      status: "pending",
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("createOrder", error);
    return { ok: false, error: "failed" };
  }
  return { ok: true, order: toOrder(data) };
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const local = localOrders().filter((o) => o.userId === userId);
  if (isDemoUserId(userId)) return local;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchMyOrders", error);
    return local;
  }
  return [...local, ...(data ?? []).map(toOrder)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function fetchClubOrders(clubId: string): Promise<Order[]> {
  if (isDemoClub(clubId)) return localOrders().filter((o) => o.clubId === clubId);
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchClubOrders", error);
    return [];
  }
  return (data ?? []).map(toOrder);
}

export async function updateOrderStatus(order: Order, status: OrderStatus): Promise<boolean> {
  if (isDemoClub(order.clubId) || isLocalId(order.id)) {
    writeLocal(
      LOCAL_ORDERS,
      localOrders().map((o) => (o.id === order.id ? { ...o, status } : o)),
    );
    return true;
  }
  const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
  if (error) console.error("updateOrderStatus", error);
  return !error;
}
