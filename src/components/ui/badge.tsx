import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-soft text-primary",
        lime: "bg-lime text-lime-foreground",
        secondary: "bg-secondary text-foreground",
        destructive: "bg-destructive/12 text-destructive",
        outline: "border border-border text-muted-foreground",
        muted: "bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
