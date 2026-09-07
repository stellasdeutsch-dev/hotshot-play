import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DEMO_CHAT_REPLIES, isDemoClub, localId, readLocal, writeLocal } from "./demo-data";
import { isDemoUserId } from "./demo-user";
import type { ChatMessage, ChatSender } from "./mock-db";

type Row = Database["public"]["Tables"]["chat_messages"]["Row"];

const toMessage = (r: Row): ChatMessage => ({
  id: r.id,
  clubId: r.club_id,
  userId: r.user_id,
  sender: r.sender as ChatSender,
  authorName: r.author_name,
  text: r.text,
  createdAt: r.created_at,
  readAt: r.read_at,
});

export interface ChatThread {
  clubId: string;
  userId: string;
  authorName: string;
  lastText: string;
  lastAt: string;
  unread: number;
}

/* ------------------------------ demo (localStorage) ------------------------------ */

/** Local storage is used for demo clubs and for local demo identities. */
const isLocalThread = (clubId: string, userId: string) =>
  isDemoClub(clubId) || isDemoUserId(userId);

const demoKey = (clubId: string, userId: string) => `hsp-demo-chat:${clubId}:${userId}`;
const demoBus = typeof window !== "undefined" ? new EventTarget() : null;

function demoAppend(clubId: string, userId: string, msg: ChatMessage) {
  const key = demoKey(clubId, userId);
  writeLocal(key, [...readLocal<ChatMessage[]>(key, []), msg]);
  demoBus?.dispatchEvent(new CustomEvent("message", { detail: msg }));
}

/* ------------------------------ public API ------------------------------ */

export async function fetchThread(clubId: string, userId: string): Promise<ChatMessage[]> {
  if (isLocalThread(clubId, userId)) return readLocal<ChatMessage[]>(demoKey(clubId, userId), []);
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchThread", error);
    return [];
  }
  return (data ?? []).map(toMessage);
}

export async function sendMessage(input: {
  clubId: string;
  userId: string;
  sender: ChatSender;
  authorName: string;
  text: string;
}): Promise<ChatMessage | null> {
  const text = input.text.trim();
  if (!text) return null;

  if (isLocalThread(input.clubId, input.userId)) {
    const msg: ChatMessage = {
      id: localId(),
      clubId: input.clubId,
      userId: input.userId,
      sender: input.sender,
      authorName: input.authorName,
      text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    demoAppend(input.clubId, input.userId, msg);
    if (input.sender === "player") {
      const reply = DEMO_CHAT_REPLIES[Math.floor(Math.random() * DEMO_CHAT_REPLIES.length)] ?? "Ок";
      window.setTimeout(
        () =>
          demoAppend(input.clubId, input.userId, {
            id: localId(),
            clubId: input.clubId,
            userId: input.userId,
            sender: "club",
            authorName: "Администратор",
            text: reply,
            createdAt: new Date().toISOString(),
            readAt: null,
          }),
        1400,
      );
    }
    return msg;
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      club_id: input.clubId,
      user_id: input.userId,
      sender: input.sender,
      author_name: input.authorName,
      text,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("sendMessage", error);
    return null;
  }
  return toMessage(data);
}

/** Live updates for one thread. Returns an unsubscribe function. */
export function subscribeThread(
  clubId: string,
  userId: string,
  onMessage: (m: ChatMessage) => void,
) {
  if (isLocalThread(clubId, userId)) {
    const handler = (e: Event) => {
      const m = (e as CustomEvent<ChatMessage>).detail;
      if (m.clubId === clubId && m.userId === userId) onMessage(m);
    };
    demoBus?.addEventListener("message", handler);
    return () => demoBus?.removeEventListener("message", handler);
  }
  const channel = supabase
    .channel(`chat:${clubId}:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as Row;
        if (row.club_id === clubId) onMessage(toMessage(row));
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Threads of a club for staff: one row per player, newest first. */
export async function fetchClubThreads(
  clubId: string,
  staffUserId?: string,
): Promise<ChatThread[]> {
  let rows: ChatMessage[] = [];
  if (isDemoClub(clubId) || isDemoUserId(staffUserId ?? "")) {
    if (typeof window !== "undefined") {
      const prefix = `hsp-demo-chat:${clubId}:`;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(prefix)) rows.push(...readLocal<ChatMessage[]>(k, []));
      }
    }
  } else {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("fetchClubThreads", error);
      return [];
    }
    rows = (data ?? []).map(toMessage);
  }
  const threads = new Map<string, ChatThread>();
  for (const m of rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const t = threads.get(m.userId);
    if (!t) {
      threads.set(m.userId, {
        clubId,
        userId: m.userId,
        authorName: m.sender === "player" ? m.authorName : "",
        lastText: m.text,
        lastAt: m.createdAt,
        unread: m.sender === "player" && !m.readAt ? 1 : 0,
      });
    } else {
      if (!t.authorName && m.sender === "player") t.authorName = m.authorName;
      if (m.sender === "player" && !m.readAt) t.unread += 1;
    }
  }
  return [...threads.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Marks messages from the other side as read. */
export async function markThreadRead(clubId: string, userId: string, me: ChatSender) {
  const other: ChatSender = me === "player" ? "club" : "player";
  if (isLocalThread(clubId, userId)) {
    const key = demoKey(clubId, userId);
    const now = new Date().toISOString();
    writeLocal(
      key,
      readLocal<ChatMessage[]>(key, []).map((m) =>
        m.sender === other && !m.readAt ? { ...m, readAt: now } : m,
      ),
    );
    return;
  }
  await supabase
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("sender", other)
    .is("read_at", null);
}

/** Unread count across the player's threads (for the nav badge). */
export async function fetchUnreadForPlayer(userId: string, demoClubIds: string[]): Promise<number> {
  let count = 0;
  for (const clubId of demoClubIds) {
    count += readLocal<ChatMessage[]>(demoKey(clubId, userId), []).filter(
      (m) => m.sender === "club" && !m.readAt,
    ).length;
  }
  // Demo identities have no Supabase session — everything they wrote is local.
  if (isDemoUserId(userId)) return count;
  const { count: dbCount } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sender", "club")
    .is("read_at", null);
  return count + (dbCount ?? 0);
}
