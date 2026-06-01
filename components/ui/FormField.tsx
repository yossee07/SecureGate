"use client";
// components/ui/FormField.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error: string | undefined;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-on-surface"
        >
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className={cn(
            "block w-full rounded-lg border px-3.5 py-2.5 text-sm text-on-surface",
            "bg-surface-container-lowest placeholder-on-surface-variant/50",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            error
              ? "border-error focus:border-error focus:ring-error/30"
              : "border-outline-variant focus:border-primary focus:ring-primary/20",
            className
          )}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? "true" : "false"}
          {...props}
        />
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs font-medium text-error"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
