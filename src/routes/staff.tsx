import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardCheck, ScanLine, Check, Flag } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { todayStr, type Booking, type BookingStatus } from "@/lib/mock-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Брони клуба — HotShot Play" },
      { name: "description", content: "Входящие брони и отметка гостей по коду для админа клуба." },
      { property: "og:title", content: "HotShot Play — брони клуба" },
      { property: "og:description", content: "Проверка кодов HP-XXXX и check-in гостей." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: StaffPage,
});

const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline" | "destructive"> = {
  upcoming: "default",
  active: "secondary",
  completed: "outline",
  cancelled: "destructive",
};

function StaffPage() {
  return (
    <RequireRole roles={["clubAdmin"]}>
      <StaffInner />
    </RequireRole>
  );
}

function StaffInner() {
  const { user } = useAuth();
  const { clubs, bookings, checkInBooking, completeBooking, findBookingByCode } = useStore();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Booking | null | "none">(null);

  const club = clubs.find((c) => c.id === user?.clubId);
  const clubBookings = bookings
    .filter((b) => b.clubId === club?.id && b.status !== "cancelled")
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const todayList = clubBookings.filter((b) => b.date === todayStr());
  const upcomingList = clubBookings.filter((b) => b.date > todayStr());

  const verify = () => {
    const b = findBookingByCode(code);
    setFound(b && b.clubId === club?.id ? b : "none");
  };

  const action = (b: Booking) =>
    b.status === "upcoming" ? (
      <Button
        size="sm"

        onClick={async () => {
          await checkInBooking(b.id);
          toast.success(`${b.code} · ${t("staff.checked")}`);
        }}
      >
        <Check className="size-4" /> {t("staff.checkin")}
      </Button>
    ) : b.status === "active" ? (
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await completeBooking(b.id);
          toast.success(`${b.code} · ${t("staff.completedToast")}`);
        }}
      >
        <Flag className="size-4" /> {t("staff.complete")}
      </Button>
    ) : null;

  const table = (list: Booking[]) =>
    list.length === 0 ? (
      <p className="neon-panel p-8 text-center text-sm text-muted-foreground">{t("staff.empty")}</p>
    ) : (
      <div className="neon-panel overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-3">{t("staff.col.guest")}</th>
              <th className="p-3">{t("staff.col.time")}</th>
              <th className="p-3">{t("staff.col.hours")}</th>
              <th className="p-3">{t("staff.col.code")}</th>
              <th className="p-3">{t("staff.col.status")}</th>
              <th className="p-3">{t("staff.col.action")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-medium">
                  {b.playerName || "—"}
                  {b.playerPhone && (
                    <span className="block text-xs text-muted-foreground">{b.playerPhone}</span>
                  )}
                </td>
                <td className="p-3 font-mono">{b.startTime}</td>
                <td className="p-3">
                  {b.hours}
                  {t("club.hShort")}
                </td>
                <td className="p-3">
                  <span className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                    {b.code}
                  </span>
                </td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[b.status]}>{t(`booking.${b.status}`)}</Badge>
                </td>
                <td className="p-3">{action(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex flex-wrap items-center gap-2 text-2xl font-extrabold">
          <span className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-primary">
            <ClipboardCheck className="size-5" />
          </span>{" "}
          {t("staff.title")}
          {club && <span className="text-primary">· {club.name}</span>}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("staff.subtitle")}</p>
      </div>

      {/* Code verification */}
      <section className="neon-panel p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="size-4 text-accent" /> {t("staff.verify")}
        </p>
        <div className="mt-3 flex max-w-sm gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("staff.verifyPh")}
            className="font-mono uppercase"
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          <Button onClick={verify} variant="secondary">
            {t("staff.find")}
          </Button>
        </div>
        {found === "none" && <p className="mt-3 text-sm text-destructive">{t("staff.notfound")}</p>}
        {found && found !== "none" && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/60 p-4">
            <span className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-mono text-sm font-bold text-primary">
              {found.code}
            </span>
            <div className="text-sm">
              <p className="font-semibold">{found.playerName || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {found.date} · {found.startTime} · {found.hours}
                {t("club.hShort")}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[found.status]}>{t(`booking.${found.status}`)}</Badge>
            {action(found)}
          </div>
        )}
      </section>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            {t("staff.today")} ({todayList.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {t("staff.upcoming")} ({upcomingList.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          {table(todayList)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          {table(upcomingList)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
