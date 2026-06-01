import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant: "error" | "success" | "info";
  message: ReactNode;
  className?: string;
}

const variantClasses = {
  error: "border-error/30 bg-error-container/20 text-on-error-container",
  success: "border-primary/30 bg-primary-container/20 text-on-primary-container",
  info: "border-outline-variant bg-surface-container text-on-surface",
};

export function Alert({ variant, message, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        variantClasses[variant],
        className
      )}
    >
      {message}
    </div>
  );
}
