import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownToLine,
  CalendarClock,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Phone,
  Plus,
  RotateCcw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { LANGS, useI18n } from "@/lib/i18n";
import { THEMES, useTheme } from "@/lib/theme";
import { SUBSCRIPTION_PLANS, kzt, todayStr, type Booking, type BookingStatus } from "@/lib/mock-db";
import { bookingWindow, pickCurrentBooking, sessionPhase } from "@/lib/club-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RequireRole } from "@/components/RequireRole";
import { SessionRing } from "@/components/SessionRing";

type Tab = "session" | "wallet" | "profile";

export const Route = createFileRoute("/profile")({
  validateSearch: (s: Record<string, unknown>): { tab: Tab } => ({
    tab: s["tab"] === "wallet" || s["tab"] === "profile" ? (s["tab"] as Tab) : "session",
  }),
  head: () => ({
    meta: [
      { title: "Профиль — HotShot Play" },
      { name: "description", content: "Сессия, кошелёк часов и брони HotShot Play." },
      { property: "og:title", content: "HotShot Play — профиль игрока" },
      { property: "og:description", content: "Таймер сессии, история операций и абонемент." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProfilePage,
});

const STATUS_VARIANT: Record<BookingStatus, "default" | "lime" | "muted" | "destructive"> = {
  upcoming: "default",
  active: "lime",
  completed: "muted",
  cancelled: "destructive",
};

function ProfilePage() {
  return (
    <RequireRole roles={["player"]}>
      <ProfileInner />
    </RequireRole>
  );
}

function ProfileInner() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ to: "/profile", search: { tab: v as Tab } })}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold">
            {tab === "session"
              ? t("session.title")
              : tab === "wallet"
                ? t("wallet.title")
                : t("profile.title")}
          </h1>
          <TabsList>
            <TabsTrigger value="session">
              <Monitor /> <span className="hidden sm:inline">{t("nav.session")}</span>
            </TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet /> <span className="hidden sm:inline">{t("nav.wallet")}</span>
            </TabsTrigger>
            <TabsTrigger value="profile">
              <span className="grid size-4 place-items-center rounded-full bg-current/20 text-[9px] font-extrabold">
                {user.avatarInitials.slice(0, 1)}
              </span>
              <span className="hidden sm:inline">{t("nav.profile")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="session" className="mt-5">
          <SessionTab />
        </TabsContent>
        <TabsContent value="wallet" className="mt-5">
          <WalletTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-5">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ Session ------------------------------ */

function SessionTab() {
  const { user } = useAuth();
  const { bookings, clubs, cancelBooking, extendBooking, activeSubFor } = useStore();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const mine = bookings.filter((b) => b.userId === user?.id);
  const current = pickCurrentBooking(mine);
  const club = current ? clubs.find((c) => c.id === current.clubId) : undefined;
  const sub = user ? activeSubFor(user.id) : undefined;
  const others = mine
    .filter(
      (b) =>
        b.id !== current?.id &&
        (b.status === "upcoming" || b.status === "active") &&
        sessionPhase(b) !== "past",
    )
    .sort((a, b) => bookingWindow(a).start.getTime() - bookingWindow(b).start.getTime());

  if (!current) {
    return (
      <div className="ca-card ca-rise p-8 text-center sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Monitor className="size-7" />
        </span>
        <h2 className="font-display mt-4 text-xl font-extrabold">{t("session.none")}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-muted-foreground">
          {t("session.noneHint")}
        </p>
        <Button asChild className="mt-6" size="lg" variant="lime">
          <Link to="/">{t("session.pickClub")}</Link>
        </Button>
      </div>
    );
  }

  const phase = sessionPhase(current);
  const live = phase === "live";
  const checkedIn = current.status === "active";

  const extend = async () => {
    setBusy(true);
    const res = await extendBooking(current.id, 1);
    setBusy(false);
    toast[res.ok ? "success" : "error"](res.ok ? t("session.extended") : t("session.extendFail"));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="ca-blue ca-rise relative overflow-hidden p-5 sm:p-8">
        <div className="grid-bg absolute inset-0 opacity-25" aria-hidden />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/70">{t("session.yourBooking")}</p>
              <h2 className="font-display truncate text-2xl font-extrabold">{club?.name ?? "—"}</h2>
              <p className="truncate text-xs font-semibold text-white/70">{club?.address}</p>
            </div>
            <span
              className={cn(
                "ca-pill shrink-0",
                checkedIn ? "bg-lime text-lime-foreground ca-live" : "bg-white/15 text-white",
              )}
            >
              {checkedIn
                ? t("booking.active")
                : live
                  ? t("session.waiting")
                  : t("booking.upcoming")}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
            <SessionRing booking={current} size={230} tone="onBlue" />
            <div className="on-image w-full max-w-xs rounded-[1.5rem] bg-white p-4 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-1">
                <QRCodeSVG
                  value={`hotshot:${current.code}`}
                  size={118}
                  bgColor="#ffffff"
                  fgColor="#0b1437"
                  level="M"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#5b6480]">
                {t("session.code")}
              </p>
              <p className="font-display text-3xl font-extrabold tracking-[0.18em] text-[#2e6bff]">
                {current.code}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#5b6480]">
                {current.date} · {current.startTime} · {current.hours}
                {t("club.hShort")}
              </p>
              {current.seat !== null && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-extrabold">
                  <Monitor className="size-3.5 text-[#2e6bff]" /> {t("seats.pc")} {current.seat}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Button
              variant="lime"
              size="lg"
              disabled={busy || !sub || (sub.hoursLeft !== null && sub.hoursLeft < 1)}
              onClick={extend}
            >
              <Plus className="size-4" /> {t("session.extendHour")}
            </Button>
            {club && (
              <Button asChild size="lg" className="bg-white/15 text-white hover:bg-white/25">
                <Link to="/shop" search={{ club: club.id }}>
                  <ShoppingBag className="size-4" /> {t("nav.shop")}
                </Link>
              </Button>
            )}
            {club && (
              <Button asChild size="lg" className="bg-white/15 text-white hover:bg-white/25">
                <Link to="/chat" search={{ club: club.id }}>
                  <MessageCircle className="size-4" /> {t("nav.chat")}
                </Link>
              </Button>
            )}
          </div>

          {current.status === "upcoming" && (
            <Button
              variant="ghost"
              className="mt-2 w-full text-white/70 hover:bg-white/10 hover:text-white"
              onClick={async () => {
                await cancelBooking(current.id);
                toast.success(t("profile.cancelledToast"));
              }}
            >
              {t("session.cancel")}
            </Button>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground">{t("session.upcoming")}</p>
        {others.length === 0 ? (
          <p className="ca-card p-5 text-sm font-semibold text-muted-foreground">
            {t("profile.emptyBookings")}
          </p>
        ) : (
          others.map((b) => <BookingRow key={b.id} booking={b} />)
        )}
      </aside>
    </div>
  );
}

function BookingRow({ booking, action }: { booking: Booking; action?: React.ReactNode }) {
  const { clubs } = useStore();
  const { t } = useI18n();
  const club = clubs.find((c) => c.id === booking.clubId);
  return (
    <div className="ca-card flex items-center gap-3 p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
        <CalendarClock className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{club?.name ?? "—"}</p>
        <p className="text-xs font-semibold text-muted-foreground">
          {booking.date} · {booking.startTime} · {booking.hours}
          {t("club.hShort")}
          {booking.seat !== null ? ` · ${t("seats.pc")} ${booking.seat}` : ""} ·{" "}
          <b className="text-primary">{booking.code}</b>
        </p>
      </div>
      <Badge variant={STATUS_VARIANT[booking.status]}>{t(`booking.${booking.status}`)}</Badge>
      {action}
    </div>
  );
}

/* ------------------------------ Wallet ------------------------------ */

type Entry = {
  id: string;
  kind: "debit" | "credit" | "refund";
  title: string;
  subtitle: string;
  hours: string;
  money?: string;
  status?: string;
  at: string;
};

function WalletTab() {
  const { user } = useAuth();
  const { activeSubFor, bookings, payments, clubs } = useStore();
  const { t, locale } = useI18n();

  const sub = user ? activeSubFor(user.id) : undefined;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub?.planId);

  const entries = useMemo<Entry[]>(() => {
    if (!user) return [];
    const clubName = (id: string) => clubs.find((c) => c.id === id)?.name ?? "—";
    const list: Entry[] = [];
    for (const p of payments.filter((x) => x.userId === user.id)) {
      const pl = SUBSCRIPTION_PLANS.find((x) => x.id === p.planId);
      list.push({
        id: `p-${p.id}`,
        kind: "credit",
        title: t("wallet.subLabel"),
        subtitle: `${p.label.startsWith("plan.") ? t(p.label) : p.label} · ${p.method}`,
        hours: pl ? (pl.hours === null ? "∞" : `+${pl.hours} ${t("wallet.hoursShort")}`) : "",
        money: kzt(p.amountKzt),
        status: t(`payStatus.${p.status}`),
        at: p.createdAt,
      });
    }
    for (const b of bookings.filter((x) => x.userId === user.id)) {
      const cancelled = b.status === "cancelled";
      list.push({
        id: `b-${b.id}`,
        kind: cancelled ? "refund" : "debit",
        title: cancelled ? t("wallet.refundLabel") : t("wallet.bookingLabel"),
        subtitle: `${clubName(b.clubId)} · ${b.startTime} · ${b.code}`,
        hours: `${cancelled ? "+" : "−"}${b.hours} ${t("wallet.hoursShort")}`,
        at: `${b.date} ${b.startTime}`,
      });
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [user, payments, bookings, clubs, t]);

  const groups = useMemo(() => {
    const today = todayStr();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const d = e.at.slice(0, 10);
      const label =
        d === today
          ? t("wallet.today")
          : d === yesterday
            ? t("wallet.yesterday")
            : new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(
                new Date(`${d}T00:00:00`),
              );
      const arr = map.get(label) ?? [];
      arr.push(e);
      map.set(label, arr);
    }
    return [...map.entries()];
  }, [entries, locale, t]);

  return (
    <div className="space-y-5">
      <section className="ca-blue ca-rise relative overflow-hidden p-5 sm:p-7">
        <div className="grid-bg absolute inset-0 opacity-25" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/70">{t("wallet.balance")}</p>
            <p className="font-display text-4xl font-extrabold leading-none tabular sm:text-5xl">
              {sub ? (sub.hoursLeft === null ? "∞" : sub.hoursLeft) : 0}
              <span className="ml-1.5 text-lg font-bold text-white/70">
                {t("wallet.hoursShort")}
              </span>
            </p>
            <p className="mt-2 text-xs font-semibold text-white/70">
              {sub
                ? `${t(`plan.${sub.planId}.name`)} · ${t("wallet.validUntil").toLowerCase()} ${sub.validUntil}${plan ? ` · ${t("profile.cap", { cap: plan.dailyCap })}` : ""}`
                : t("wallet.noSub")}
            </p>
            {sub && sub.hoursLeft !== null && sub.hoursTotal !== null && (
              <Progress
                value={(sub.hoursLeft / sub.hoursTotal) * 100}
                tone="lime"
                className="mt-3 max-w-sm bg-white/20"
              />
            )}
          </div>
          <Button asChild size="lg" variant="lime">
            <Link to="/passes">{t("home.topup")}</Link>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-extrabold">{t("wallet.history")}</h2>
        {groups.length === 0 ? (
          <p className="ca-card p-8 text-center text-sm font-semibold text-muted-foreground">
            {t("wallet.empty")}
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="mb-2 text-xs font-bold text-muted-foreground">{label}</p>
                <div className="space-y-2">
                  {items.map((e) => (
                    <div key={e.id} className="ca-card flex items-center gap-3 p-3.5">
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-2xl",
                          e.kind === "debit" && "bg-lime text-lime-foreground",
                          e.kind === "credit" && "bg-secondary text-primary",
                          e.kind === "refund" && "bg-secondary text-muted-foreground",
                        )}
                      >
                        {e.kind === "debit" ? (
                          <Monitor className="size-5" />
                        ) : e.kind === "credit" ? (
                          <ArrowDownToLine className="size-5" />
                        ) : (
                          <RotateCcw className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">
                          {e.kind === "debit"
                            ? t("wallet.debit")
                            : e.kind === "credit"
                              ? t("wallet.credit")
                              : t("wallet.refund")}
                          <span className="font-semibold text-muted-foreground"> · {e.title}</span>
                        </p>
                        <p className="truncate text-xs font-semibold text-muted-foreground">
                          {e.subtitle}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-display text-base font-extrabold tabular",
                            e.kind === "debit" ? "text-foreground" : "text-[#6f9b00]",
                          )}
                        >
                          {e.hours}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {e.money ?? e.at.slice(11, 16)}
                          {e.status ? ` · ${e.status}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------ Profile ------------------------------ */

function ProfileTab() {
  const { user, logout } = useAuth();
  const { bookings, cancelBooking, clubs } = useStore();
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  if (!user) return null;

  const mine = bookings
    .filter((b) => b.userId === user.id)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  const hoursPlayed = mine.filter((b) => b.status === "completed").reduce((s, b) => s + b.hours, 0);
  const clubsVisited = new Set(mine.map((b) => b.clubId)).size;

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <section className="ca-blue ca-rise relative overflow-hidden p-6 text-center">
          <div className="grid-bg absolute inset-0 opacity-25" aria-hidden />
          <div className="relative">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-white text-2xl font-extrabold text-primary">
              {user.avatarInitials}
            </span>
            <h2 className="font-display mt-3 text-xl font-extrabold">{user.name}</h2>
            <p className="text-xs font-semibold text-white/70">{t(`role.${user.role}`)}</p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-left">
              <div className="rounded-2xl bg-white/15 p-3 text-center">
                <p className="font-display text-xl font-extrabold tabular">{hoursPlayed}</p>
                <p className="text-[10px] font-bold text-white/70">{t("wallet.hoursShort")}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 text-center">
                <p className="font-display text-xl font-extrabold tabular">{mine.length}</p>
                <p className="text-[10px] font-bold text-white/70">{t("profile.tab.bookings")}</p>
              </div>
              <div className="rounded-2xl bg-white/15 p-3 text-center">
                <p className="font-display text-xl font-extrabold tabular">{clubsVisited}</p>
                <p className="text-[10px] font-bold text-white/70">{t("home.clubs")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="ca-card space-y-2 p-4">
          <div className="ca-row">
            <Mail className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold">{user.email}</span>
          </div>
          <div className="ca-row">
            <Phone className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-bold">{user.phone || "—"}</span>
          </div>
          <div className="ca-row">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-bold">{user.city}</span>
          </div>

          <div
            className="flex rounded-full bg-secondary p-1 text-xs font-bold"
            role="group"
            aria-label={t("lang.label")}
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={cn(
                  "flex-1 rounded-full py-2 transition-all",
                  lang === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1.5 pl-1 text-xs font-bold text-muted-foreground">
              {t("theme.label")}
            </p>
            <div className="flex rounded-full bg-secondary p-1 text-xs font-bold" role="group">
              {THEMES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={cn(
                    "flex-1 rounded-full py-2 transition-all",
                    theme === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <Button variant="ghost" className="w-full" onClick={logout}>
            <LogOut className="size-4" /> {t("auth.signout")}
          </Button>
        </section>

        <Link
          to="/passes"
          className="ca-card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-lime text-lime-foreground">
            <Wallet className="size-5" />
          </span>
          <span className="flex-1 text-sm font-extrabold">{t("nav.subs")}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      <section>
        <h2 className="font-display mb-3 text-lg font-extrabold">{t("profile.tab.bookings")}</h2>
        {mine.length === 0 ? (
          <p className="ca-card p-8 text-center text-sm font-semibold text-muted-foreground">
            {t("profile.emptyBookings")}
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                action={
                  b.status === "upcoming" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await cancelBooking(b.id);
                        toast.success(t("profile.cancelledToast"));
                      }}
                    >
                      {t("profile.cancel")}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}

        {clubs.length > 0 && (
          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="size-3.5" /> {t("club.dateHint")}
          </p>
        )}
      </section>
    </div>
  );
}
