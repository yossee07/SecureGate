"use client";
// components/ui/Button.tsx
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface ButtonProps {
  label: string;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Button({
  label,
  type = "button",
  variant = "primary",
  isLoading = false,
  disabled = false,
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        variant === "primary"
          ? "bg-primary text-on-primary hover:opacity-90 active:scale-[0.98]"
          : "border border-outline-variant text-on-surface hover:bg-surface-container focus:ring-outline",
        (disabled || isLoading) && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {isLoading && <Spinner size="sm" />}
      {label}
    </button>
  );
}
