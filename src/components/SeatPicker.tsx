import { useEffect, useState } from "react";
import { Loader2, Monitor } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fetchOccupiedSeats, zonePrice, zoneSeats } from "@/lib/seats-api";
import { kzt, ZONES, type Club, type Zone } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

/**
 * Zone switch + seat grid for a booking slot. Occupied seats come from the
 * database (or a deterministic demo pattern for demo clubs).
 */
export function SeatPicker({
  club,
  date,
  startTime,
  hours,
  zone,
  seat,
  onZoneChange,
  onSeatChange,
}: {
  club: Club;
  date: string;
  startTime: string | null;
  hours: number;
  zone: Zone;
  seat: number | null;
  onZoneChange: (z: Zone) => void;
  onSeatChange: (s: number | null) => void;
}) {
  const { t } = useI18n();
  const [occupied, setOccupied] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startTime) {
      setOccupied([]);
      return;
    }
    let alive = true;
    setLoading(true);
    void fetchOccupiedSeats(club, date, startTime, hours).then((list) => {
      if (!alive) return;
      setOccupied(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [club, date, startTime, hours]);

  const seats = zoneSeats(club, zone);
  const busy = new Set(occupied);
  const freeCount = seats.filter((s) => !busy.has(s)).length;
  const hasVip = club.vipSeats > 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold">{t("seats.pick")}</p>
        <p className="text-[11px] font-semibold text-muted-foreground">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            `${freeCount} ${t("seats.free")}`
          )}
        </p>
      </div>

      {hasVip && (
        <div className="mb-3 flex gap-1.5">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => {
                onZoneChange(z);
                onSeatChange(null);
              }}
              className={cn("ca-chip flex-1 justify-center", zone === z && "ca-chip-active")}
            >
              {t(`seats.${z}`)}
              <span
                className={cn(
                  "text-[11px] font-bold",
                  zone === z ? "text-white/75" : "text-muted-foreground",
                )}
              >
                {kzt(zonePrice(club, z))}
              </span>
            </button>
          ))}
        </div>
      )}

      {!startTime ? (
        <p className="ca-tile p-3 text-xs font-semibold text-muted-foreground">
          {t("club.selectTime")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {seats.map((s) => {
              const isBusy = busy.has(s);
              return (
                <button
                  key={s}
                  disabled={isBusy}
                  onClick={() => onSeatChange(seat === s ? null : s)}
                  aria-label={`${t("seats.pc")} ${s}`}
                  className={cn(
                    "ca-slot py-2 text-xs",
                    isBusy && "ca-slot-disabled line-through",
                    seat === s && "ca-slot-active",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-md bg-secondary" /> {t("seats.legendFree")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-md bg-secondary opacity-40" /> {t("seats.legendBusy")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-md bg-primary" /> {t("seats.legendYours")}
            </span>
            <button
              onClick={() => onSeatChange(null)}
              className="ml-auto font-bold text-primary hover:underline"
            >
              {t("seats.any")}
            </button>
          </div>

          {seat !== null && (
            <p className="ca-tile mt-3 flex items-center gap-2 p-3 text-sm font-bold">
              <Monitor className="size-4 text-primary" /> {t("seats.yourPc")}: {t("seats.pc")}{" "}
              {seat}
            </p>
          )}
        </>
      )}
    </div>
  );
}
