import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { clubPatchToRow, fetchClubs } from "./clubs-api";
import { supabase } from "@/integrations/supabase/client";
import { submitKaspiPayment } from "./payments.functions";
import { demoEnabled } from "./demo-data";
import { isDemoUserId } from "./demo-user";
import {
  addDemoBooking,
  addDemoReview,
  grantDemoSubscription,
  isLocalId,
  patchDemoBooking,
  readDemoBookings,
  readDemoPayments,
  readDemoReviews,
  readDemoSubs,
  spendDemoHours,
  isDemoFlow,
} from "./demo-session";
import {
  SUBSCRIPTION_PLANS,
  makeBookingCode,
  todayStr,
  type Booking,
  type Club,
  type ClubStatus,
  type Payment,
  type PaymentMethod,
  type Review,
  type UserSubscription,
  type Zone,
} from "./mock-db";

export type BookError = "noSub" | "notEnoughHours" | "dailyCap" | "failed";

interface Store {
  clubs: Club[];
  bookings: Booking[];
  subscriptions: UserSubscription[];
  reviews: Review[];
  payments: Payment[];
  loading: boolean;
  activeSubFor: (userId: string) => UserSubscription | undefined;
  usedHoursOn: (userId: string, date: string) => number;
  submitKaspiReceipt: (
    planId: string,
    receiptNumber: string,
  ) => Promise<{ ok: boolean; error?: string; demo?: boolean }>;
  latestPaymentFor: (userId: string) => Payment | undefined;
  bookSlot: (input: {
    clubId: string;
    date: string;
    startTime: string;
    hours: number;
    zone?: Zone;
    seat?: number | null;
  }) => Promise<{ ok: true; booking: Booking } | { ok: false; error: BookError }>;
  cancelBooking: (bookingId: string) => Promise<void>;
  /** Adds hours to an existing booking, respecting the pass balance and daily cap. */
  extendBooking: (
    bookingId: string,
    extraHours: number,
  ) => Promise<{ ok: boolean; error?: BookError }>;
  checkInBooking: (bookingId: string) => Promise<void>;
  completeBooking: (bookingId: string) => Promise<void>;
  addReview: (clubId: string, rating: number, text: string) => Promise<void>;
  setClubStatus: (clubId: string, status: ClubStatus) => Promise<void>;
  rejectClub: (clubId: string, reason: string) => Promise<void>;
  reloadClubs: () => Promise<void>;
  reloadData: () => Promise<void>;
  removeClub: (clubId: string) => Promise<void>;
  updateClub: (clubId: string, patch: Partial<Club>) => Promise<void>;
  findBookingByCode: (code: string) => Booking | undefined;
}

const StoreCtx = createContext<Store | null>(null);

type BookingRow = {
  id: string;
  code: string;
  user_id: string;
  club_id: string;
  player_name: string;
  player_phone: string;
  booking_date: string;
  start_time: string;
  hours: number;
  status: string;
  zone?: string | null;
  seat?: number | null;
};

type ReviewRow = {
  id: string;
  club_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
};

type SubRow = {
  id: string;
  user_id: string;
  plan_id: string;
  hours_total: number | null;
  hours_left: number | null;
  started_at: string;
  valid_until: string;
  status: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  kind: string;
  label: string;
  amount_kzt: number;
  method: string;
  status: string;
  created_at: string;
  plan_id?: string | null;
  receipt_number?: string | null;
  rejection_reason?: string | null;
};

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  code: r.code,
  userId: r.user_id,
  clubId: r.club_id,
  playerName: r.player_name,
  playerPhone: r.player_phone,
  date: r.booking_date,
  startTime: r.start_time,
  hours: r.hours,
  status: r.status as Booking["status"],
  zone: r.zone === "vip" ? "vip" : "standard",
  seat: r.seat ?? null,
});

const toReview = (r: ReviewRow): Review => ({
  id: r.id,
  clubId: r.club_id,
  userId: r.user_id,
  authorName: r.author_name,
  rating: r.rating,
  text: r.text,
  createdAt: r.created_at.slice(0, 16).replace("T", " "),
});

const toSub = (r: SubRow): UserSubscription => ({
  id: r.id,
  userId: r.user_id,
  planId: r.plan_id,
  hoursTotal: r.hours_total,
  hoursLeft: r.hours_left,
  startedAt: r.started_at,
  validUntil: r.valid_until,
  status: r.status as UserSubscription["status"],
});

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  userId: r.user_id,
  kind: "subscription",
  label: r.label,
  amountKzt: r.amount_kzt,
  method: r.method as PaymentMethod,
  createdAt: r.created_at.slice(0, 16).replace("T", " "),
  status: r.status as Payment["status"],
  planId: r.plan_id ?? null,
  receiptNumber: r.receipt_number ?? null,
  rejectionReason: r.rejection_reason ?? null,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClubs = useCallback(async () => {
    setClubs(await fetchClubs());
  }, []);

  const authed = !!authUser;

  const loadData = useCallback(async () => {
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    setReviews([
      ...(demoEnabled() ? readDemoReviews() : []),
      ...((reviewRows ?? []) as unknown as ReviewRow[]).map(toReview),
    ]);

    const localBookings = demoEnabled() ? readDemoBookings() : [];
    const localSubs = demoEnabled() ? readDemoSubs() : [];
    const localPayments = demoEnabled() ? readDemoPayments() : [];

    if (!authed) {
      // Demo identities have no Supabase session — their rows live locally.
      setBookings(localBookings);
      setSubscriptions(localSubs);
      setPayments(localPayments);
      setLoading(false);
      return;
    }

    const [{ data: bookingRows }, { data: subRows }, { data: paymentRows }] = await Promise.all([
      supabase.from("bookings").select("*").order("booking_date", { ascending: false }),
      supabase.from("player_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);
    setBookings([
      ...localBookings,
      ...((bookingRows ?? []) as unknown as BookingRow[]).map(toBooking),
    ]);
    setSubscriptions([...localSubs, ...((subRows ?? []) as unknown as SubRow[]).map(toSub)]);
    setPayments([
      ...localPayments,
      ...((paymentRows ?? []) as unknown as PaymentRow[]).map(toPayment),
    ]);
    setLoading(false);
  }, [authed]);

  useEffect(() => {
    void loadClubs();
    void loadData();
  }, [loadClubs, loadData, authUser?.id]);

  const value = useMemo<Store>(() => {
    const activeSubFor = (userId: string) =>
      subscriptions.find(
        (s) => s.userId === userId && s.status === "active" && s.validUntil >= todayStr(),
      );

    const usedHoursOn = (userId: string, date: string) =>
      bookings
        .filter(
          (b) =>
            b.userId === userId &&
            b.date === date &&
            (b.status === "upcoming" || b.status === "active"),
        )
        .reduce((sum, b) => sum + b.hours, 0);

    return {
      clubs,
      bookings,
      subscriptions,
      reviews,
      payments,
      loading,
      activeSubFor,
      usedHoursOn,
      submitKaspiReceipt: async (planId: string, receiptNumber: string) => {
        if (!authUser) return { ok: false, error: "auth" };
        if (isDemoUserId(authUser.id)) {
          grantDemoSubscription(authUser.id, planId);
          await loadData();
          return { ok: true, demo: true };
        }
        try {
          const res = await submitKaspiPayment({ data: { planId, receiptNumber } });
          if (res.ok) await loadData();
          return res;
        } catch (err) {
          // Static showcase builds have no server functions — grant the pass locally.
          if (!demoEnabled()) throw err;
          console.warn("submitKaspiPayment unavailable, using the demo pass", err);
          grantDemoSubscription(authUser.id, planId);
          await loadData();
          return { ok: true, demo: true };
        }
      },
      latestPaymentFor: (userId: string) => payments.find((p) => p.userId === userId),
      bookSlot: async (input) => {
        if (!authUser) return { ok: false as const, error: "noSub" as const };
        const sub = activeSubFor(authUser.id);
        if (!sub) return { ok: false as const, error: "noSub" as const };
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
        const cap = plan?.dailyCap ?? 5;
        if (sub.hoursLeft !== null && input.hours > sub.hoursLeft) {
          return { ok: false as const, error: "notEnoughHours" as const };
        }
        if (usedHoursOn(authUser.id, input.date) + input.hours > cap) {
          return { ok: false as const, error: "dailyCap" as const };
        }

        if (isDemoFlow(input.clubId) || isDemoUserId(authUser.id)) {
          const booking: Booking = {
            id: `local-${Date.now().toString(36)}`,
            code: makeBookingCode(),
            userId: authUser.id,
            clubId: input.clubId,
            playerName: authUser.name,
            playerPhone: authUser.phone,
            date: input.date,
            startTime: input.startTime,
            hours: input.hours,
            status: "upcoming",
            zone: input.zone ?? "standard",
            seat: input.seat ?? null,
          };
          addDemoBooking(booking);
          setBookings((prev) => [booking, ...prev]);
          if (sub.hoursLeft !== null) {
            const left = Math.max(0, sub.hoursLeft - input.hours);
            if (isLocalId(sub.id)) spendDemoHours(sub.id, input.hours);
            else
              await supabase
                .from("player_subscriptions")
                .update({ hours_left: left })
                .eq("id", sub.id);
            setSubscriptions((prev) =>
              prev.map((s2) => (s2.id === sub.id ? { ...s2, hoursLeft: left } : s2)),
            );
          }
          return { ok: true as const, booking };
        }

        const { data, error } = await supabase
          .from("bookings")
          .insert({
            code: makeBookingCode(),
            user_id: authUser.id,
            club_id: input.clubId,
            player_name: authUser.name,
            player_phone: authUser.phone,
            booking_date: input.date,
            start_time: input.startTime,
            hours: input.hours,
            status: "upcoming",
            zone: input.zone ?? "standard",
            seat: input.seat ?? null,
          })
          .select("*")
          .single();
        if (error || !data) {
          console.error("bookSlot", error);
          return { ok: false as const, error: "failed" as const };
        }
        const booking = toBooking(data as unknown as BookingRow);
        setBookings((prev) => [booking, ...prev]);

        if (sub.hoursLeft !== null) {
          const left = Math.max(0, sub.hoursLeft - input.hours);
          await supabase.from("player_subscriptions").update({ hours_left: left }).eq("id", sub.id);
          setSubscriptions((prev) =>
            prev.map((s) => (s.id === sub.id ? { ...s, hoursLeft: left } : s)),
          );
        }
        return { ok: true as const, booking };
      },
      extendBooking: async (bookingId, extraHours) => {
        if (!authUser) return { ok: false, error: "noSub" as const };
        const target = bookings.find((b) => b.id === bookingId);
        if (!target) return { ok: false, error: "failed" as const };
        const sub = activeSubFor(authUser.id);
        if (!sub) return { ok: false, error: "noSub" as const };
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub.planId);
        const cap = plan?.dailyCap ?? 5;
        if (sub.hoursLeft !== null && extraHours > sub.hoursLeft) {
          return { ok: false, error: "notEnoughHours" as const };
        }
        if (usedHoursOn(authUser.id, target.date) + extraHours > cap) {
          return { ok: false, error: "dailyCap" as const };
        }
        const hours = target.hours + extraHours;
        if (isLocalId(bookingId)) {
          patchDemoBooking(bookingId, { hours });
        } else {
          const { error } = await supabase.from("bookings").update({ hours }).eq("id", bookingId);
          if (error) {
            console.error("extendBooking", error);
            return { ok: false, error: "failed" as const };
          }
        }
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, hours } : b)));
        if (sub.hoursLeft !== null) {
          const left = Math.max(0, sub.hoursLeft - extraHours);
          if (isLocalId(sub.id)) spendDemoHours(sub.id, extraHours);
          else
            await supabase
              .from("player_subscriptions")
              .update({ hours_left: left })
              .eq("id", sub.id);
          setSubscriptions((prev) =>
            prev.map((s2) => (s2.id === sub.id ? { ...s2, hoursLeft: left } : s2)),
          );
        }
        return { ok: true };
      },
      cancelBooking: async (bookingId) => {
        const target = bookings.find((b) => b.id === bookingId);
        if (isLocalId(bookingId)) patchDemoBooking(bookingId, { status: "cancelled" });
        else await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
        );
        if (target && target.status === "upcoming") {
          const sub = activeSubFor(target.userId);
          if (sub && sub.hoursLeft !== null) {
            const left =
              (sub.hoursTotal ?? sub.hoursLeft) >= sub.hoursLeft + target.hours
                ? sub.hoursLeft + target.hours
                : sub.hoursLeft;
            if (isLocalId(sub.id)) spendDemoHours(sub.id, -target.hours);
            else
              await supabase
                .from("player_subscriptions")
                .update({ hours_left: left })
                .eq("id", sub.id);
            setSubscriptions((prev) =>
              prev.map((s) => (s.id === sub.id ? { ...s, hoursLeft: left } : s)),
            );
          }
        }
      },
      checkInBooking: async (bookingId) => {
        if (isLocalId(bookingId)) patchDemoBooking(bookingId, { status: "active" });
        else await supabase.from("bookings").update({ status: "active" }).eq("id", bookingId);
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "active" } : b)),
        );
      },
      completeBooking: async (bookingId) => {
        if (isLocalId(bookingId)) patchDemoBooking(bookingId, { status: "completed" });
        else await supabase.from("bookings").update({ status: "completed" }).eq("id", bookingId);
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "completed" } : b)),
        );
      },
      addReview: async (clubId, rating, text) => {
        if (!authUser) return;
        if (isDemoFlow(clubId) || isDemoUserId(authUser.id)) {
          const review = addDemoReview({
            clubId,
            userId: authUser.id,
            authorName: authUser.name,
            rating,
            text,
          });
          setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
          return;
        }
        const { data, error } = await supabase
          .from("reviews")
          .upsert(
            {
              club_id: clubId,
              user_id: authUser.id,
              author_name: authUser.name,
              rating,
              text,
            },
            { onConflict: "club_id,user_id" },
          )
          .select("*")
          .single();
        if (error || !data) {
          console.error("addReview", error);
          return;
        }
        const review = toReview(data as unknown as ReviewRow);
        setReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
        await loadClubs();
      },
      setClubStatus: async (clubId, status) => {
        await supabase.from("clubs").update({ status, rejection_reason: null }).eq("id", clubId);
        setClubs((prev) =>
          prev.map((c) => {
            if (c.id !== clubId) return c;
            const { rejectionReason: _dropped, ...rest } = c;
            return { ...rest, status };
          }),
        );
      },
      rejectClub: async (clubId, reason) => {
        await supabase
          .from("clubs")
          .update({ status: "rejected", rejection_reason: reason })
          .eq("id", clubId);
        setClubs((prev) =>
          prev.map((c) =>
            c.id === clubId
              ? { ...c, status: "rejected" as ClubStatus, rejectionReason: reason }
              : c,
          ),
        );
      },
      reloadClubs: loadClubs,
      reloadData: loadData,
      removeClub: async (clubId) => {
        await supabase.from("clubs").delete().eq("id", clubId);
        setClubs((prev) => prev.filter((c) => c.id !== clubId));
      },
      updateClub: async (clubId, patch) => {
        await supabase.from("clubs").update(clubPatchToRow(patch)).eq("id", clubId);
        setClubs((prev) => prev.map((c) => (c.id === clubId ? { ...c, ...patch } : c)));
      },
      findBookingByCode: (code) =>
        bookings.find((b) => b.code.toUpperCase() === code.trim().toUpperCase()),
    };
  }, [authUser, clubs, bookings, subscriptions, reviews, payments, loading, loadClubs, loadData]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
