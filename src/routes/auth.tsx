import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { HOME_BY_ROLE, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/Logo";
import { DemoEntry } from "@/components/DemoEntry";

type Mode = "signin" | "signup" | "reset" | "newPassword";
type Kind = "player" | "club";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" | "club" | "reset" } => {
    const m = s["mode"];
    return m === "signup" || m === "club" || m === "reset" ? { mode: m } : {};
  },
  head: () => ({
    meta: [
      { title: "Вход и регистрация — HeadShotPlay" },
      {
        name: "description",
        content:
          "Регистрация игроков по почте и подача заявки клуба на подключение к HeadShotPlay.",
      },
      { property: "og:title", content: "HeadShotPlay — вход и регистрация" },
      { property: "og:description", content: "Один аккаунт для игроков, клубов и владельцев." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const {
    login,
    registerPlayer,
    registerClub,
    resendConfirmation,
    resetPassword,
    updatePassword,
    user,
  } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(
    search.mode === "signup" || search.mode === "club"
      ? "signup"
      : search.mode === "reset"
        ? "reset"
        : "signin",
  );
  const [kind, setKind] = useState<Kind>(search.mode === "club" ? "club" : "player");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentKind, setSentKind] = useState<Kind>("player");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") toast.success(t("auth.confirmed"));
    if (params.get("reset") === "1") setMode("newPassword");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("newPassword");
    });
    return () => data.subscription.unsubscribe();
  }, [t]);

  useEffect(() => {
    if (user && mode !== "newPassword") navigate({ to: HOME_BY_ROLE[user.role] });
  }, [user, mode, navigate]);

  if (sentTo) {
    return (
      <Frame>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-lime text-lime-foreground">
          <MailCheck className="size-7" />
        </span>
        <h1 className="font-display mt-4 text-center text-2xl font-extrabold">
          {t("auth.checkEmail")}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("auth.checkEmailHint", { email: sentTo })}
        </p>
        {sentKind === "club" && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("auth.checkEmailClub")}
          </p>
        )}
        <div className="mt-6 grid gap-2">
          <Button
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await resendConfirmation(sentTo);
              setBusy(false);
              if (res.ok) toast.success(t("auth.resent"));
              else toast.error(res.error ?? t("auth.invalid"));
            }}
          >
            {t("auth.resend")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSentTo(null);
              setMode("signin");
            }}
          >
            {t("auth.backToSignin")}
          </Button>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex justify-center">
        <LogoMark className="size-20" />
      </div>
      <h1 className="font-display mt-5 text-center text-3xl font-extrabold">
        {mode === "signin" && t("auth.login")}
        {mode === "signup" && t("auth.signup")}
        {mode === "reset" && t("auth.resetTitle")}
        {mode === "newPassword" && t("auth.newPassword")}
      </h1>
      {mode === "signin" && (
        <p className="mt-1 text-center text-sm text-muted-foreground">{t("auth.subtitle")}</p>
      )}
      {mode === "reset" && (
        <p className="mt-1 text-center text-sm text-muted-foreground">{t("auth.resetHint")}</p>
      )}

      {mode === "signin" && (
        <SignInForm
          busy={busy}
          onForgot={() => setMode("reset")}
          onSubmit={async (email, password) => {
            setBusy(true);
            const res = await login(email, password);
            setBusy(false);
            if (!res.ok) {
              toast.error(res.error === "unconfirmed" ? t("auth.unconfirmed") : t("auth.invalid"));
              if (res.error === "unconfirmed") {
                setSentKind("player");
                setSentTo(email);
              }
              return;
            }
            toast.success(t("auth.welcome"));
          }}
        />
      )}

      {mode === "signup" && (
        <>
          <div className="mt-6 flex rounded-full bg-surface p-1 text-sm font-bold" role="tablist">
            {(["player", "club"] as Kind[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-full py-2.5 transition-all",
                  kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {k === "player" ? t("auth.asPlayer") : t("auth.asClub")}
              </button>
            ))}
          </div>
          {kind === "player" ? (
            <PlayerForm
              busy={busy}
              onSubmit={async (input) => {
                setBusy(true);
                const res = await registerPlayer(input);
                setBusy(false);
                if (!res.ok) {
                  toast.error(res.error ?? t("auth.invalid"));
                  return;
                }
                if (res.needsConfirmation) {
                  setSentKind("player");
                  setSentTo(input.email);
                } else {
                  toast.success(t("auth.welcome"));
                }
              }}
            />
          ) : (
            <ClubForm
              busy={busy}
              onSubmit={async (input) => {
                setBusy(true);
                const res = await registerClub(input);
                setBusy(false);
                if (!res.ok) {
                  toast.error(res.error ?? t("auth.invalid"));
                  return;
                }
                setSentKind("club");
                setSentTo(input.email);
              }}
            />
          )}
        </>
      )}

      {mode === "reset" && (
        <ResetForm
          busy={busy}
          onSubmit={async (email) => {
            setBusy(true);
            const res = await resetPassword(email);
            setBusy(false);
            if (!res.ok) {
              toast.error(res.error ?? t("auth.invalid"));
              return;
            }
            toast.success(t("auth.resetSent"));
            setMode("signin");
          }}
        />
      )}

      {mode === "newPassword" && (
        <NewPasswordForm
          busy={busy}
          onSubmit={async (password) => {
            setBusy(true);
            const res = await updatePassword(password);
            setBusy(false);
            if (!res.ok) {
              toast.error(res.error ?? t("auth.invalid"));
              return;
            }
            toast.success(t("auth.passwordUpdated"));
            window.history.replaceState(null, "", "/auth");
            setMode("signin");
            if (user) navigate({ to: HOME_BY_ROLE[user.role] });
          }}
        />
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            {t("auth.noAccount")}{" "}
            <button
              className="font-bold text-primary hover:underline"
              onClick={() => setMode("signup")}
            >
              {t("auth.signupLink")}
            </button>
          </>
        ) : (
          <>
            {t("auth.haveAccount")}{" "}
            <button
              className="font-bold text-primary hover:underline"
              onClick={() => setMode("signin")}
            >
              {t("auth.signinLink")}
            </button>
          </>
        )}
      </p>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <DemoEntry className="ca-rise" />
      <div className="ca-card ca-rise p-6 sm:p-8">{children}</div>
    </div>
  );
}

function SignInForm({
  busy,
  onForgot,
  onSubmit,
}: {
  busy: boolean;
  onForgot: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="mt-6 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(email, password);
      }}
    >
      <Field
        id="email"
        label={t("auth.account")}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.kz"
        autoComplete="email"
      />
      <PasswordField
        id="password"
        label={t("auth.password")}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("auth.forgot")}
        </button>
      </div>
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={busy}>
        {busy ? t("auth.loading") : t("auth.signin")}
      </Button>
    </form>
  );
}

function ResetForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (email: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  return (
    <form
      className="mt-6 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(email);
      }}
    >
      <Field
        id="r-email"
        label={t("auth.email")}
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.kz"
        autoComplete="email"
      />
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={busy}>
        <KeyRound className="size-4" /> {busy ? t("auth.loading") : t("auth.resetSend")}
      </Button>
    </form>
  );
}

function NewPasswordForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  return (
    <form
      className="mt-6 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (password.length < 6) {
          toast.error(t("auth.weakPassword"));
          return;
        }
        void onSubmit(password);
      }}
    >
      <PasswordField
        id="new-pass"
        label={t("auth.newPassword")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={busy}>
        {busy ? t("auth.loading") : t("auth.setPassword")}
      </Button>
    </form>
  );
}

function PlayerForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "Astana",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (form.password.length < 6) {
          toast.error(t("auth.weakPassword"));
          return;
        }
        void onSubmit(form);
      }}
    >
      <p className="text-xs text-muted-foreground">{t("auth.playerHint")}</p>
      <Field
        id="p-name"
        label={t("auth.nickname")}
        value={form.name}
        onChange={set("name")}
        placeholder="Dastan Y."
        autoComplete="name"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="p-phone"
          label={t("auth.phone")}
          value={form.phone}
          onChange={set("phone")}
          placeholder="+7 701 000 00 00"
          autoComplete="tel"
        />
        <Field
          id="p-city"
          label={t("auth.city")}
          value={form.city}
          onChange={set("city")}
          placeholder="Astana"
        />
      </div>
      <Field
        id="p-email"
        label={t("auth.email")}
        type="email"
        value={form.email}
        onChange={set("email")}
        placeholder="you@example.kz"
        autoComplete="email"
      />
      <PasswordField
        id="p-pass"
        label={t("auth.password")}
        value={form.password}
        onChange={set("password")}
        autoComplete="new-password"
      />
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={busy}>
        {busy ? t("auth.loading") : t("auth.register")}
      </Button>
    </form>
  );
}

function ClubForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    phone: string;
    club: {
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
    };
  }) => Promise<void>;
}) {
  const { t } = useI18n();
  const [owner, setOwner] = useState({ name: "", email: "", password: "", phone: "" });
  const setO = (k: keyof typeof owner) => (v: string) => setOwner((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (owner.password.length < 6) {
          toast.error(t("auth.weakPassword"));
          return;
        }
        void onSubmit({
          ...owner,
          club: {
            name: owner.name.trim() || owner.email.split("@")[0] || "Club",
            city: "Astana",
            address: "",
            phone: owner.phone,
            openFrom: "10:00",
            openTo: "02:00",
            pricePerHour: 500,
            totalSeats: 20,
            specs: "",
            description: "",
          },
        });
      }}
    >
      <p className="text-xs text-muted-foreground">{t("auth.clubHint")}</p>
      <Field
        id="c-name"
        label={t("auth.clubName")}
        value={owner.name}
        onChange={setO("name")}
        placeholder="CyberDome"
        autoComplete="organization"
      />
      <Field
        id="o-email"
        label={t("auth.email")}
        type="email"
        value={owner.email}
        onChange={setO("email")}
        placeholder="owner@club.kz"
        autoComplete="email"
      />
      <Field
        id="o-phone"
        label={t("auth.phone")}
        value={owner.phone}
        onChange={setO("phone")}
        placeholder="+7 702 000 00 00"
        autoComplete="tel"
      />
      <PasswordField
        id="o-pass"
        label={t("auth.password")}
        value={owner.password}
        onChange={setO("password")}
        autoComplete="new-password"
      />
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={busy}>
        <Building2 className="size-4" /> {busy ? t("auth.loading") : t("auth.registerClub")}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="pl-1">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="pl-1">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          placeholder="••••••••"
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-12"
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "hide" : "show"}
          className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
