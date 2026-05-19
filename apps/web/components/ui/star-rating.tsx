"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

const SIZES = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-9 h-9",
};

export function StarRating({
  value,
  onChange,
  disabled,
  size = "md",
  readOnly,
}: StarRatingProps) {
  const interactive = !readOnly && !!onChange;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        const Component = interactive ? "button" : "span";
        return (
          <Component
            key={n}
            {...(interactive
              ? {
                  type: "button" as const,
                  onClick: () => !disabled && onChange?.(n),
                  disabled,
                  "aria-label": `${n} estrella${n > 1 ? "s" : ""}`,
                }
              : {})}
            className={cn(
              "p-1 rounded-md transition-colors",
              interactive && "hover:bg-primary/5 disabled:cursor-not-allowed",
            )}
          >
            <Star
              className={cn(
                SIZES[size],
                "transition-colors",
                active ? "text-primary fill-primary" : "text-muted-foreground/30",
              )}
            />
          </Component>
        );
      })}
    </div>
  );
}
