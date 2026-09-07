import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Role } from "@/lib/mock-db";

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth();
  const { t } = useI18n();

  if (isAuthenticated && role && roles.includes(role)) return <>{children}</>;

  if (loading) {
    return (
      <div className="ca-card mx-auto max-w-md animate-pulse p-8">
        <div className="mx-auto size-12 rounded-full bg-surface-2" />
        <div className="mx-auto mt-4 h-4 w-40 rounded-full bg-surface-2" />
        <div className="mx-auto mt-2 h-3 w-56 rounded-full bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="ca-card ca-rise mx-auto max-w-md p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
        <Lock className="size-6" />
      </span>
      <h1 className="font-display mt-4 text-xl font-extrabold">
        {isAuthenticated ? t("auth.noAccess") : t("auth.needSignIn")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.needSignInHint")}</p>
      <Button asChild className="mt-5" size="lg">
        <Link to="/auth">{t("auth.signin")}</Link>
      </Button>
    </div>
  );
}
