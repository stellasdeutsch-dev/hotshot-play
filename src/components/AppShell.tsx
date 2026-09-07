import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Ticket,
  User,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LANGS, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import { fetchUnreadForPlayer } from "@/lib/chat-api";
import { Button } from "@/components/ui/button";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import type { Role } from "@/lib/mock-db";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  center?: boolean;
  search?: Record<string, string>;
  badge?: "cart" | "chat";
};

const NAV: Record<Role | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/passes", label: "nav.subs", icon: Ticket },
    { to: "/auth", label: "auth.signin", icon: LogIn, center: true },
  ],
  player: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/shop", label: "nav.shop", icon: ShoppingBag, badge: "cart" },
    {
      to: "/profile",
      label: "nav.session",
      icon: Monitor,
      center: true,
      search: { tab: "session" },
    },
    { to: "/chat", label: "nav.chat", icon: MessageCircle, badge: "chat" },
    { to: "/profile", label: "nav.profile", icon: User, search: { tab: "profile" } },
  ],
  clubAdmin: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/staff", label: "nav.staff", icon: ClipboardCheck, center: true },
  ],
  owner: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/partner", label: "nav.partner", icon: LayoutDashboard, center: true },
  ],
  admin: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/admin", label: "nav.admin", icon: ShieldCheck, center: true },
  ],
};

/** Extra desktop-header links; the bottom bar stays mobile-only. */
const HEADER_EXTRA: Record<Role | "guest", NavItem[]> = {
  guest: [],
  player: [{ to: "/passes", label: "nav.subs", icon: Ticket }],
  clubAdmin: [],
  owner: [],
  admin: [],
};

function isActive(item: NavItem, pathname: string, tab: string | null) {
  if (item.to !== pathname) return false;
  if (item.search?.["tab"] === undefined) return true;
  return item.search["tab"] === (tab ?? "session");
}

/** Unread club replies for the chat badge; refreshed on navigation. */
function useUnreadChat(
  userId: string | null,
  clubKey: string,
  clubIds: string[],
  pathname: string,
) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    let alive = true;
    const run = () => {
      void fetchUnreadForPlayer(userId, clubIds).then((n) => alive && setUnread(n));
    };
    run();
    const id = window.setInterval(run, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // clubIds is represented by the stable clubKey string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, clubKey, pathname]);
  return unread;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { activeSubFor, clubs } = useStore();
  const { user, isAuthenticated, role, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { count: cartCount } = useCart();
  const { resolved, toggle } = useTheme();
  const { pathname, tab } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      tab: (s.location.search as { tab?: string }).tab ?? null,
    }),
  });

  const nav = NAV[role ?? "guest"];
  const headerNav = [...nav.filter((i) => i.to !== "/auth"), ...HEADER_EXTRA[role ?? "guest"]];
  const sub = role === "player" && user ? activeSubFor(user.id) : undefined;
  const hours = sub ? (sub.hoursLeft === null ? "∞" : String(sub.hoursLeft)) : "0";
  const clubIds = clubs.map((c) => c.id);
  const unread = useUnreadChat(
    role === "player" ? (user?.id ?? null) : null,
    clubIds.join(","),
    clubIds,
    pathname,
  );

  const badgeValue = (kind: NavItem["badge"]) =>
    kind === "cart" ? cartCount : kind === "chat" ? unread : 0;

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <LogoWordmark className="hidden sm:inline" />
          </Link>

          <nav className="ml-2 hidden items-center gap-1 rounded-full bg-card p-1.5 shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)] md:flex">
            {headerNav.map((item) => (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                search={item.search as never}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground",
                  isActive(item, pathname, tab) &&
                    "bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {role === "player" && (
              <Link
                to="/passes"
                className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-3.5 pr-1.5 text-xs font-extrabold shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)] transition-transform hover:-translate-y-0.5"
              >
                <span className="tabular">
                  {hours} {t("home.balanceHours")}
                </span>
                <span className="grid size-7 place-items-center rounded-full bg-lime text-lime-foreground">
                  +
                </span>
              </Link>
            )}

            <div
              className="hidden rounded-full bg-card p-1 text-xs font-bold shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)] sm:flex"
              role="group"
              aria-label={t("lang.label")}
            >
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 transition-all",
                    lang === l.code
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <Button
              size="icon-sm"
              variant="secondary"
              onClick={toggle}
              aria-label={t("theme.toggle")}
              title={t("theme.toggle")}
            >
              {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={role === "player" ? "/profile" : (nav[1]?.to ?? "/")}
                  {...(role === "player" ? { search: { tab: "profile" } as never } : {})}
                  className="flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)] transition-transform hover:-translate-y-0.5"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
                    {user?.avatarInitials}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-28 truncate text-xs font-bold leading-tight">
                      {user?.name}
                    </span>
                    <span className="block text-[10px] font-semibold leading-tight text-muted-foreground">
                      {t(`role.${role}`)}
                    </span>
                  </span>
                </Link>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={logout}
                  aria-label={t("auth.signout")}
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" asChild>
                <Link to="/auth">
                  <LogIn className="size-4" /> {t("auth.signin")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-8">{children}</main>

      {/* Mobile bottom navigation — blue bar with a raised centre action */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around rounded-[1.9rem] bg-primary px-2 py-2.5 shadow-[0_18px_44px_-16px_rgb(46_107_255/0.75)]">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname, tab);
            const badge = badgeValue(item.badge);
            if (item.center) {
              return (
                <Link
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  search={item.search as never}
                  aria-label={t(item.label)}
                  className="-mt-8 flex flex-col items-center"
                >
                  <span
                    className={cn(
                      "grid size-14 place-items-center rounded-full border-[5px] border-background transition-colors",
                      active ? "bg-lime text-lime-foreground" : "bg-card text-primary",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                search={item.search as never}
                className={cn(
                  "relative flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[10px] font-bold transition-colors",
                  active ? "text-white" : "text-white/60",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-lime px-1 text-[9px] font-extrabold text-lime-foreground">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
