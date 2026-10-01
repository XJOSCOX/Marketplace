"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as mock from "@/data/mock";
import type { CartItem, Marketplace, Message, Product } from "@/domain/models";

interface DemoState {
  cart: CartItem[];
  favorites: string[];
  products: Product[];
  marketplaces: Marketplace[];
  messages: Message[];
  profile: { name: string; email: string };
  settings: Record<string, Record<string, string>>;
}
const initial: DemoState = {
  cart: [],
  favorites: [],
  products: mock.products,
  marketplaces: mock.marketplaces,
  messages: mock.messages,
  profile: { name: "Alex Morgan", email: "alex@example.com" },
  settings: {},
};
type Context = {
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => void;
  ready: boolean;
  notice: string;
  notify: (s: string) => void;
};
const CommerceContext = createContext<Context | null>(null);
const subscribe = () => () => {};
function readInitial(): DemoState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem("commerce-demo-v1");
    if (raw) {
      const value = JSON.parse(raw);
      if (
        Array.isArray(value.products) &&
        Array.isArray(value.marketplaces) &&
        Array.isArray(value.cart) &&
        Array.isArray(value.favorites) &&
        Array.isArray(value.messages) &&
        value.profile &&
        value.settings
      )
        return value;
    }
  } catch {
    /* Invalid or blocked storage uses fixtures. */
  }
  return initial;
}
export function CommerceProvider({ children }: { children: ReactNode }) {
  const [state, update] = useState(readInitial);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [notice, notify] = useState("");
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("commerce-demo-v1", JSON.stringify(state));
      } catch {
        /* The current session still works without browser storage. */
      }
    }
  }, [state, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <CommerceContext.Provider value={{ state, update, ready, notice, notify }}>
      {children}
      {notice && (
        <div role="status" className="toast">
          ✓ {notice}
        </div>
      )}
    </CommerceContext.Provider>
  );
}
export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("CommerceProvider is required");
  return context;
}
