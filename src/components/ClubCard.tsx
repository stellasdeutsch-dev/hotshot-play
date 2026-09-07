import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Star, Users } from "lucide-react";
import { ClubCover } from "@/components/ClubCover";
import { useI18n } from "@/lib/i18n";
import { formatDistance, hoursLabel, isOpenNow } from "@/lib/club-utils";
import { kzt, type Club } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

/**
 * Club card: photo, name, hours, seat/review counters, ★ rating and a lime
 * price pill. Used on the home list and as the map preview.
 */
export function ClubCard({
  club,
  distanceKm,
  active,
  compact,
  onSelect,
  className,
}: {
  club: Club;
  distanceKm?: number;
  active?: boolean;
  compact?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const open = isOpenNow(club);

  const body = (
    <>
      <ClubCover
        cover={club.cover}
        alt={club.name}
        className={cn("rounded-[1.5rem]", compact ? "h-32" : "h-40 sm:h-44")}
      >
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={cn(
              "ca-pill",
              open ? "bg-lime text-lime-foreground" : "bg-white/85 on-image-muted",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                open ? "bg-lime-foreground/60" : "bg-[#5b6480]",
              )}
            />
            {open ? t("home.openBadge") : t("home.closed")}
          </span>
          {distanceKm !== undefined && (
            <span className="ca-pill on-image bg-white/85">
              <MapPin className="size-3" /> {formatDistance(distanceKm)}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="font-display truncate text-[17px] font-extrabold leading-tight text-white">
            {club.name}
          </h3>
          <span className="on-image flex shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-extrabold">
            <Star className="size-3.5 fill-star text-star" />{" "}
            {club.rating > 0 ? club.rating.toFixed(1) : "—"}
          </span>
        </div>
      </ClubCover>

      <div className="p-4 pt-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="size-3.5 shrink-0" /> {hoursLabel(club, t("home.open247"))}
          <span className="opacity-40">·</span>
          <span className="truncate">{club.address}</span>
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <span className="ca-pill ca-pill-dark">
              <Users className="size-3" /> {club.totalSeats} {t("home.seats")}
            </span>
            {club.vipSeats > 0 && <span className="ca-pill ca-pill-soft">VIP {club.vipSeats}</span>}
          </div>
          <span className="ca-pill ca-pill-lime">
            {t("home.from")} {kzt(club.pricePerHour)}/{t("club.hShort")}
          </span>
        </div>
      </div>
    </>
  );

  const cls = cn(
    "ca-card group block w-full overflow-hidden p-1.5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-1",
    active && "ring-2 ring-primary",
    className,
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(club.id)} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <Link to="/clubs/$clubId" params={{ clubId: club.id }} className={cls}>
      {body}
    </Link>
  );
}
