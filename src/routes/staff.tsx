import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Check, ClipboardCheck, Flag, MessageCircle, ScanLine, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { kzt, todayStr, type Booking, type BookingStatus, type Order } from "@/lib/mock-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireRole } from "@/components/RequireRole";
import { ChatPanel } from "@/components/ChatPanel";
import { fetchClubOrders, updateOrderStatus } from "@/lib/shop-api";
import { fetchClubThreads, type ChatThread } from "@/lib/chat-api";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

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

const STATUS_VARIANT: Record<BookingStatus, "default" | "lime" | "muted" | "destructive"> = {
  upcoming: "default",
  active: "lime",
  completed: "muted",
  cancelled: "destructive",
};

const ORDER_VARIANT: Record<Order["status"], "default" | "lime" | "muted" | "destructive"> = {
  pending: "default",
  preparing: "lime",
  delivered: "muted",
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
      <p className="ca-card p-8 text-center text-sm text-muted-foreground">{t("staff.empty")}</p>
    ) : (
      <div className="ca-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-extrabold text-primary">
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
      <section className="ca-card p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="size-4 text-primary" /> {t("staff.verify")}
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
          <div className="ca-tile mt-4 flex flex-wrap items-center gap-4 p-4">
            <span className="rounded-full bg-secondary px-3 py-1.5 font-mono text-sm font-extrabold text-primary">
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
          <TabsTrigger value="orders">
            <ShoppingBag /> {t("staff.tab.orders")}
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageCircle /> {t("staff.tab.chat")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          {table(todayList)}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          {table(upcomingList)}
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          {club && <OrdersTab clubId={club.id} />}
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          {club && (
            <ClubChatTab
              clubId={club.id}
              clubName={club.name}
              staffName={user?.name ?? ""}
              staffId={user?.id ?? ""}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ Orders ------------------------------ */

function OrdersTab({ clubId }: { clubId: string }) {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setOrders(await fetchClubOrders(clubId));
  }, [clubId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const act = async (order: Order, status: Order["status"]) => {
    setBusy(order.id);
    await updateOrderStatus(order, status);
    setBusy(null);
    await load();
  };

  const open = orders.filter((o) => o.status === "pending" || o.status === "preparing");
  const past = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  if (orders.length === 0) {
    return (
      <p className="ca-card p-8 text-center text-sm font-semibold text-muted-foreground">
        {t("staff.ordersEmpty")}
      </p>
    );
  }

  const row = (o: Order) => (
    <div key={o.id} className="ca-card flex flex-wrap items-center gap-3 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
        <ShoppingBag className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">
          {o.playerName || "—"} · <span className="text-primary">{o.code}</span>
          {o.seat !== null && (
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold">
              {t("staff.seat")} {o.seat}
            </span>
          )}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
        </p>
        {o.comment && (
          <p className="mt-0.5 text-xs font-medium italic text-muted-foreground">“{o.comment}”</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-display text-sm font-extrabold tabular">{kzt(o.totalKzt)}</p>
        <Badge variant={ORDER_VARIANT[o.status]}>{t(`order.status.${o.status}`)}</Badge>
      </div>
      <div className="flex gap-2">
        {o.status === "pending" && (
          <Button size="sm" disabled={busy === o.id} onClick={() => void act(o, "preparing")}>
            {t("order.toPreparing")}
          </Button>
        )}
        {o.status === "preparing" && (
          <Button
            size="sm"
            variant="lime"
            disabled={busy === o.id}
            onClick={() => void act(o, "delivered")}
          >
            {t("order.toDelivered")}
          </Button>
        )}
        {(o.status === "pending" || o.status === "preparing") && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === o.id}
            onClick={() => void act(o, "cancelled")}
          >
            {t("order.cancel")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">{open.map(row)}</div>
      {past.length > 0 && (
        <div className={cn("space-y-2", open.length > 0 && "opacity-70")}>
          <p className="text-xs font-bold text-muted-foreground">
            {t("adminPay.noHistory").replace("—", "")}
          </p>
          {past.slice(0, 10).map(row)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Chat ------------------------------ */

function ClubChatTab({
  clubId,
  clubName,
  staffName,
  staffId,
}: {
  clubId: string;
  clubName: string;
  staffName: string;
  staffId: string;
}) {
  const { t, locale } = useI18n();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await fetchClubThreads(clubId, staffId);
    setThreads(list);
    setActive((cur) => cur ?? list[0]?.userId ?? null);
  }, [clubId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  if (threads.length === 0) {
    return (
      <p className="ca-card p-8 text-center text-sm font-semibold text-muted-foreground">
        {t("chat.staffEmpty")}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        {threads.map((th) => (
          <button
            key={th.userId}
            onClick={() => setActive(th.userId)}
            className={cn(
              "ca-card flex w-full items-center gap-3 p-3.5 text-left",
              active === th.userId && "ring-2 ring-primary",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
              {(th.authorName || t("chat.guest")).slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold">
                  {th.authorName || t("chat.guest")}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                  {time(th.lastAt)}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {th.lastText}
                </span>
                {th.unread > 0 && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-lime text-[10px] font-extrabold text-lime-foreground">
                    {th.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
      {active && (
        <ChatPanel
          clubId={clubId}
          clubName={clubName}
          userId={active}
          me="club"
          authorName={staffName || t("chat.admin")}
          className="h-[60vh] min-h-[420px]"
        />
      )}
    </div>
  );
}
