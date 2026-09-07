import { cn } from "@/lib/utils";

/** HotShot Play mark — angled "HS" badge in the Cyber Arena spirit. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden fill="none">
      <defs>
        <linearGradient id="hs-badge" x1="8" y1="6" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2A98E5" />
          <stop offset="1" stopColor="#1B6FB0" />
        </linearGradient>
      </defs>
      <path
        d="M14 6h36l8 10-8 42H14L6 16l8-10Z"
        fill="url(#hs-badge)"
        stroke="#6CC4FF"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M18 20h7v9h8v-9h7v24h-7v-9h-8v9h-7V20Z" fill="#fff" />
      <path d="M40 48h10l4-6H44l-4 6Z" fill="#BAF33F" />
      <path d="M22 44h6l-2 6h-6l2-6Z" fill="#BAF33F" />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-extrabold tracking-tight", className)}>
      HotShot<span className="text-primary"> Play</span>
    </span>
  );
}
