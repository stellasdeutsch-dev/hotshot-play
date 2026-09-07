import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role, User } from "./mock-db";

export type DbRole = "player" | "club_admin" | "owner" | "admin";

const ROLE_FROM_DB: Record<DbRole, Role> = {
  player: "player",
  club_admin: "clubAdmin",
  owner: "owner",
  admin: "admin",
};

export interface ClubDraft {
  name: string;
  city: string;
  address: string;
  phone: string;
  openFrom: string;
  openTo: string;
  pricePerHour: number;
  totalSeats: number;
  specs: string;
  description: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

interface AuthValue {
  user: User | null;
  isAuthenticated: boolean;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  registerPlayer: (input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
  }) => Promise<AuthResult>;
  registerClub: (input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    club: ClubDraft;
  }) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  /** Sends a password-recovery email; the link returns the user to /auth?reset=1. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Sets a new password for the current (recovery) session. */
  updatePassword: (password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "HS";

const redirectUrl = () =>
  typeof window === "undefined" ? "" : `${window.location.origin}/auth?confirmed=1`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const draftHandled = useRef(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    const [{ data: profile }, { data: roles }, { data: staffRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
      supabase.from("club_staff").select("club_id").eq("user_id", s.user.id).limit(1),
    ]);
    const staffClubId = staffRows?.[0]?.club_id ?? null;

    const dbRoles = (roles ?? []).map((r) => r.role as DbRole);
    const priority: DbRole[] = ["admin", "owner", "club_admin", "player"];
    const dbRole = priority.find((r) => dbRoles.includes(r)) ?? "player";
    const name = profile?.name || (s.user.email ?? "").split("@")[0] || "Player";

    setUser({
      id: s.user.id,
      name,
      email: s.user.email ?? profile?.email ?? "",
      phone: profile?.phone ?? "",
      role: ROLE_FROM_DB[dbRole],
      city: profile?.city ?? "Astana",
      avatarInitials: initials(name),
      ...(staffClubId || profile?.club_id ? { clubId: staffClubId ?? profile?.club_id ?? "" } : {}),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadProfile(s);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // A club owner registers with a club draft in their metadata; the club row is
  // created (status = pending) the first time they land with a real session.
  useEffect(() => {
    const meta = session?.user?.user_metadata as { club_draft?: ClubDraft } | undefined;
    const draft = meta?.club_draft;
    if (!session?.user || !draft || draftHandled.current) return;
    draftHandled.current = true;
    void (async () => {
      const { data: existing } = await supabase
        .from("clubs")
        .select("id")
        .eq("owner_id", session.user.id)
        .limit(1);
      if (existing && existing.length > 0) return;
      await supabase.from("clubs").insert({
        name: draft.name,
        city: draft.city,
        address: draft.address,
        phone: draft.phone,
        open_from: draft.openFrom,
        open_to: draft.openTo,
        price_per_hour: draft.pricePerHour,
        total_seats: draft.totalSeats,
        specs: draft.specs,
        description: draft.description,
        owner_id: session.user.id,
        status: "pending",
      });
      await supabase.auth.updateUser({ data: { club_draft: null } });
    })();
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      loading,
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          const unconfirmed = /confirm/i.test(error.message);
          return { ok: false, error: unconfirmed ? "unconfirmed" : "invalid" };
        }
        return { ok: true };
      },
      registerPlayer: async ({ name, email, password, phone, city }) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl(),
            data: { name, phone, city, role: "player" },
          },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, needsConfirmation: !data.session };
      },
      registerClub: async ({ name, email, password, phone, club }) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl(),
            data: { name, phone, city: club.city, role: "owner", club_draft: club },
          },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, needsConfirmation: !data.session };
      },
      resendConfirmation: async (email) => {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
          options: { emailRedirectTo: redirectUrl() },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window === "undefined" ? "" : `${window.location.origin}/auth?reset=1`,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },
      logout: async () => {
        await supabase.auth.signOut();
        setUser(null);
      },
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        await loadProfile(data.session);
      },
    }),
    [user, loading, loadProfile],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const HOME_BY_ROLE: Record<Role, string> = {
  player: "/",
  clubAdmin: "/staff",
  owner: "/partner",
  admin: "/admin",
};
