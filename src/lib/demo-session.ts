import { demoEnabled, isDemoClub, localId, readLocal, writeLocal } from "./demo-data";
import {
  SUBSCRIPTION_PLANS,
  todayStr,
  type Booking,
  type Payment,
  type Review,
  type UserSubscription,
} from "./mock-db";

/**
 * Local-only booking/pass state for the showcase build.
 *
 * Demo clubs (ids starting with "demo-") have no database rows, and the static
 * GitHub Pages build has no server functions, so bookings and pass purchases
 * for them are stored in the browser. Everything here is gated behind
 * `demoEnabled()` and never touches real Supabase data.
 */

const BOOKINGS_KEY = "hsp-demo-bookings";
const SUBS_KEY = "hsp-demo-subs";
const PAYMENTS_KEY = "hsp-demo-payments";
const REVIEWS_KEY = "hsp-demo-reviews";

export const isLocalId = (id: string) => id.startsWith("local-");

export const readDemoBookings = () => readLocal<Booking[]>(BOOKINGS_KEY, []);
export const readDemoSubs = () => readLocal<UserSubscription[]>(SUBS_KEY, []);
export const readDemoPayments = () => readLocal<Payment[]>(PAYMENTS_KEY, []);
export const readDemoReviews = () => readLocal<Review[]>(REVIEWS_KEY, []);

/** Stores a review left in demo mode; one review per club and author. */
export function addDemoReview(input: Omit<Review, "id" | "createdAt">): Review {
  const review: Review = {
    ...input,
    id: localId(),
    createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  const rest = readDemoReviews().filter(
    (r) => !(r.clubId === input.clubId && r.userId === input.userId),
  );
  writeLocal(REVIEWS_KEY, [review, ...rest]);
  return review;
}

const writeBookings = (rows: Booking[]) => writeLocal(BOOKINGS_KEY, rows);
const writeSubs = (rows: UserSubscription[]) => writeLocal(SUBS_KEY, rows);

/** True when the booking/pass should be handled locally instead of in Supabase. */
export const isDemoFlow = (clubId: string) => demoEnabled() && isDemoClub(clubId);

export function addDemoBooking(booking: Booking) {
  writeBookings([booking, ...readDemoBookings()]);
}

export function patchDemoBooking(id: string, patch: Partial<Booking>) {
  writeBookings(readDemoBookings().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

/** Adds a pass bought in demo mode; replaces any earlier local pass of that user. */
export function grantDemoSubscription(userId: string, planId: string) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const until = new Date();
  until.setDate(until.getDate() + 30);
  const sub: UserSubscription = {
    id: localId(),
    userId,
    planId: plan.id,
    hoursTotal: plan.hours,
    hoursLeft: plan.hours,
    startedAt: todayStr(),
    validUntil: `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, "0")}-${String(until.getDate()).padStart(2, "0")}`,
    status: "active",
  };
  writeSubs([sub, ...readDemoSubs().filter((s) => s.userId !== userId)]);

  const payment: Payment = {
    id: localId(),
    userId,
    kind: "subscription",
    label: `plan.${plan.id}.name`,
    amountKzt: plan.priceKzt,
    method: "Kaspi QR",
    createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    status: "approved",
    planId: plan.id,
    receiptNumber: null,
    rejectionReason: null,
  };
  writeLocal(PAYMENTS_KEY, [payment, ...readDemoPayments()]);
  return sub;
}

export function spendDemoHours(subId: string, delta: number) {
  writeSubs(
    readDemoSubs().map((s) =>
      s.id === subId && s.hoursLeft !== null
        ? {
            ...s,
            hoursLeft: Math.max(0, Math.min(s.hoursTotal ?? s.hoursLeft, s.hoursLeft - delta)),
          }
        : s,
    ),
  );
}
