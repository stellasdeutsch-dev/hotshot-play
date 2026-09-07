import { cn } from "@/lib/utils";

/** HeadShotPlay mark — angled "HS" badge. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden fill="none">
      <defs>
        <linearGradient id="hs-badge" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4B85FF" />
          <stop offset="1" stopColor="#2E6BFF" />
        </linearGradient>
      </defs>
      <path d="M14 6h36l8 10-8 42H14L6 16l8-10Z" fill="url(#hs-badge)" />
      <path d="M18 20h7v9h8v-9h7v24h-7v-9h-8v9h-7V20Z" fill="#fff" />
      <path d="M40 48h10l4-6H44l-4 6Z" fill="#C2F14E" />
      <path d="M22 44h6l-2 6h-6l2-6Z" fill="#C2F14E" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-extrabold tracking-tight", className)}>
      HeadShot<span className="text-primary">Play</span>
    </span>
  );
}
