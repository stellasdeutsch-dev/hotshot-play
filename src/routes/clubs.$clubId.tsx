import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  SUBSCRIPTION_PLANS,
  kzt,
  todayStr,
  type Booking,
  type Club,
  type Zone,
} from "@/lib/mock-db";
import { hoursLabel, initialsOf, isOpenNow } from "@/lib/club-utils";
import { zonePrice } from "@/lib/seats-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClubCover } from "@/components/ClubCover";
import { SeatPicker } from "@/components/SeatPicker";

export const Route = createFileRoute("/clubs/$clubId")({
  head: () => ({
    meta: [
      { title: "Клуб — HeadShotPlay" },
      { name: "description", content: "Бронирование игровых мест, отзывы и цены клуба." },
      { property: "og:title", content: "HeadShotPlay — бронирование клуба" },
      {
        property: "og:description",
        content: "Выберите дату, время и компьютер, оплатите часами абонемента.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ClubPage,
});

function dateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            size,
            i <= Math.round(value) ? "fill-star text-star" : "text-muted-foreground/25",
          )}
        />
      ))}
    </span>
  );
}

function ClubPage() {
  const { clubId } = Route.useParams();
  const { clubs, reviews } = useStore();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const club = clubs.find((c) => c.id === clubId);
  const [specsOpen, setSpecsOpen] = useState(false);
  if (!club || club.status !== "active") {
    return (
      <div className="ca-card mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-lg font-extrabold">{t("club.notfound")}</h1>
        <Button asChild className="mt-4">
          <Link to="/">{t("club.back")}</Link>
        </Button>
      </div>
    );
  }

  const clubReviews = reviews.filter((r) => r.clubId === club.id);
  const open = isOpenNow(club);
  const gisUrl = `https://2gis.kz/astana/search/${encodeURIComponent(`${club.name} ${club.address}`)}`;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: club.name, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard?.writeText(url);
    toast.success(t("club.linkCopied"));
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="secondary" size="icon-sm" aria-label={t("club.back")}>
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-display truncate px-2 text-base font-extrabold sm:text-lg">
          {club.name}
        </h1>
        <Button variant="secondary" size="icon-sm" onClick={share} aria-label={t("club.share")}>
          <Share2 className="size-4" />
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {/* Hero */}
          <div className="ca-card overflow-hidden p-1.5">
            <ClubCover cover={club.cover} alt={club.name} className="h-56 rounded-[1.5rem] sm:h-72">
              <span
                className={cn(
                  "ca-pill absolute left-4 top-4",
                  open ? "bg-lime text-lime-foreground" : "bg-white/85 on-image-muted",
                )}
              >
                {open ? t("club.openNow") : t("club.closedNow")}
              </span>
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                    {club.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/80">
                    <Clock className="size-3.5" /> {hoursLabel(club, t("home.open247"))}
                  </p>
                </div>
                <span className="on-image flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-extrabold">
                  <Star className="size-4 fill-star text-star" />{" "}
                  {club.rating > 0 ? club.rating.toFixed(1) : "—"}
                </span>
              </div>
            </ClubCover>

            <div className="p-4">
              <p className="text-xs font-bold text-muted-foreground">{t("club.seatsTitle")}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="ca-tile p-4">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {t("club.seatsStd")}
                  </p>
                  <p className="font-display mt-1 text-2xl font-extrabold tabular">
                    {club.totalSeats - club.vipSeats}
                  </p>
                </div>
                <div className="ca-tile p-4">
                  <p className="text-[11px] font-bold text-muted-foreground">VIP</p>
                  <p className="font-display mt-1 text-2xl font-extrabold tabular">
                    {club.vipSeats || "—"}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-lime p-4 text-lime-foreground">
                  <p className="text-[11px] font-bold opacity-70">{t("passes.perHour")}</p>
                  <p className="font-display mt-1 text-2xl font-extrabold tabular">
                    {kzt(club.pricePerHour)}
                  </p>
                </div>
                <div className="ca-tile flex flex-col justify-between p-4">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {t("club.reviewTitle")}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl font-extrabold tabular">
                      {club.reviewsCount}
                    </p>
                    <Stars value={club.rating} size="size-3" />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild variant="secondary">
                  <Link to="/shop" search={{ club: club.id }}>
                    <ShoppingBag className="size-4" /> {t("nav.shop")}
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/chat" search={{ club: club.id }}>
                    <MessageCircle className="size-4" /> {t("nav.chat")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <section className="ca-card p-4 sm:p-5">
            <h3 className="font-display text-lg font-extrabold">{t("club.info")}</h3>
            <div className="mt-3 space-y-2">
              <a
                href={gisUrl}
                target="_blank"
                rel="noreferrer"
                className="ca-row transition-colors hover:bg-surface-3"
              >
                <MapPin className="size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{club.address}</span>
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    {club.city} · {t("club.open2gis")}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </a>
              <div className="ca-row">
                <Clock className="size-5 shrink-0 text-primary" />
                <span className="flex-1 text-sm font-bold">
                  {hoursLabel(club, t("home.open247"))}
                </span>
              </div>
              {club.phone && (
                <a
                  href={`tel:${club.phone.replace(/[^\d+]/g, "")}`}
                  className="ca-row transition-colors hover:bg-surface-3"
                >
                  <Phone className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{club.phone}</span>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {t("club.call")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </section>

          {/* About */}
          <section className="ca-card p-4 sm:p-5">
            <h3 className="font-display text-lg font-extrabold">{t("club.about")}</h3>
            <div className="ca-tile mt-3 p-4 text-sm font-medium leading-relaxed">
              {club.description || "—"}
            </div>
            {club.specs && (
              <>
                <button
                  onClick={() => setSpecsOpen((v) => !v)}
                  className="ca-row mt-2 w-full text-left transition-colors hover:bg-surface-3"
                  aria-expanded={specsOpen}
                >
                  <Cpu className="size-5 shrink-0 text-primary" />
                  <span className="flex-1 text-sm font-bold">{t("club.hardware")}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      specsOpen && "rotate-180",
                    )}
                  />
                </button>
                {specsOpen && (
                  <div className="ca-rise mt-2 flex flex-wrap gap-1.5">
                    {club.specs.split("·").map((chunk) => (
                      <span key={chunk} className="ca-pill ca-pill-soft">
                        {chunk.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Reviews */}
          <section className="ca-card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold">{t("club.reviewTitle")}</h3>
              <span className="text-xs font-bold text-muted-foreground">
                {clubReviews.length} {t("club.reviewsCount")}
              </span>
            </div>
            <ReviewForm club={club} />
            <div className="mt-4 space-y-2">
              {clubReviews.length === 0 && (
                <p className="text-sm font-semibold text-muted-foreground">{t("club.noReviews")}</p>
              )}
              {clubReviews.map((r) => (
                <div key={r.id} className="ca-tile p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                        {initialsOf(r.authorName || "—")}
                      </span>
                      <div>
                        <p className="text-sm font-extrabold">{r.authorName || "—"}</p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {r.createdAt}
                        </p>
                      </div>
                    </div>
                    <Stars value={r.rating} size="size-3.5" />
                  </div>
                  <p className="mt-2.5 text-sm font-medium leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Booking */}
        <BookingCard club={club} />
      </div>
    </div>
  );
}

function ReviewForm({ club }: { club: Club }) {
  const { addReview } = useStore();
  const { user, role } = useAuth();
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  if (!user || role !== "player") {
    return (
      <p className="mt-3 text-sm font-semibold text-muted-foreground">{t("club.reviewSignin")}</p>
    );
  }

  return (
    <div className="ca-tile mt-3 p-4">
      <p className="text-sm font-extrabold">{t("club.reviewAdd")}</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i}`}>
            <Star
              className={cn(
                "size-7 transition-colors",
                i <= rating ? "fill-star text-star" : "text-muted-foreground/25 hover:text-star",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("club.reviewPh")}
        className="mt-3 bg-card"
        rows={3}
      />
      <Button
        className="mt-3"
        disabled={!text.trim()}
        onClick={() => {
          addReview(club.id, rating, text.trim());
          setText("");
          setRating(5);
          toast.success(t("club.reviewDone"));
        }}
      >
        {t("club.reviewSend")}
      </Button>
    </div>
  );
}

function BookingCard({ club }: { club: Club }) {
  const { activeSubFor, usedHoursOn, bookSlot } = useStore();
  const { user, role } = useAuth();
  const { t, locale } = useI18n();
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState<string | null>(null);
  const [hours, setHours] = useState(2);
  const [zone, setZone] = useState<Zone>("standard");
  const [seat, setSeat] = useState<number | null>(null);
  const [done, setDone] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const isPlayer = !!user && role === "player";
  const sub = isPlayer && user ? activeSubFor(user.id) : undefined;
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === sub?.planId);
  const cap = plan?.dailyCap ?? 5;

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const label =
          i === 0
            ? t("club.today")
            : i === 1
              ? t("club.tomorrow")
              : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
        return {
          value: dateValue(d),
          label,
          day: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d),
        };
      }),
    [locale, t],
  );

  const slots = useMemo(() => {
    const startHour = club.openFrom === "00:00" ? 0 : Number.parseInt(club.openFrom, 10);
    const endRaw =
      club.openTo === "24:00" || club.openTo === "00:00" ? 24 : Number.parseInt(club.openTo, 10);
    const endHour = endRaw <= startHour ? 24 : endRaw;
    const nowHour = new Date().getHours();
    return Array.from({ length: Math.max(0, endHour - startHour) }, (_, i) => startHour + i)
      .filter((h) => date !== todayStr() || h > nowHour)
      .map((h) => `${String(h).padStart(2, "0")}:00`);
  }, [club.openFrom, club.openTo, date]);

  const usedToday = isPlayer && user ? usedHoursOn(user.id, date) : 0;
  const maxHours = Math.max(1, Math.min(5, cap - usedToday));
  const effectiveHours = Math.min(hours, maxHours);
  const hoursLeftAfter = sub && sub.hoursLeft !== null ? sub.hoursLeft - effectiveHours : null;

  const book = async () => {
    if (!time) return;
    setBusy(true);
    const res = await bookSlot({
      clubId: club.id,
      date,
      startTime: time,
      hours: effectiveHours,
      zone,
      seat,
    });
    setBusy(false);
    if (res.ok) {
      setDone(res.booking);
    } else if (res.error === "dailyCap") {
      toast.error(t("club.err.cap", { cap }));
    } else if (res.error === "notEnoughHours") {
      toast.error(t("club.err.hours"));
    } else if (res.error === "noSub") {
      toast.error(t("club.err.noSub"));
    } else {
      toast.error(t("passes.buyError"));
    }
  };

  return (
    <aside className="ca-card h-fit p-4 sm:p-5 lg:sticky lg:top-20">
      {done ? (
        <div className="ca-rise text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-lime text-lime-foreground">
            <Check className="size-7" />
          </span>
          <h2 className="font-display mt-4 text-xl font-extrabold">{t("club.confirmTitle")}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{t("club.qrHint")}</p>

          <div className="ca-tile mt-5 p-5">
            <div className="mx-auto w-fit rounded-2xl bg-white p-3">
              <QRCodeSVG
                value={`hotshot:${done.code}`}
                size={148}
                bgColor="#ffffff"
                fgColor="#0b1437"
                level="M"
              />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("club.code")}
            </p>
            <p className="font-display mt-1 text-4xl font-extrabold tracking-[0.18em] text-primary">
              {done.code}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {club.name} · {done.date} · {done.startTime} · {done.hours}
              {t("club.hShort")}
              {done.seat !== null ? ` · ${t("seats.pc")} ${done.seat}` : ""}
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(done.code);
                toast.success(t("club.copied"));
              }}
            >
              <Copy className="size-4" /> {t("club.copy")}
            </Button>
            <Button asChild variant="lime">
              <Link to="/profile" search={{ tab: "session" }}>
                {t("nav.session")}
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setDone(null)}>
              {t("club.bookAnother")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="font-display text-lg font-extrabold">{t("club.book.title")}</h2>

          {!isPlayer ? (
            <div className="ca-tile mt-4 p-4 text-sm font-semibold text-muted-foreground">
              {t("club.signinToBook")}
              <Button asChild className="mt-3 w-full">
                <Link to="/auth">{t("auth.signin")}</Link>
              </Button>
            </div>
          ) : !sub ? (
            <div className="ca-tile mt-4 p-4 text-sm font-semibold text-muted-foreground">
              {t("club.noSub")}
              <Button asChild variant="lime" className="mt-3 w-full">
                <Link to="/passes">{t("club.buySub")}</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-secondary px-3.5 py-2.5 text-xs">
                <span className="font-extrabold text-primary">
                  {t(`plan.${sub.planId}.name`)} · {sub.hoursLeft === null ? "∞" : sub.hoursLeft}{" "}
                  {t("club.subLeft")}
                </span>
                <span className="font-semibold text-muted-foreground">
                  {t("club.capNote", { cap })}
                </span>
              </div>

              {/* Date */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-extrabold">{t("club.selectDate")}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {t("club.dateHint")}
                  </p>
                </div>
                <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-5 sm:px-5">
                  {days.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => {
                        setDate(d.value);
                        setTime(null);
                        setSeat(null);
                      }}
                      className={cn(
                        "ca-chip flex-col items-start gap-0 rounded-2xl px-3.5 py-2 capitalize",
                        date === d.value && "ca-chip-active",
                      )}
                    >
                      <span className="text-[13px]">{d.label}</span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          date === d.value ? "text-white/80" : "text-muted-foreground",
                        )}
                      >
                        {d.day}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time grid */}
              <div>
                <p className="mb-2 text-sm font-extrabold">{t("club.selectTime")}</p>
                {slots.length === 0 ? (
                  <p className="ca-tile p-3 text-xs font-semibold text-muted-foreground">
                    {t("club.noSlots")}
                  </p>
                ) : (
                  <div className="grid grid-cols-5 gap-1.5">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setTime(s);
                          setSeat(null);
                        }}
                        className={cn("ca-slot", time === s && "ca-slot-active")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <p className="mb-2 text-sm font-extrabold">{t("club.duration")}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((h) => {
                    const disabled = h > maxHours;
                    return (
                      <button
                        key={h}
                        disabled={disabled}
                        onClick={() => setHours(h)}
                        className={cn(
                          "ca-slot py-2.5",
                          effectiveHours === h && "ca-slot-active",
                          disabled && "ca-slot-disabled",
                        )}
                      >
                        {h}
                        {t("club.hShort")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seats */}
              <SeatPicker
                club={club}
                date={date}
                startTime={time}
                hours={effectiveHours}
                zone={zone}
                seat={seat}
                onZoneChange={setZone}
                onSeatChange={setSeat}
              />

              {/* Summary */}
              <div className="ca-tile flex items-center justify-between p-3.5">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">{t("club.total")}</p>
                  <p className="font-display text-lg font-extrabold tabular">
                    {effectiveHours}
                    {t("club.hShort")}
                    <span className="ml-2 text-xs font-semibold text-muted-foreground">
                      {days.find((d) => d.value === date)?.day} {time ?? "—"}
                      {seat !== null ? ` · ${t("seats.pc")} ${seat}` : ""}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {t("passes.perHour")}
                  </p>
                  <p className="text-sm font-extrabold">{kzt(zonePrice(club, zone))}</p>
                </div>
              </div>

              {hoursLeftAfter !== null && (
                <p className="-mt-3 text-right text-[11px] font-semibold text-muted-foreground">
                  → <b className="text-foreground tabular">{hoursLeftAfter}</b>
                  {t("club.hShort")} {t("club.subLeft")}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                variant="lime"
                disabled={!time || busy}
                onClick={book}
              >
                <Users className="size-4" /> {t("club.pay")}
              </Button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
