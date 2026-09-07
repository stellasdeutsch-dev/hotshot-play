import { useEffect, useState } from "react";
import { bookingWindow, formatCountdown, sessionPhase } from "@/lib/club-utils";
import { useI18n } from "@/lib/i18n";
import type { Booking } from "@/lib/mock-db";
import { cn } from "@/lib/utils";

/**
 * Circular countdown in the "PC 27 · Оставшееся время" style.
 * Live session → remaining time and progress of the booked hours.
 * Upcoming session → countdown to the start.
 */
export function SessionRing({
  booking,
  size = 220,
  className,
}: {
  booking: Booking;
  size?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { start, end } = bookingWindow(booking);
  const phase = sessionPhase(booking, now);
  const total = end.getTime() - start.getTime();
  const remaining =
    phase === "live" ? end.getTime() - now.getTime() : start.getTime() - now.getTime();
  const progress =
    phase === "live" ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total)) : 0;

  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - progress);
  const tone = phase === "live" ? "var(--blue)" : "var(--lime)";

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-2)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={phase === "live" ? dash : c * 0.02}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {phase === "live"
              ? t("session.remaining")
              : phase === "upcoming"
                ? t("session.startsIn")
                : t("session.ended")}
          </p>
          <p className="font-display mt-1 text-4xl font-extrabold tabular tracking-tight">
            {phase === "past" ? "00:00" : formatCountdown(remaining)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {booking.startTime} · {booking.hours}
            {t("club.hShort")}
          </p>
        </div>
      </div>
    </div>
  );
}
