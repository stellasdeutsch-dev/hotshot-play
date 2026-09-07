import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, LayoutDashboard, Play, User } from "lucide-react";
import { toast } from "sonner";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import type { DemoRole } from "@/lib/demo-user";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ROLES: { role: DemoRole; icon: typeof User; label: string; hint: string }[] = [
  { role: "player", icon: User, label: "demo.player", hint: "demo.playerHint" },
  { role: "owner", icon: LayoutDashboard, label: "demo.owner", hint: "demo.ownerHint" },
  { role: "clubAdmin", icon: ClipboardCheck, label: "demo.staff", hint: "demo.staffHint" },
];

/**
 * "Try without signing up" — picks a local demo identity and drops the visitor
 * straight into that role's home screen. Rendered only when demo mode is on.
 */
export function DemoEntry({ className }: { className?: string }) {
  const { loginDemo, demoAvailable } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!demoAvailable) return null;

  const enter = (role: DemoRole) => {
    loginDemo(role);
    toast.success(t("demo.started"));
    navigate({ to: HOME_BY_ROLE[role] });
  };

  return (
    <section className={cn("ca-card p-5 sm:p-6", className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-2xl bg-lime text-lime-foreground">
          <Play className="size-4 fill-current" />
        </span>
        <h2 className="font-display text-lg font-extrabold">{t("demo.title")}</h2>
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{t("demo.text")}</p>

      <div className="mt-4 grid gap-2">
        {ROLES.map(({ role, icon: Icon, label, hint }) => (
          <button
            key={role}
            onClick={() => enter(role)}
            className="ca-row w-full text-left transition-colors hover:bg-surface-3"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{t(label)}</span>
              <span className="block text-[11px] font-semibold text-muted-foreground">
                {t(hint)}
              </span>
            </span>
            <span className="ca-pill ca-pill-lime shrink-0">{t("demo.enter")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
