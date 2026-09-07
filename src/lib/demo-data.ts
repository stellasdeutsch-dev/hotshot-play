import type { Product } from "./mock-db";

/**
 * Demo content for the showcase / local dev. Demo clubs (ids starting with
 * "demo-") do not exist in the database, so their shop and chat content
 * lives in localStorage instead of Supabase.
 */
export const demoEnabled = () => import.meta.env.DEV || import.meta.env["VITE_DEMO_CLUBS"] === "1";
export const isDemoClub = (clubId: string) => clubId.startsWith("demo-");

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export const localId = () =>
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=500&q=70`;

type DemoProduct = Omit<Product, "clubId">;

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "demo-p-water",
    category: "drinks",
    name: "Вода газированная Aqua",
    description: "Вода газированная Aqua Minerali. Артезианская скважина № 345.",
    sizeLabel: "500 мл",
    priceKzt: 350,
    oldPriceKzt: 450,
    imageUrl: img("photo-1523362628745-0c100150b504"),
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "demo-p-cola",
    category: "drinks",
    name: "Coca-Cola",
    description: "Классическая кола, охлаждённая.",
    sizeLabel: "500 мл",
    priceKzt: 500,
    oldPriceKzt: null,
    imageUrl: img("photo-1554866585-cd94860890b7"),
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "demo-p-energy",
    category: "drinks",
    name: "Энергетик Gorilla",
    description: "Тонизирующий напиток для длинных сессий.",
    sizeLabel: "450 мл",
    priceKzt: 700,
    oldPriceKzt: null,
    imageUrl: img("photo-1622543925917-763c34d1a86e"),
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "demo-p-coffee",
    category: "drinks",
    name: "Кофе латте",
    description: "Свежесваренный кофе на молоке.",
    sizeLabel: "300 мл",
    priceKzt: 900,
    oldPriceKzt: null,
    imageUrl: img("photo-1461023058943-07fcbe16d735"),
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "demo-p-chips",
    category: "snacks",
    name: "Чипсы Lay's",
    description: "Сметана и лук.",
    sizeLabel: "150 г",
    priceKzt: 650,
    oldPriceKzt: 800,
    imageUrl: img("photo-1566478989037-eec170784d0b"),
    isActive: true,
    sortOrder: 5,
  },
  {
    id: "demo-p-nachos",
    category: "snacks",
    name: "Начос с сыром",
    description: "Кукурузные чипсы с сырным соусом.",
    sizeLabel: "200 г",
    priceKzt: 1200,
    oldPriceKzt: null,
    imageUrl: img("photo-1513456852971-30c0b8199d4d"),
    isActive: true,
    sortOrder: 6,
  },
  {
    id: "demo-p-sandwich",
    category: "food",
    name: "Сэндвич с курицей",
    description: "Курица, сыр, свежие овощи, соус.",
    sizeLabel: "220 г",
    priceKzt: 1500,
    oldPriceKzt: null,
    imageUrl: img("photo-1528735602780-2552fd46c7af"),
    isActive: true,
    sortOrder: 7,
  },
  {
    id: "demo-p-pizza",
    category: "food",
    name: "Пицца Пепперони",
    description: "Тонкое тесто, пепперони, моцарелла.",
    sizeLabel: "25 см",
    priceKzt: 2900,
    oldPriceKzt: 3400,
    imageUrl: img("photo-1628840042765-356cda07504e"),
    isActive: true,
    sortOrder: 8,
  },
  {
    id: "demo-p-icecream",
    category: "icecream",
    name: "Мороженое Magnum",
    description: "Ванильное в шоколаде.",
    sizeLabel: "90 г",
    priceKzt: 800,
    oldPriceKzt: null,
    imageUrl: img("photo-1497034825429-c343d7c6a68f"),
    isActive: true,
    sortOrder: 9,
  },
  {
    id: "demo-p-cheesecake",
    category: "desserts",
    name: "Чизкейк Нью-Йорк",
    description: "Классический чизкейк с ягодным соусом.",
    sizeLabel: "130 г",
    priceKzt: 1300,
    oldPriceKzt: null,
    imageUrl: img("photo-1524351199678-941a58a3df50"),
    isActive: true,
    sortOrder: 10,
  },
];

export const DEMO_CHAT_REPLIES = [
  "Секунду, сейчас подойду 👋",
  "Добрый день! Уже иду к вашему месту.",
  "Принято, передал администратору зала.",
  "Бригада выехала 🙂 Ожидайте пару минут.",
  "Готово, проверьте, пожалуйста.",
];
