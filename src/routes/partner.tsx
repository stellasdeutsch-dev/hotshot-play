import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarClock,
  Clock,
  Gift,
  LayoutDashboard,
  Settings,
  Star,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { kzt, last7Days } from "@/lib/mock-db";
import {
  addClubStaff,
  listClubStaff,
  removeClubStaff,
  type StaffMember,
} from "@/lib/staff.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Кабинет владельца — HotShot Play" },
      {
        name: "description",
        content: "Финансы, отзывы и настройки клуба для владельца на HotShot Play.",
      },
      { property: "og:title", content: "HotShot Play — кабинет владельца клуба" },
      { property: "og:description", content: "Выручка, брони, отзывы и настройки клуба." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PartnerPage,
});

function PartnerPage() {
  return (
    <RequireRole roles={["owner"]}>
      <PartnerInner />
    </RequireRole>
  );
}

function PartnerInner() {
  const { user } = useAuth();
  const { clubs, bookings, reviews, updateClub, reloadClubs } = useStore();
  const { t } = useI18n();

  const club = clubs.find((c) => c.ownerId === user?.id);
  const [form, setForm] = useState(() => ({
    name: club?.name ?? "",
    address: club?.address ?? "",
    phone: club?.phone ?? "",
    pricePerHour: club?.pricePerHour ?? 0,
    totalSeats: club?.totalSeats ?? 0,
    openFrom: club?.openFrom ?? "10:00",
    openTo: club?.openTo ?? "02:00",
    cover: club?.cover ?? "",
    specs: club?.specs ?? "",
    description: club?.description ?? "",
  }));

  useEffect(() => {
    if (!club) return;
    setForm({
      name: club.name,
      address: club.address,
      phone: club.phone,
      pricePerHour: club.pricePerHour,
      totalSeats: club.totalSeats,
      openFrom: club.openFrom,
      openTo: club.openTo,
      cover: club.cover,
      specs: club.specs,
      description: club.description,
    });
  }, [club?.id]);

  if (!club) {
    return (
      <div className="neon-panel mx-auto max-w-md p-8 text-center">
        <Clock className="mx-auto size-6 text-primary" />
        <h1 className="mt-3 text-lg font-bold">{t("club.pendingTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("club.pendingText")}</p>
      </div>
    );
  }

  const clubBookings = bookings.filter((b) => b.clubId === club.id && b.status !== "cancelled");
  const clubReviews = reviews.filter((r) => r.clubId === club.id);
  const days = last7Days();
  const series = days.map((d) => {
    const list = clubBookings.filter((b) => b.date === d);
    return {
      day: d.slice(5),
      revenue: list.reduce((sum, b) => sum + b.hours * club.pricePerHour, 0),
      bookings: list.length,
    };
  });
  const revenue7d = series.reduce((sum, d) => sum + d.revenue, 0);
  const bookings7d = series.reduce((sum, d) => sum + d.bookings, 0);
  const month = new Date().toISOString().slice(0, 7);
  const revenueMonth = clubBookings
    .filter((b) => b.date.startsWith(month))
    .reduce((sum, b) => sum + b.hours * club.pricePerHour, 0);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({
        ...f,
        [k]: k === "pricePerHour" || k === "totalSeats" ? Number(e.target.value) : e.target.value,
      }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display flex flex-wrap items-center gap-2 text-2xl font-extrabold">
          <span className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-primary">
            <LayoutDashboard className="size-5" />
          </span>
          {t("partner.title")}
          <span className="text-primary">· {club.name}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("partner.subtitle")}</p>
      </div>

      {club.status !== "active" && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
          <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="font-semibold">
              {club.status === "rejected" ? t("club.rejectedTitle") : t("club.pendingTitle")}
            </p>
            <p className="text-muted-foreground">
              {club.status === "rejected"
                ? t("club.rejectedText", { reason: club.rejectionReason ?? "—" })
                : t("club.pendingText")}
            </p>
            {club.status === "rejected" && (
              <Button
                size="sm"
                onClick={async () => {
                  await supabase.rpc("resubmit_club", { _club_id: club.id });
                  await reloadClubs();
                  toast.success(t("club.resubmitted"));
                }}
              >
                {t("club.resubmit")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
        <Gift className="mt-0.5 size-5 shrink-0 text-accent" />
        <p>{t("partner.free")}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("partner.tab.overview")}</TabsTrigger>
          <TabsTrigger value="reviews">
            {t("partner.tab.reviews")} ({clubReviews.length})
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="size-4" /> {t("partner.tab.staff")}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" /> {t("partner.tab.settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Wallet, label: t("partner.kpi.revenue"), value: kzt(revenue7d) },
              { icon: CalendarClock, label: t("partner.kpi.bookings"), value: String(bookings7d) },
              { icon: Wallet, label: t("partner.kpi.month"), value: kzt(revenueMonth) },
              { icon: Star, label: t("partner.kpi.rating"), value: club.rating.toFixed(1) },
              {
                icon: LayoutDashboard,
                label: t("partner.kpi.seats"),
                value: String(club.totalSeats),
              },
            ].map((kpi) => (
              <div key={kpi.label} className="neon-panel p-4">
                <kpi.icon className="size-5 text-primary" />
                <p className="font-display mt-2 text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="neon-panel p-5">
            <p className="text-sm font-semibold">{t("partner.chart")}</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value) => [kzt(Number(value)), t("partner.kpi.revenue")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    fill="url(#rev)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {clubBookings.length} {t("partner.kpi.bookings").toLowerCase()} · {club.address}
          </p>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {clubReviews.length === 0 && (
            <p className="neon-panel p-8 text-center text-sm text-muted-foreground">
              {t("partner.noReviews")}
            </p>
          )}
          {clubReviews.map((r) => (
            <div key={r.id} className="neon-panel flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/20 text-xs font-bold">
                {(r.authorName || "—").slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.authorName || "—"}</p>
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40",
                        )}
                      />
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{r.createdAt}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <StaffManager clubId={club.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="neon-panel max-w-2xl space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("partner.clubName")}</Label>
                <Input value={form.name} onChange={set("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("partner.phone")}</Label>
                <Input value={form.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("partner.address")}</Label>
                <Input value={form.address} onChange={set("address")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("partner.price")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={form.pricePerHour}
                  onChange={set("pricePerHour")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("partner.seats")}</Label>
                <Input type="number" min={1} value={form.totalSeats} onChange={set("totalSeats")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("partner.opens")}</Label>
                <Input value={form.openFrom} onChange={set("openFrom")} placeholder="10:00" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("partner.closes")}</Label>
                <Input value={form.openTo} onChange={set("openTo")} placeholder="02:00" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("partner.cover")}</Label>
                <Input
                  value={form.cover}
                  onChange={set("cover")}
                  placeholder="https://…/photo.jpg"
                />
                <p className="text-[11px] text-muted-foreground">{t("partner.coverHint")}</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("partner.specs")}</Label>
                <Input
                  value={form.specs}
                  onChange={set("specs")}
                  placeholder="RTX 4070 · i7 · 32 GB · 240 Hz"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("partner.desc")}</Label>
                <Textarea value={form.description} onChange={set("description")} rows={4} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  updateClub(club.id, form);
                  toast.success(t("partner.saved"));
                }}
              >
                {t("partner.save")}
              </Button>
              {club.status === "active" && (
                <Button asChild variant="secondary">
                  <Link to="/clubs/$clubId" params={{ clubId: club.id }}>
                    {t("partner.preview")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffManager({ clubId }: { clubId: string }) {
  const { t } = useI18n();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setStaff(await listClubStaff({ data: { clubId } }));
    } catch {
      setStaff([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  return (
    <div className="neon-panel max-w-2xl space-y-4 p-5 sm:p-6">
      <p className="text-sm text-muted-foreground">{t("partner.staffHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          type="email"
          value={email}
          placeholder="staff@example.kz"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          disabled={busy || !email.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await addClubStaff({ data: { clubId, email } });
              if (!res.ok) {
                toast.error(
                  res.error === "notFound" ? t("partner.staffNotFound") : t("partner.staffError"),
                );
              } else {
                setEmail("");
                toast.success(t("partner.staffAdded"));
                await load();
              }
            } catch {
              toast.error(t("partner.staffError"));
            }
            setBusy(false);
          }}
        >
          <UserPlus className="size-4" /> {t("partner.staffAdd")}
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("partner.staffEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {staff.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-primary/20 text-xs font-bold">
                {m.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await removeClubStaff({ data: { clubId, userId: m.userId } });
                  toast.success(t("partner.staffRemoved"));
                  await load();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
