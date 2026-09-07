import { useState } from "react";
import { Copy, QrCode, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kzt } from "@/lib/mock-db";
import { KASPI_DETAILS } from "@/lib/kaspi";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export function KaspiPaymentDialog({
  open,
  onOpenChange,
  title,
  amount,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amount: number;
  onSubmit: (receiptNumber: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [receipt, setReceipt] = useState("");
  const [sending, setSending] = useState(false);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t("kaspi.copied"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("kaspi.title")} — {title}
          </DialogTitle>
          <DialogDescription>
            {t("kaspi.desc")} <b className="text-foreground">{kzt(amount)}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="ca-tile space-y-2 p-4 text-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <QrCode className="size-4 text-primary" /> {t("kaspi.details")}
          </div>
          <Row label={t("kaspi.phone")} value={KASPI_DETAILS.phone} onCopy={copy} />
          <Row label={t("kaspi.card")} value={KASPI_DETAILS.card} onCopy={copy} />
          <Row label={t("kaspi.receiver")} value={KASPI_DETAILS.receiver} />
          <Row label={t("kaspi.amount")} value={kzt(amount)} onCopy={() => copy(String(amount))} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="receipt">{t("kaspi.receipt")}</Label>
          <Input
            id="receipt"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder={t("kaspi.receiptPh")}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">{t("kaspi.receiptHint")}</p>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#6f9b00]" />
          {t("kaspi.moderationHint")}
        </p>

        <DialogFooter>
          <Button
            className="w-full"
            size="lg"
            variant="lime"
            disabled={sending || receipt.trim().length < 3}
            onClick={async () => {
              setSending(true);
              try {
                await onSubmit(receipt.trim());
                setReceipt("");
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? t("kaspi.sending") : t("kaspi.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {value}
        {onCopy && (
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-primary"
            aria-label="copy"
          >
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}
