import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
  icon?: ReactNode;
}

export function ToggleButton({
  pressed,
  icon,
  className,
  children,
  ...props
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-40",
        pressed
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border bg-panel text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
