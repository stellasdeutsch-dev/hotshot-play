import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  LocateFixed,
  MapPin,
  Monitor,
  Search,
  Star,
  Ticket,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { kzt, type Booking, type Club } from "@/lib/mock-db";
import {
  distanceKm,
  formatDistance,
  hoursLabel,
  isOpenNow,
  pickCurrentBooking,
  sessionPhase,
} from "@/lib/club-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClubCard } from "@/components/ClubCard";
import { ClubCover } from "@/components/ClubCover";
import { DemoEntry } from "@/components/DemoEntry";

const ClubMap = lazy(() => import("@/components/ClubMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HeadShotPlay — карта компьютерных клубов Астаны" },
      {
        name: "description",
        content:
          "Все компьютерные клубы Астаны на одной карте: бронируйте места часами абонемента и заходите по короткому коду.",
      },
      { property: "og:title", content: "HeadShotPlay — все клубы на одной карте" },
      {
        property: "og:description",
        content: "Найдите клуб, выберите время и забронируйте место за секунды.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

type Sort = "all" | "open" | "near" | "cheap" | "top";
type LatLng = { lat: number; lng: number };

function MapSkeleton() {
  return <div className="grid-bg h-full w-full animate-pulse bg-secondary" />;
}

function HomePage() {
  const { clubs, bookings, activeSubFor } = useStore();
  const { user, role } = useAuth();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => setMounted(true), []);

  const isPlayer = !!user && role === "player";
  const sub = isPlayer && user ? activeSubFor(user.id) : undefined;
  const myBookings = useMemo(
    () => (isPlayer && user ? bookings.filter((b) => b.userId === user.id) : []),
    [isPlayer, user, bookings],
  );
  const current = pickCurrentBooking(myBookings);
  const currentClub = current ? clubs.find((c) => c.id === current.clubId) : undefined;

  const active = clubs.filter((c) => c.status === "active");
  const totalSeats = active.reduce((s, c) => s + c.totalSeats, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = active.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q),
    );
    if (sort === "open") list = list.filter((c) => isOpenNow(c));
    if (sort === "cheap") list = [...list].sort((a, b) => a.pricePerHour - b.pricePerHour);
    if (sort === "top")
      list = [...list].sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    if (sort === "near" && userPos)
      list = [...list].sort((a, b) => distanceKm(userPos, a) - distanceKm(userPos, b));
    return list;
  }, [active, query, sort, userPos]);

  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  const locate = () => {
    if (userPos) {
      setSort("near");
      return;
    }
    if (!navigator.geolocation) {
      toast.error(t("home.geoDenied"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("near");
        setLocating(false);
      },
      () => {
        toast.error(t("home.geoDenied"));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  const chips: { id: Sort; label: string; onClick?: () => void }[] = [
    { id: "all", label: t("home.all") },
    { id: "open", label: t("home.openNow") },
    { id: "near", label: t("home.sort.near"), onClick: locate },
    { id: "cheap", label: t("home.sort.cheap") },
    { id: "top", label: t("home.sort.top") },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {isPlayer && user ? (
        <PlayerHeader
          name={user.name}
          initials={user.avatarInitials}
          hours={sub ? (sub.hoursLeft === null ? "∞" : String(sub.hoursLeft)) : "0"}
          bookings={myBookings}
          locale={locale}
        />
      ) : (
        <>
          <GuestHero clubs={active.length} seats={totalSeats} />
          <DemoEntry />
        </>
      )}

      {/* Current session / call to action */}
      {isPlayer && (
        <section className="ca-blue ca-rise relative overflow-hidden p-5 sm:p-7">
          <div className="grid-bg absolute inset-0 opacity-30" aria-hidden />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            {current && currentClub ? (
              <>
                <div className="min-w-0">
                  <span className="ca-pill bg-white/15 text-white">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        sessionPhase(current) === "live" ? "bg-lime" : "bg-white/70",
                      )}
                    />
                    {sessionPhase(current) === "live" ? t("session.live") : t("booking.upcoming")}
                  </span>
                  <h2 className="font-display mt-3 truncate text-2xl font-extrabold sm:text-3xl">
                    {currentClub.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/80">
                    {current.date} · {current.startTime} · {current.hours}
                    {t("club.hShort")}
                    {current.seat !== null ? ` · ${t("seats.pc")} ${current.seat}` : ""}
                  </p>
                  <p className="font-display mt-2 text-3xl font-extrabold tracking-[0.18em]">
                    {current.code}
                  </p>
                </div>
                <Button asChild size="lg" variant="lime" className="shrink-0">
                  <Link to="/profile" search={{ tab: "session" }}>
                    {t("nav.session")} <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="max-w-md">
                  <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                    {sub ? t("session.noneHint") : t("club.noSub")}
                  </h2>
                  <p className="mt-2 text-sm text-white/80">{t("home.guestText")}</p>
                </div>
                <Button asChild size="lg" variant="lime" className="shrink-0">
                  <Link to={sub ? "/" : "/passes"}>
                    {sub ? t("session.pickClub") : t("club.buySub")}{" "}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Search + chips */}
      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("home.search")}
            className="h-13 bg-card pl-11 pr-11 shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("common.close")}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={c.onClick ?? (() => setSort(c.id))}
              className={cn("ca-chip", sort === c.id && "ca-chip-active")}
            >
              {c.id === "near" && (
                <LocateFixed className={cn("size-3.5", locating && "animate-spin")} />
              )}
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="ca-card relative overflow-hidden p-1.5">
        <div className="h-[320px] overflow-hidden rounded-[1.5rem] sm:h-[440px] lg:h-[500px]">
          {mounted ? (
            <Suspense fallback={<MapSkeleton />}>
              <ClubMap
                clubs={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                userPos={userPos}
              />
            </Suspense>
          ) : (
            <MapSkeleton />
          )}
        </div>
        {!selected && (
          <div className="pointer-events-none absolute left-5 top-5 z-[800] rounded-full bg-card/90 px-3 py-1.5 text-[11px] font-bold text-muted-foreground backdrop-blur">
            {t("home.mapHint")}
          </div>
        )}
        {selected && (
          <MapPreview
            club={selected}
            {...(userPos ? { distance: distanceKm(userPos, selected) } : {})}
            onClose={() => setSelectedId(null)}
          />
        )}
      </section>

      {/* Club list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">{t("home.clubs")}</h2>
          <span className="text-xs font-bold text-muted-foreground">
            {filtered.length} / {active.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="ca-card p-10 text-center text-sm font-semibold text-muted-foreground">
            {t("home.empty")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((club, i) => (
              <div
                key={club.id}
                className="ca-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <ClubCard
                  club={club}
                  active={selectedId === club.id}
                  {...(userPos ? { distanceKm: distanceKm(userPos, club) } : {})}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Partner CTA */}
      {!user && (
        <section className="ca-ink flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
          <div>
            <p className="font-display text-xl font-extrabold">{t("auth.tab.club")}</p>
            <p className="mt-1 max-w-md text-sm text-white/70">{t("partner.free")}</p>
          </div>
          <Button asChild variant="lime">
            <Link to="/auth" search={{ mode: "club" }}>
              {t("auth.registerClub")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

/** "Привет, Имя" header with a week strip of upcoming bookings. */
function PlayerHeader({
  name,
  initials,
  hours,
  bookings,
  locale,
}: {
  name: string;
  initials: string;
  hours: string;
  bookings: Booking[];
  locale: string;
}) {
  const { t } = useI18n();
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        value,
        letter: new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d).toUpperCase(),
        num: d.getDate(),
        isToday: i === 0,
      };
    });
  }, [locale]);

  const booked = new Set(
    bookings.filter((b) => b.status === "upcoming" || b.status === "active").map((b) => b.date),
  );

  return (
    <section className="ca-rise">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground">{t("home.balance")}</p>
          <h1 className="font-display truncate text-3xl font-extrabold leading-tight sm:text-4xl">
            <span className="text-primary">{t("home.hello")},</span> {name}
          </h1>
        </div>
        <Link
          to="/profile"
          search={{ tab: "profile" }}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-[0_10px_24px_-12px_rgb(46_107_255/0.8)]"
        >
          {initials}
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1.5">
        {days.map((d) => {
          const has = booked.has(d.value);
          return (
            <div key={d.value} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground">{d.letter}</span>
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-2xl text-sm font-extrabold transition-colors",
                  has
                    ? "bg-lime text-lime-foreground"
                    : d.isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground",
                )}
              >
                {d.num}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat value={hours} label={t("home.balanceHours")} tone="lime" />
        <Stat value={String(booked.size)} label={t("profile.tab.bookings")} />
        <Link
          to="/passes"
          className="ca-card grid place-items-center p-3 text-center transition-transform hover:-translate-y-0.5"
        >
          <Ticket className="size-5 text-primary" />
          <span className="mt-1 text-[11px] font-bold text-muted-foreground">
            {t("home.topup")}
          </span>
        </Link>
      </div>
    </section>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "lime" }) {
  return (
    <div className={cn("ca-card p-3 text-center", tone === "lime" && "bg-lime shadow-none")}>
      <p className="font-display text-2xl font-extrabold leading-none tabular">{value}</p>
      <p
        className={cn(
          "mt-1 text-[11px] font-bold",
          tone === "lime" ? "text-lime-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
    </div>
  );
}

function GuestHero({ clubs, seats }: { clubs: number; seats: number }) {
  const { t } = useI18n();
  return (
    <section className="ca-ink ca-rise relative overflow-hidden p-6 sm:p-10">
      <div className="grid-bg absolute inset-0 opacity-20" aria-hidden />
      <div
        className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/40 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <span className="ca-pill bg-white/10 text-white">
            <span className="size-1.5 rounded-full bg-lime" /> {t("home.badge")}
          </span>
          <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.05] sm:text-5xl">
            {t("home.guestTitle")}
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/75 sm:text-base">{t("home.guestText")}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="lime">
              <Link to="/auth">
                {t("home.guestCta")} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20">
              <Link to="/passes">{t("nav.subs")}</Link>
            </Button>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="font-display text-3xl font-extrabold leading-none tabular">{clubs}</p>
            <p className="mt-1 text-[11px] font-semibold text-white/60">{t("home.stat.clubs")}</p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold leading-none tabular">{seats}</p>
            <p className="mt-1 text-[11px] font-semibold text-white/60">{t("home.stat.seats")}</p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold leading-none tabular">1 375</p>
            <p className="mt-1 text-[11px] font-semibold text-white/60">{t("home.stat.players")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MapPreview({
  club,
  distance,
  onClose,
}: {
  club: Club;
  distance?: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const open = isOpenNow(club);
  return (
    <div className="ca-rise absolute inset-x-4 bottom-4 z-[800] sm:left-4 sm:right-auto sm:w-[360px]">
      <div className="ca-card overflow-hidden p-1.5 shadow-[0_18px_44px_-20px_rgb(11_20_55/0.55)]">
        <ClubCover cover={club.cover} alt={club.name} className="h-28 rounded-[1.25rem]">
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="on-image absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90"
          >
            <X className="size-4" />
          </button>
          <span
            className={cn(
              "ca-pill absolute left-3 top-3",
              open ? "bg-lime text-lime-foreground" : "bg-white/85 on-image-muted",
            )}
          >
            {open ? t("home.openBadge") : t("home.closed")}
          </span>
        </ClubCover>
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display truncate text-lg font-extrabold leading-tight">
                {club.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-muted-foreground">
                <MapPin className="size-3 shrink-0" /> {club.address}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold">
              <Star className="size-3.5 fill-star text-star" />{" "}
              {club.rating > 0 ? club.rating.toFixed(1) : "—"}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {hoursLabel(club, t("home.open247"))}
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="size-3.5" /> {club.totalSeats}
            </span>
            {distance !== undefined && <span>{formatDistance(distance)}</span>}
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span className="ca-pill ca-pill-lime text-sm">
              {t("home.from")} {kzt(club.pricePerHour)}/{t("club.hShort")}
            </span>
            <Button asChild>
              <Link to="/clubs/$clubId" params={{ clubId: club.id }}>
                {t("home.book")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
