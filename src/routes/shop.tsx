import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Search, ShoppingBag, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useCart, type CartProduct } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { isDemoClub } from "@/lib/demo-data";
import { createOrder, fetchMyOrders, fetchProducts, updateOrderStatus } from "@/lib/shop-api";
import { pickCurrentBooking } from "@/lib/club-utils";
import {
  kzt,
  PRODUCT_CATEGORIES,
  type Order,
  type Product,
  type ProductCategory,
} from "@/lib/mock-db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): { club?: string } =>
    typeof s["club"] === "string" ? { club: s["club"] } : {},
  head: () => ({
    meta: [
      { title: "Магазин — HeadShotPlay" },
      {
        name: "description",
        content: "Закажите напитки, снеки и еду прямо к игровому месту в клубе.",
      },
      { property: "og:title", content: "HeadShotPlay — заказ к игровому месту" },
      { property: "og:description", content: "Напитки и еда с доставкой к вашему компьютеру." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { club: clubParam } = Route.useSearch();
  const navigate = useNavigate();
  const { clubs, bookings } = useStore();
  const { user, role } = useAuth();
  const { t } = useI18n();
  const cart = useCart();

  const active = useMemo(() => clubs.filter((c) => c.status === "active"), [clubs]);
  const current = user
    ? pickCurrentBooking(bookings.filter((b) => b.userId === user.id))
    : undefined;

  const clubId = clubParam ?? cart.clubId ?? current?.clubId ?? active[0]?.id ?? null;
  const club = active.find((c) => c.id === clubId) ?? null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!clubId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void fetchProducts(clubId).then((list) => {
      if (!alive) return;
      setProducts(list.filter((p) => p.isActive));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [clubId]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrders(await fetchMyOrders(user.id));
  }, [user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const deals = products.filter((p) => p.oldPriceKzt && p.oldPriceKzt > p.priceKzt);
  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (category === "all" || p.category === category) && (!q || p.name.toLowerCase().includes(q))
    );
  });

  const addToCart = (p: Product) => {
    if (!clubId) return;
    const res = cart.add(
      {
        id: p.id,
        name: p.name,
        priceKzt: p.priceKzt,
        imageUrl: p.imageUrl,
        sizeLabel: p.sizeLabel,
      },
      clubId,
    );
    if (res === "switched") toast.info(t("shop.switched"));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2.5 text-3xl font-extrabold">
            <span className="grid size-10 place-items-center rounded-2xl bg-lime text-lime-foreground">
              <ShoppingBag className="size-5" />
            </span>
            {t("shop.title")}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground">{t("shop.subtitle")}</p>
        </div>
        <Button
          variant={cart.count > 0 ? "default" : "secondary"}
          size="lg"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="size-4" /> {t("shop.cart")}
          {cart.count > 0 && (
            <span className="ml-1 grid size-6 place-items-center rounded-full bg-white/25 text-xs font-extrabold">
              {cart.count}
            </span>
          )}
        </Button>
      </header>

      {/* Club selector */}
      <section className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground">{t("shop.pickClub")}</p>
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
          {active.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/shop", search: { club: c.id } })}
              className={cn("ca-chip", clubId === c.id && "ca-chip-active")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {!club ? (
        <p className="ca-card p-10 text-center text-sm font-semibold text-muted-foreground">
          {t("home.empty")}
        </p>
      ) : (
        <>
          {isDemoClub(club.id) && (
            <p className="ca-tile px-4 py-3 text-xs font-semibold text-muted-foreground">
              {t("shop.demoHint")}
            </p>
          )}

          {/* Search + categories */}
          <section className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("shop.search")}
                className="h-12 bg-card pl-11 shadow-[0_10px_30px_-18px_rgb(11_20_55/0.35)]"
              />
            </div>
            <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
              <button
                onClick={() => setCategory("all")}
                className={cn("ca-chip", category === "all" && "ca-chip-active")}
              >
                {t("shop.all")}
              </button>
              {PRODUCT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn("ca-chip", category === c && "ca-chip-active")}
                >
                  {t(`shop.cat.${c}`)}
                </button>
              ))}
            </div>
          </section>

          {/* Deals row */}
          {deals.length > 0 && category === "all" && !query && (
            <section>
              <h2 className="font-display mb-3 text-xl font-extrabold">{t("shop.discounts")}</h2>
              <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {deals.map((p) => (
                  <div key={p.id} className="w-64 shrink-0">
                    <ProductRow
                      product={p}
                      qty={cart.qtyOf(p.id)}
                      onAdd={() => addToCart(p)}
                      onSetQty={cart.setQty}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Catalogue */}
          <section>
            <h2 className="font-display mb-3 text-xl font-extrabold">
              {category === "all" ? t("shop.title") : t(`shop.cat.${category}`)}
            </h2>
            {loading ? (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="ca-card h-64 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="ca-card p-10 text-center text-sm font-semibold text-muted-foreground">
                {t("shop.empty")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {filtered.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={cart.qtyOf(p.id)}
                    onAdd={() => addToCart(p)}
                    onSetQty={cart.setQty}
                    delay={Math.min(i, 8) * 40}
                  />
                ))}
              </div>
            )}
          </section>

          {/* My orders */}
          {role === "player" && (
            <section>
              <h2 className="font-display mb-3 text-xl font-extrabold">{t("shop.myOrders")}</h2>
              {orders.length === 0 ? (
                <p className="ca-card p-8 text-center text-sm font-semibold text-muted-foreground">
                  {t("shop.noOrders")}
                </p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 6).map((o) => (
                    <OrderRow key={o.id} order={o} onChanged={loadOrders} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onOrdered={loadOrders} />
    </div>
  );
}

function Price({ product, className }: { product: Product; className?: string }) {
  return (
    <p className={cn("font-display flex items-baseline gap-1.5 font-extrabold", className)}>
      {kzt(product.priceKzt)}
      {product.oldPriceKzt && product.oldPriceKzt > product.priceKzt && (
        <span className="text-xs font-bold text-muted-foreground line-through">
          {kzt(product.oldPriceKzt)}
        </span>
      )}
    </p>
  );
}

function QtyStepper({
  qty,
  onSetQty,
  id,
}: {
  qty: number;
  onSetQty: (id: string, q: number) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
      <button
        onClick={() => onSetQty(id, qty - 1)}
        aria-label="−"
        className="grid size-8 place-items-center rounded-full bg-card text-foreground transition-colors hover:bg-surface-3"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-6 text-center text-sm font-extrabold tabular">{qty}</span>
      <button
        onClick={() => onSetQty(id, qty + 1)}
        aria-label="+"
        className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function ProductCard({
  product,
  qty,
  onAdd,
  onSetQty,
  delay,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
  onSetQty: (id: string, q: number) => void;
  delay: number;
}) {
  const { t } = useI18n();
  return (
    <article
      className="ca-card ca-rise flex flex-col overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative aspect-square bg-secondary">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid-bg size-full" />
        )}
        {product.oldPriceKzt && product.oldPriceKzt > product.priceKzt && (
          <span className="ca-pill ca-pill-lime absolute left-2.5 top-2.5">
            −{Math.round((1 - product.priceKzt / product.oldPriceKzt) * 100)}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <Price product={product} className="text-lg" />
        <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight">{product.name}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
          {product.sizeLabel}
        </p>
        <div className="mt-auto pt-3">
          {qty > 0 ? (
            <QtyStepper qty={qty} onSetQty={onSetQty} id={product.id} />
          ) : (
            <Button className="w-full" size="sm" onClick={onAdd}>
              {t("shop.addToCart")} <Plus className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductRow({
  product,
  qty,
  onAdd,
  onSetQty,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
  onSetQty: (id: string, q: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="ca-card flex items-center gap-3 p-3">
      <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-secondary">
        {product.imageUrl && (
          <img src={product.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Price product={product} className="text-base" />
        <p className="truncate text-xs font-bold">{product.name}</p>
        <p className="text-[11px] font-semibold text-muted-foreground">{product.sizeLabel}</p>
      </div>
      {qty > 0 ? (
        <QtyStepper qty={qty} onSetQty={onSetQty} id={product.id} />
      ) : (
        <Button size="icon-sm" onClick={onAdd} aria-label={t("shop.addToCart")}>
          <Plus className="size-4" />
        </Button>
      )}
    </div>
  );
}

const ORDER_VARIANT: Record<Order["status"], "default" | "lime" | "muted" | "destructive"> = {
  pending: "default",
  preparing: "lime",
  delivered: "muted",
  cancelled: "destructive",
};

function OrderRow({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const { clubs } = useStore();
  const { t } = useI18n();
  const club = clubs.find((c) => c.id === order.clubId);
  return (
    <div className="ca-card flex flex-wrap items-center gap-3 p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
        <ShoppingBag className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">
          {club?.name ?? "—"} · <span className="text-primary">{order.code}</span>
        </p>
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-sm font-extrabold tabular">{kzt(order.totalKzt)}</p>
        <Badge variant={ORDER_VARIANT[order.status]}>{t(`order.status.${order.status}`)}</Badge>
      </div>
      {order.status === "pending" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await updateOrderStatus(order, "cancelled");
            onChanged();
          }}
        >
          {t("order.cancel")}
        </Button>
      )}
    </div>
  );
}

function CartSheet({
  open,
  onOpenChange,
  onOrdered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOrdered: () => void;
}) {
  const { clubs, bookings } = useStore();
  const { user, role } = useAuth();
  const { t } = useI18n();
  const cart = useCart();
  const [seat, setSeat] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ order: Order; clubName: string } | null>(null);

  const club = clubs.find((c) => c.id === cart.clubId);
  const current = user
    ? pickCurrentBooking(bookings.filter((b) => b.userId === user.id))
    : undefined;

  useEffect(() => {
    if (open && current?.seat && !seat) setSeat(String(current.seat));
  }, [open, current, seat]);

  const submit = async () => {
    if (!user || role !== "player" || !cart.clubId) return;
    setBusy(true);
    const res = await createOrder({
      userId: user.id,
      clubId: cart.clubId,
      bookingId: current?.id ?? null,
      seat: seat.trim() ? Number(seat) : null,
      playerName: user.name,
      items: cart.lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        priceKzt: l.product.priceKzt,
        qty: l.qty,
      })),
      comment: comment.trim(),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(t("kaspi.failed"));
      return;
    }
    setDone({ order: res.order, clubName: club?.name ?? "" });
    cart.clear();
    setComment("");
    onOrdered();
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setDone(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {done ? (
          <div className="py-2 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-lime text-lime-foreground">
              <Check className="size-7" />
            </span>
            <h2 className="font-display mt-4 text-xl font-extrabold">{t("shop.ordered")}</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {t("shop.orderedHint")}
            </p>
            <div className="ca-tile mt-5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("shop.orderCode")}
              </p>
              <p className="font-display mt-1 text-4xl font-extrabold tracking-[0.18em] text-primary">
                {done.order.code}
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {done.clubName} · {kzt(done.order.totalKzt)}
                {done.order.seat ? ` · ${t("seats.pc")} ${done.order.seat}` : ""}
              </p>
            </div>
            <Button className="mt-5 w-full" size="lg" onClick={() => close(false)}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("shop.cart")}</DialogTitle>
              <DialogDescription>
                {club ? `${club.name} · ${cart.count} ${t("shop.items")}` : t("shop.cartEmpty")}
              </DialogDescription>
            </DialogHeader>

            {cart.lines.length === 0 ? (
              <p className="py-6 text-center text-sm font-semibold text-muted-foreground">
                {t("shop.cartEmpty")}
              </p>
            ) : (
              <>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {cart.lines.map((l) => (
                    <div key={l.product.id} className="ca-tile flex items-center gap-3 p-2.5">
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-card">
                        {l.product.imageUrl && (
                          <img src={l.product.imageUrl} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{l.product.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {kzt(l.product.priceKzt)} · {l.product.sizeLabel}
                        </p>
                      </div>
                      <QtyStepper qty={l.qty} onSetQty={cart.setQty} id={l.product.id} />
                      <button
                        onClick={() => cart.setQty(l.product.id, 0)}
                        aria-label={t("order.cancel")}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {role === "player" ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="seat" className="pl-1">
                          {t("shop.seat")}
                        </Label>
                        <Input
                          id="seat"
                          inputMode="numeric"
                          value={seat}
                          onChange={(e) => setSeat(e.target.value.replace(/\D/g, ""))}
                          placeholder={t("shop.seatPh")}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="ca-tile flex w-full items-center justify-between p-3">
                          <span className="text-xs font-bold text-muted-foreground">
                            {t("shop.total")}
                          </span>
                          <span className="font-display text-lg font-extrabold tabular">
                            {kzt(cart.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="comment" className="pl-1">
                        {t("shop.comment")}
                      </Label>
                      <Textarea
                        id="comment"
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={t("shop.commentPh")}
                      />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t("shop.payAtSeat")}
                    </p>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="lime"
                      disabled={busy}
                      onClick={submit}
                    >
                      {t("shop.checkout")} · {kzt(cart.total)}
                    </Button>
                  </div>
                ) : (
                  <div className="ca-tile p-4 text-sm font-semibold text-muted-foreground">
                    {t("shop.signin")}
                    <Button asChild className="mt-3 w-full">
                      <Link to="/auth">{t("auth.signin")}</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The X icon keeps the close affordance discoverable in future iterations.
void X;
export type { CartProduct };
