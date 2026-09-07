import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { fetchThread } from "@/lib/chat-api";
import { pickCurrentBooking } from "@/lib/club-utils";
import type { ChatMessage } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/ChatPanel";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>): { club?: string } =>
    typeof s["club"] === "string" ? { club: s["club"] } : {},
  head: () => ({
    meta: [
      { title: "Чат с клубом — HeadShotPlay" },
      {
        name: "description",
        content: "Напишите администратору клуба: вопросы по броням, заказам и оборудованию.",
      },
      { property: "og:title", content: "HeadShotPlay — чат с клубом" },
      { property: "og:description", content: "Прямая связь с администратором зала." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <RequireRole roles={["player"]}>
      <ChatInner />
    </RequireRole>
  );
}

interface Preview {
  clubId: string;
  clubName: string;
  lastText: string;
  lastAt: string;
  unread: number;
}

function ChatInner() {
  const { club: clubParam } = Route.useSearch();
  const navigate = useNavigate();
  const { clubs, bookings } = useStore();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);

  const active = useMemo(() => clubs.filter((c) => c.status === "active"), [clubs]);
  const suggested = user
    ? pickCurrentBooking(bookings.filter((b) => b.userId === user.id))?.clubId
    : undefined;
  const selectedId = clubParam ?? suggested ?? previews[0]?.clubId ?? null;
  const selected = active.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    void Promise.all(
      active.map(async (c) => {
        const thread: ChatMessage[] = await fetchThread(c.id, user.id);
        const last = thread[thread.length - 1];
        if (!last) return null;
        return {
          clubId: c.id,
          clubName: c.name,
          lastText: last.text,
          lastAt: last.createdAt,
          unread: thread.filter((m) => m.sender === "club" && !m.readAt).length,
        } satisfies Preview;
      }),
    ).then((rows) => {
      if (!alive) return;
      setPreviews(
        rows
          .filter((r): r is Preview => r !== null)
          .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
      );
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // reload when the visible thread changes so the preview list stays fresh
  }, [user, active, selectedId]);

  if (!user) return null;

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display flex items-center gap-2.5 text-3xl font-extrabold">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <MessageCircle className="size-5" />
          </span>
          {t("chat.title")}
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">{t("chat.subtitle")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Threads + club picker */}
        <aside className={cn("space-y-3", selected && "hidden lg:block")}>
          <p className="text-xs font-bold text-muted-foreground">{t("chat.threads")}</p>
          {loading ? (
            <div className="ca-card h-24 animate-pulse" />
          ) : previews.length === 0 ? (
            <p className="ca-card p-5 text-sm font-semibold text-muted-foreground">
              {t("chat.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {previews.map((p) => (
                <button
                  key={p.clubId}
                  onClick={() => navigate({ to: "/chat", search: { club: p.clubId } })}
                  className={cn(
                    "ca-card flex w-full items-center gap-3 p-3.5 text-left transition-colors",
                    selectedId === p.clubId && "ring-2 ring-primary",
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                    {p.clubName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-extrabold">{p.clubName}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                        {time(p.lastAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-muted-foreground">
                        {p.lastText}
                      </span>
                      {p.unread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-lime text-[10px] font-extrabold text-lime-foreground">
                          {p.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="pt-2 text-xs font-bold text-muted-foreground">{t("chat.newThread")}</p>
          <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {active.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ to: "/chat", search: { club: c.id } })}
                className={cn("ca-chip", selectedId === c.id && "ca-chip-active")}
              >
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        {selected ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => navigate({ to: "/chat", search: {} })}
            >
              <ChevronLeft className="size-4" /> {t("chat.threads")}
            </Button>
            <ChatPanel
              clubId={selected.id}
              clubName={selected.name}
              userId={user.id}
              me="player"
              authorName={user.name}
              className="h-[60vh] min-h-[420px] lg:h-[600px]"
            />
            <Link
              to="/clubs/$clubId"
              params={{ clubId: selected.id }}
              className="ca-card block p-3.5 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
            >
              {t("partner.preview")} →
            </Link>
          </div>
        ) : (
          <p className="ca-card grid place-items-center p-10 text-center text-sm font-semibold text-muted-foreground">
            {t("chat.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
