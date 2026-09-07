import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownToLine,
  CalendarClock,
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Phone,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { LANGS, useI18n } from "@/lib/i18n";
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
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold">
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
  const { bookings, clubs, cancelBooking } = useStore();
  const { t } = useI18n();
  const mine = bookings.filter((b) => b.userId === user?.id);
  const current = pickCurrentBooking(mine);
  const club = current ? clubs.find((c) => c.id === current.clubId) : undefined;
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
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface-2 text-muted-foreground">
          <Monitor className="size-7" />
        </span>
        <h2 className="font-display mt-4 text-xl font-extrabold">{t("session.none")}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {t("session.noneHint")}
        </p>
        <Button asChild className="mt-6" size="lg">
          <Link to="/">{t("session.pickClub")}</Link>
        </Button>
      </div>
    );
  }

  const phase = sessionPhase(current);
  const live = phase === "live";
  const checkedIn = current.status === "active";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="ca-card ca-rise p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("session.yourBooking")}
            </p>
            <h2 className="font-display truncate text-xl font-extrabold">{club?.name ?? "—"}</h2>
            <p className="truncate text-xs text-muted-foreground">{club?.address}</p>
          </div>
          <Badge
            variant={checkedIn ? "lime" : live ? "default" : "muted"}
            className={cn(checkedIn && "ca-live")}
          >
            {checkedIn ? t("booking.active") : live ? t("session.waiting") : t("booking.upcoming")}
          </Badge>
        </div>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <SessionRing booking={current} size={230} />
          <div className="ca-tile w-full max-w-xs p-4 text-center">
            <div className="mx-auto w-fit rounded-2xl bg-white p-2.5">
              <QRCodeSVG
                value={`hotshot:${current.code}`}
                size={118}
                bgColor="#ffffff"
                fgColor="#030405"
                level="M"
              />
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("session.code")}
            </p>
            <p className="font-display text-3xl font-extrabold tracking-[0.2em] text-primary">
              {current.code}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {current.date} · {current.startTime} · {current.hours}
              {t("club.hShort")}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {club && (
            <Button asChild variant="secondary" size="lg">
              <Link to="/clubs/$clubId" params={{ clubId: club.id }}>
                {t("session.extend")}
              </Link>
            </Button>
          )}
          {current.status === "upcoming" && (
            <Button
              variant="destructive"
              size="lg"
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
        <p className="text-xs font-semibold text-muted-foreground">{t("session.upcoming")}</p>
        {others.length === 0 ? (
          <p className="ca-card p-5 text-sm text-muted-foreground">{t("profile.emptyBookings")}</p>
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
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-primary">
        <CalendarClock className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{club?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {booking.date} · {booking.startTime} · {booking.hours}
          {t("club.hShort")} · <b className="text-foreground">{booking.code}</b>
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
  at: string; // sortable "YYYY-MM-DD HH:MM"
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
      <section className="ca-card ca-rise flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-extrabold leading-none tabular sm:text-4xl">
            {sub ? (sub.hoursLeft === null ? "∞" : sub.hoursLeft) : 0}
            <span className="ml-1.5 text-lg font-bold text-muted-foreground">
              {t("wallet.hoursShort")}
            </span>
          </p>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            {t("wallet.balance")}
            {sub
              ? ` · ${t(`plan.${sub.planId}.name`)} · ${t("wallet.validUntil").toLowerCase()} ${sub.validUntil}${plan ? ` · ${t("profile.cap", { cap: plan.dailyCap })}` : ""}`
              : ` · ${t("wallet.noSub")}`}
          </p>
          {sub && sub.hoursLeft !== null && sub.hoursTotal !== null && (
            <Progress value={(sub.hoursLeft / sub.hoursTotal) * 100} className="mt-3 max-w-sm" />
          )}
        </div>
        <Button asChild size="lg">
          <Link to="/passes">{t("home.topup")}</Link>
        </Button>
      </section>

      <section>
        <h2 className="font-display mb-3 text-lg font-extrabold">{t("wallet.history")}</h2>
        {groups.length === 0 ? (
          <p className="ca-card p-8 text-center text-sm text-muted-foreground">
            {t("wallet.empty")}
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
                <div className="space-y-2">
                  {items.map((e) => (
                    <div key={e.id} className="ca-card flex items-center gap-3 p-3.5">
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-2xl",
                          e.kind === "debit" && "bg-lime/15 text-lime",
                          e.kind === "credit" && "bg-primary/15 text-primary",
                          e.kind === "refund" && "bg-surface-2 text-muted-foreground",
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
                        <p className="truncate text-sm font-bold">
                          {e.kind === "debit"
                            ? t("wallet.debit")
                            : e.kind === "credit"
                              ? t("wallet.credit")
                              : t("wallet.refund")}
                          <span className="font-medium text-muted-foreground"> · {e.title}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-display text-base font-extrabold tabular",
                            e.kind === "debit" ? "text-foreground" : "text-lime",
                          )}
                        >
                          {e.hours}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
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
  const { bookings, cancelBooking } = useStore();
  const { t, lang, setLang } = useI18n();
  if (!user) return null;
  const mine = bookings
    .filter((b) => b.userId === user.id)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <section className="ca-card ca-rise p-5 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground shadow-[0_10px_30px_rgb(42_152_229/0.5)]">
            {user.avatarInitials}
          </span>
          <h2 className="font-display mt-3 text-xl font-extrabold">{user.name}</h2>
          <p className="text-xs text-muted-foreground">{t(`role.${user.role}`)}</p>

          <div className="mt-5 space-y-2 text-left">
            <div className="ca-row">
              <Mail className="size-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{user.email}</span>
            </div>
            <div className="ca-row">
              <Phone className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-medium">{user.phone || "—"}</span>
            </div>
            <div className="ca-row">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="text-sm font-medium">{user.city}</span>
            </div>
          </div>

          <div
            className="mt-4 flex rounded-full bg-surface-2 p-1 text-xs font-bold"
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

          <Button variant="ghost" className="mt-3 w-full" onClick={logout}>
            <LogOut className="size-4" /> {t("auth.signout")}
          </Button>
        </section>

        <Link
          to="/passes"
          className="ca-card flex items-center gap-3 p-4 transition-colors hover:bg-surface-2"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-lime/15 text-lime">
            <Wallet className="size-5" />
          </span>
          <span className="flex-1 text-sm font-bold">{t("nav.subs")}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      <section>
        <h2 className="font-display mb-3 text-lg font-extrabold">{t("profile.tab.bookings")}</h2>
        {mine.length === 0 ? (
          <p className="ca-card p-8 text-center text-sm text-muted-foreground">
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
      </section>
    </div>
  );
}
