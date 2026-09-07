import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Star } from "lucide-react";
import { ClubCover } from "@/components/ClubCover";
import { useI18n } from "@/lib/i18n";
import { formatDistance, hoursLabel, isOpenNow } from "@/lib/club-utils";
import { kzt, type Club } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

/**
 * Reference-style club card: photo, name, hours, seat tiles, ★ rating and a
 * lime price pill. Used on the home list and as the map preview.
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
        className={cn(compact ? "h-32" : "h-40 sm:h-44")}
      >
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={cn(
              "ca-pill backdrop-blur",
              open ? "bg-lime/90 text-lime-foreground" : "bg-black/60 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                open ? "bg-lime-foreground/70" : "bg-muted-foreground",
              )}
            />
            {open ? t("home.openBadge") : t("home.closed")}
          </span>
          {distanceKm !== undefined && (
            <span className="ca-pill bg-black/60 text-foreground backdrop-blur">
              <MapPin className="size-3" /> {formatDistance(distanceKm)}
            </span>
          )}
        </div>
      </ClubCover>

      <div className="p-4">
        <h3 className="font-display truncate text-[17px] font-extrabold leading-tight">
          {club.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> {hoursLabel(club, t("home.open247"))}
          <span className="mx-1 opacity-40">·</span>
          <span className="truncate">{club.address}</span>
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.seats")}
              </p>
              <p className="font-display text-lg font-extrabold leading-none tabular">
                {club.totalSeats}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.reviews")}
              </p>
              <p className="font-display text-lg font-extrabold leading-none tabular">
                {club.reviewsCount}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="flex items-center gap-1 text-xs font-bold">
              <Star className="size-3.5 fill-star text-star" />{" "}
              {club.rating > 0 ? club.rating.toFixed(1) : "—"}
            </span>
            <span className="ca-pill ca-pill-lime">
              {t("home.from")} {kzt(club.pricePerHour)}/{t("club.hShort")}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  const cls = cn(
    "ca-card group block w-full overflow-hidden text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
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
