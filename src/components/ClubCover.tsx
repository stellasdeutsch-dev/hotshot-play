import { useState } from "react";
import { isImageCover } from "@/lib/club-utils";
import { cn } from "@/lib/utils";

const FALLBACK = "linear-gradient(135deg, #1f7fc4 0%, #181c1f 70%)";

/**
 * Club cover: renders a photo when `cover` is a URL, otherwise the stored CSS
 * gradient. Broken image links fall back to the brand gradient.
 */
export function ClubCover({
  cover,
  alt,
  className,
  children,
}: {
  cover: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const image = isImageCover(cover) && !broken;

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-2", className)}
      style={image ? undefined : { background: cover && !isImageCover(cover) ? cover : FALLBACK }}
    >
      {image && (
        <img
          src={cover}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}
      {!image && <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />}
      <div
        className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/10 to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}
