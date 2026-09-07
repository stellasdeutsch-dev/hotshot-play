import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  LocateFixed,
  Monitor,
  Search,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { kzt, type Club } from "@/lib/mock-db";
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
import { LogoMark } from "@/components/Logo";

const ClubMap = lazy(() => import("@/components/ClubMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HotShot Play — карта компьютерных клубов Астаны" },
      {
        name: "description",
        content:
          "Все компьютерные клубы Астаны на одной карте: бронируйте места часами абонемента и заходите по короткому коду.",
      },
      { property: "og:title", content: "HotShot Play — все клубы на одной карте" },
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
  return <div className="grid-bg h-full w-full animate-pulse bg-surface" />;
}

function HomePage() {
  const { clubs, bookings, activeSubFor } = useStore();
  const { user, role } = useAuth();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => setMounted(true), []);

  const isPlayer = !!user && role === "player";
  const sub = isPlayer && user ? activeSubFor(user.id) : undefined;
  const current =
    isPlayer && user ? pickCurrentBooking(bookings.filter((b) => b.userId === user.id)) : undefined;
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
    if (sort === "near" && userPos) {
      list = [...list].sort((a, b) => distanceKm(userPos, a) - distanceKm(userPos, b));
    }
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
      {/* Top: balance for players / hero for guests */}
      {isPlayer ? (
        <section className="ca-rise grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="ca-card flex items-center justify-between gap-4 p-4 sm:p-5">
            <div>
              <p className="font-display text-3xl font-extrabold leading-none tabular sm:text-4xl">
                {sub ? (sub.hoursLeft === null ? "∞" : sub.hoursLeft) : 0}
                <span className="ml-1.5 text-lg font-bold text-muted-foreground">
                  {t("home.balanceHours")}
                </span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                {t("home.balance")}
                {sub ? ` · ${t("wallet.validUntil").toLowerCase()} ${sub.validUntil}` : ""}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to="/passes">{t("home.topup")}</Link>
            </Button>
          </div>

          {current && currentClub ? (
            <Link
              to="/profile"
              search={{ tab: "session" }}
              className="ca-card flex items-center gap-3 p-4 transition-colors hover:bg-surface-2 sm:p-5 md:min-w-72"
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl",
                  sessionPhase(current) === "live"
                    ? "bg-lime text-lime-foreground ca-live"
                    : "bg-primary/15 text-primary",
                )}
              >
                <Monitor className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{currentClub.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {sessionPhase(current) === "live"
                    ? t("session.live")
                    : `${current.date} · ${current.startTime}`}{" "}
                  · <b className="text-foreground">{current.code}</b>
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ) : (
            <div className="hidden items-center gap-6 rounded-3xl bg-surface px-6 md:flex">
              <Stat value={active.length} label={t("home.stat.clubs")} />
              <Stat value={totalSeats} label={t("home.stat.seats")} />
            </div>
          )}
        </section>
      ) : (
        <section className="ca-rise ca-card relative overflow-hidden p-5 sm:p-8">
          <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
          <div
            className="absolute -right-16 -top-24 size-72 rounded-full bg-primary/25 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="ca-pill ca-pill-dark">
                <span className="size-1.5 rounded-full bg-lime" /> {t("home.badge")}
              </span>
              <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.05] sm:text-5xl">
                {t("home.guestTitle")}
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                {t("home.guestText")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="lg">
                  <Link to="/auth">
                    {t("home.guestCta")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/passes">{t("nav.subs")}</Link>
                </Button>
              </div>
            </div>
            <div className="flex gap-6">
              <Stat value={active.length} label={t("home.stat.clubs")} />
              <Stat value={totalSeats} label={t("home.stat.seats")} />
              <Stat value="1 375" label={t("home.stat.players")} />
            </div>
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
            className="h-13 bg-surface pl-11 pr-11"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("common.close")}
              className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface-2 text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
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
      <section className="ca-card relative overflow-hidden">
        <div className="h-[320px] sm:h-[440px] lg:h-[500px]">
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
          <div className="pointer-events-none absolute left-3 top-3 z-[800] rounded-full bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
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
          <span className="text-xs font-semibold text-muted-foreground">
            {filtered.length} / {active.length}
          </span>
        </div>
        {filtered.length === 0 ? (
          <p className="ca-card p-10 text-center text-sm text-muted-foreground">
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
        <section className="ca-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <LogoMark className="size-12" />
            <div>
              <p className="font-display text-lg font-extrabold">{t("auth.tab.club")}</p>
              <p className="text-sm text-muted-foreground">{t("passes.badge")}</p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link to="/auth" search={{ mode: "club" }}>
              {t("auth.registerClub")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-extrabold leading-none tabular sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
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
    <div className="ca-rise absolute inset-x-3 bottom-3 z-[800] sm:left-3 sm:right-auto sm:w-[360px]">
      <div className="ca-card overflow-hidden shadow-[0_20px_60px_rgb(0_0_0/0.7)]">
        <ClubCover cover={club.cover} alt={club.name} className="h-28">
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/60 text-foreground backdrop-blur"
          >
            <X className="size-4" />
          </button>
          <span
            className={cn(
              "ca-pill absolute left-3 top-3 backdrop-blur",
              open ? "bg-lime/90 text-lime-foreground" : "bg-black/60 text-muted-foreground",
            )}
          >
            {open ? t("home.openBadge") : t("home.closed")}
          </span>
        </ClubCover>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display truncate text-lg font-extrabold leading-tight">
                {club.name}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{club.address}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
              <Star className="size-3.5 fill-star text-star" />{" "}
              {club.rating > 0 ? club.rating.toFixed(1) : "—"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {hoursLabel(club, t("home.open247"))}
            </span>
            <span>
              {club.totalSeats} {t("home.seats")}
            </span>
            {distance !== undefined && <span>{formatDistance(distance)}</span>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
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
