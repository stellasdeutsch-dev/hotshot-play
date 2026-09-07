import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Flame, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { SUBSCRIPTION_PLANS, kzt, type SubscriptionPlan } from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KaspiPaymentDialog } from "@/components/KaspiPaymentDialog";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "Абонементы — HotShot Play" },
      {
        name: "description",
        content:
          "Игровые абонементы HotShot Play: 11, 19, 27 часов и Безлимит во всех клубах Астаны.",
      },
      { property: "og:title", content: "HotShot Play — абонементы для игроков" },
      { property: "og:description", content: "Один абонемент — все клубы-партнёры." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PassesPage,
});

function PassesPage() {
  const { user, role } = useAuth();
  const { activeSubFor, latestPaymentFor, submitKaspiReceipt } = useStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [payPlan, setPayPlan] = useState<SubscriptionPlan | null>(null);

  const sub = user && role === "player" ? activeSubFor(user.id) : undefined;
  const lastPayment = user ? latestPaymentFor(user.id) : undefined;
  const pending = lastPayment?.status === "pending";

  const startBuy = (plan: SubscriptionPlan) => {
    if (!user || role !== "player") {
      toast.error(t("passes.signin"));
      navigate({ to: "/auth" });
      return;
    }
    setPayPlan(plan);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <span className="ca-pill ca-pill-lime">{t("passes.badge")}</span>
          <h1 className="font-display mt-3 text-3xl font-extrabold leading-[1.05] sm:text-4xl">
            {t("passes.title1")} <span className="text-primary">{t("passes.title2")}</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("passes.subtitle")}</p>
        </div>
      </section>

      {/* Current balance */}
      {role === "player" && (
        <section className="ca-card p-4 sm:p-5">
          <p className="text-xs font-semibold text-muted-foreground">{t("passes.current")}</p>
          {sub ? (
            <div className="mt-2 flex flex-wrap items-center gap-6">
              <div>
                <p className="font-display text-3xl font-extrabold tabular">
                  {sub.hoursLeft === null ? "∞" : sub.hoursLeft}
                  <span className="ml-1.5 text-base font-bold text-muted-foreground">
                    {sub.hoursTotal !== null
                      ? `/ ${sub.hoursTotal} ${t("passes.hours")}`
                      : t("passes.unlimited")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`plan.${sub.planId}.name`)} · {t("passes.validUntil")} {sub.validUntil}
                </p>
              </div>
              {sub.hoursLeft !== null && sub.hoursTotal !== null ? (
                <div className="min-w-52 flex-1">
                  <Progress value={(sub.hoursLeft / sub.hoursTotal) * 100} />
                </div>
              ) : (
                <span className="flex items-center gap-1.5 font-bold text-lime">
                  <InfinityIcon className="size-5" /> {t("passes.unlimited")}
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("passes.none")}</p>
          )}
        </section>
      )}

      {role === "player" && pending && (
        <section className="ca-card border-2 border-primary/30 p-4 text-sm sm:p-5">
          <p className="font-bold text-primary">{t("kaspi.pendingTitle")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("kaspi.pendingText")} · {t("kaspi.receipt")}:{" "}
            <b className="text-foreground">{lastPayment?.receiptNumber}</b>
          </p>
        </section>
      )}

      {role === "player" && lastPayment?.status === "rejected" && (
        <section className="ca-card border-2 border-destructive/30 p-4 text-sm sm:p-5">
          <p className="font-bold text-destructive">{t("kaspi.rejectedTitle")}</p>
          <p className="mt-1 text-muted-foreground">
            {lastPayment.rejectionReason || t("kaspi.rejectedText")}
          </p>
        </section>
      )}

      {/* Plans */}
      <section>
        <h2 className="font-display mb-3 text-xl font-extrabold">{t("passes.choosePlan")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan, i) => {
            const perHour = plan.hours ? Math.round(plan.priceKzt / plan.hours) : null;
            return (
              <div
                key={plan.id}
                className={cn(
                  "ca-card ca-rise relative flex flex-col p-5 transition-transform hover:-translate-y-1",
                  plan.highlight && "ring-2 ring-primary",
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {plan.highlight && (
                  <span className="ca-pill ca-pill-lime absolute right-4 top-4">
                    <Flame className="size-3" /> {t("passes.hot")}
                  </span>
                )}
                <p className="text-xs font-semibold text-muted-foreground">
                  {t(`plan.${plan.id}.tag`)}
                </p>
                <h3 className="font-display mt-1 text-2xl font-extrabold">
                  {t(`plan.${plan.id}.name`)}
                </h3>
                <p className="font-display mt-4 text-3xl font-extrabold tabular">
                  {kzt(plan.priceKzt)}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">
                    {t("passes.month")}
                  </span>
                </p>
                {perHour !== null ? (
                  <span className="ca-pill ca-pill-dark mt-2 w-fit">
                    ≈ {kzt(perHour)} {t("passes.perHour")}
                  </span>
                ) : (
                  <span className="ca-pill ca-pill-lime mt-2 w-fit">
                    <InfinityIcon className="size-3.5" /> {t("passes.unlimited")}
                  </span>
                )}
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  <Perk>
                    {plan.hours === null
                      ? t("passes.unlimited")
                      : `${plan.hours} ${t("passes.hours")}`}
                  </Perk>
                  <Perk>{t("passes.perk.clubs")}</Perk>
                  <Perk>{t("passes.perk.valid")}</Perk>
                  <Perk>{t("passes.perk.cap", { cap: plan.dailyCap })}</Perk>
                </ul>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant={plan.highlight ? "lime" : "secondary"}
                  disabled={pending}
                  onClick={() => startBuy(plan)}
                >
                  {pending ? t("kaspi.pendingTitle") : t("passes.pay")}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {payPlan && (
        <KaspiPaymentDialog
          open={!!payPlan}
          onOpenChange={(open) => !open && setPayPlan(null)}
          title={t(`plan.${payPlan.id}.name`)}
          amount={payPlan.priceKzt}
          onSubmit={async (receiptNumber) => {
            const res = await submitKaspiReceipt(payPlan.id, receiptNumber);
            if (res.ok) {
              setPayPlan(null);
              toast.success(res.demo ? t("passes.bought") : t("kaspi.submitted"));
            } else {
              toast.error(
                res.error === "alreadyPending" ? t("kaspi.alreadyPending") : t("kaspi.failed"),
              );
            }
          }}
        />
      )}
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-lime text-lime-foreground">
        <Check className="size-3" />
      </span>
      {children}
    </li>
  );
}
