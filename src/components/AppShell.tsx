import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Monitor,
  ShieldCheck,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LANGS, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogoMark, LogoWordmark } from "@/components/Logo";
import type { Role } from "@/lib/mock-db";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  center?: boolean;
  search?: Record<string, string>;
};

const NAV: Record<Role | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/passes", label: "nav.subs", icon: Ticket },
    { to: "/auth", label: "auth.signin", icon: LogIn, center: true },
  ],
  player: [
    { to: "/", label: "nav.home", icon: Home },
    { to: "/passes", label: "nav.subs", icon: Ticket },
    {
      to: "/profile",
      label: "nav.session",
      icon: Monitor,
      center: true,
      search: { tab: "session" },
    },
    { to: "/profile", label: "nav.wallet", icon: Wallet, search: { tab: "wallet" } },
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

function useActiveTab() {
  return useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      tab: (s.location.search as { tab?: string }).tab ?? null,
    }),
  });
}

function isActive(item: NavItem, pathname: string, tab: string | null) {
  if (item.to !== pathname) return false;
  if (item.search?.["tab"] === undefined) return true;
  const current = tab ?? "session";
  return item.search["tab"] === current;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { activeSubFor } = useStore();
  const { user, isAuthenticated, role, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { pathname, tab } = useActiveTab();
  const nav = NAV[role ?? "guest"];
  const sub = role === "player" && user ? activeSubFor(user.id) : undefined;
  const hoursLabel = sub
    ? sub.hoursLeft === null
      ? "∞"
      : `${sub.hoursLeft} ${t("home.balanceHours")}`
    : `0 ${t("home.balanceHours")}`;

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <LogoWordmark className="hidden sm:inline" />
          </Link>

          <nav className="ml-2 hidden items-center gap-1 rounded-full bg-surface p-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search as never}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
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
                className="flex items-center gap-2 rounded-full bg-surface py-1.5 pl-3 pr-1.5 text-xs font-bold transition-colors hover:bg-surface-2"
              >
                <span className="tabular">{hoursLabel}</span>
                <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                  +
                </span>
              </Link>
            )}

            <div
              className="hidden rounded-full bg-surface p-1 text-xs font-bold sm:flex"
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
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={role === "player" ? "/profile" : (nav[nav.length - 1]?.to ?? "/")}
                  {...(role === "player" ? { search: { tab: "profile" } as never } : {})}
                  className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 transition-colors hover:bg-surface-2"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
                    {user?.avatarInitials}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-28 truncate text-xs font-bold leading-tight">
                      {user?.name}
                    </span>
                    <span className="block text-[10px] font-medium leading-tight text-muted-foreground">
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

      {/* Mobile bottom navigation with raised centre action */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around rounded-[1.75rem] bg-surface px-2 pb-2 pt-2 shadow-[0_-10px_40px_rgb(0_0_0/0.6)]">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname, tab);
            if (item.center) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search as never}
                  aria-label={t(item.label)}
                  className="-mt-7 flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "grid size-14 place-items-center rounded-full border-[5px] border-background transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_10px_30px_rgb(42_152_229/0.6)]"
                        : "bg-surface-2 text-foreground",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.search as never}
                className={cn(
                  "flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
