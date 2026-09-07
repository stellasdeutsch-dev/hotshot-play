import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { fetchThread, markThreadRead, sendMessage, subscribeThread } from "@/lib/chat-api";
import { isDemoClub } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import type { ChatMessage, ChatSender } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * One conversation between a player and a club. `me` decides which side is
 * rendered on the right and whose messages get marked as read.
 */
export function ChatPanel({
  clubId,
  clubName,
  userId,
  me,
  authorName,
  className,
}: {
  clubId: string;
  clubName: string;
  userId: string;
  me: ChatSender;
  authorName: string;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchThread(clubId, userId).then((list) => {
      if (!alive) return;
      setMessages(list);
      void markThreadRead(clubId, userId, me);
      window.setTimeout(scroll, 50);
    });
    const unsubscribe = subscribeThread(clubId, userId, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      window.setTimeout(scroll, 50);
      void markThreadRead(clubId, userId, me);
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [clubId, userId, me, scroll]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    const msg = await sendMessage({ clubId, userId, sender: me, authorName, text: value });
    setSending(false);
    if (msg) {
      setText("");
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      window.setTimeout(scroll, 50);
    }
  };

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className={cn("ca-card flex flex-col overflow-hidden", className)}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
          {clubName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{clubName}</p>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6f9b00]">
            <span className="size-1.5 rounded-full bg-[#8fd117]" /> {t("chat.online")}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm font-semibold text-muted-foreground">
            {t("chat.noMessages")}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm font-medium",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-secondary text-foreground",
                )}
              >
                {!mine && m.authorName && (
                  <p className="mb-0.5 text-[11px] font-extrabold text-primary">{m.authorName}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px] font-semibold",
                    mine ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {time(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {isDemoClub(clubId) && (
        <p className="px-4 pb-1 text-[11px] font-semibold text-muted-foreground">
          {t("chat.demoHint")}
        </p>
      )}

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !text.trim()}
          aria-label={t("chat.send")}
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
