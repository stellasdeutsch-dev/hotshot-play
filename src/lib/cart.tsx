import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readLocal, writeLocal } from "./demo-data";
import type { Product } from "./mock-db";

export type CartProduct = Pick<Product, "id" | "name" | "priceKzt" | "imageUrl" | "sizeLabel">;

export interface CartLine {
  product: CartProduct;
  qty: number;
}

interface CartState {
  clubId: string | null;
  lines: CartLine[];
}

interface CartValue extends CartState {
  count: number;
  total: number;
  qtyOf: (productId: string) => number;
  /** Adds one unit; switching to another club starts a fresh cart. */
  add: (product: CartProduct, clubId: string) => "added" | "switched";
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
}

const KEY = "hsp-cart";
const CartCtx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ clubId: null, lines: [] });

  useEffect(() => {
    setState(readLocal<CartState>(KEY, { clubId: null, lines: [] }));
  }, []);

  const persist = useCallback((next: CartState) => {
    setState(next);
    writeLocal(KEY, next);
  }, []);

  const value = useMemo<CartValue>(() => {
    const count = state.lines.reduce((s, l) => s + l.qty, 0);
    const total = state.lines.reduce((s, l) => s + l.qty * l.product.priceKzt, 0);
    return {
      ...state,
      count,
      total,
      qtyOf: (id) => state.lines.find((l) => l.product.id === id)?.qty ?? 0,
      add: (product, clubId) => {
        const switched = state.clubId !== null && state.clubId !== clubId;
        const base = switched ? [] : state.lines;
        const existing = base.find((l) => l.product.id === product.id);
        const lines = existing
          ? base.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
          : [...base, { product, qty: 1 }];
        persist({ clubId, lines });
        return switched ? "switched" : "added";
      },
      setQty: (productId, qty) => {
        const lines = state.lines
          .map((l) => (l.product.id === productId ? { ...l, qty } : l))
          .filter((l) => l.qty > 0);
        persist({ clubId: lines.length ? state.clubId : null, lines });
      },
      clear: () => persist({ clubId: null, lines: [] }),
    };
  }, [state, persist]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
