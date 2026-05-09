import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "prime-transition-fast inline-flex min-h-5 items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium leading-none transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground",
        secondary: "border border-transparent bg-muted text-muted-foreground",
        destructive: "border border-destructive/20 bg-destructive/10 text-red-700 dark:text-red-300",
        warning: "border border-warning/25 bg-warning/10 text-warning",
        outline: "border border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
