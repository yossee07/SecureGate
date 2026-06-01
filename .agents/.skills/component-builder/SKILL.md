# Skill: Component Builder

## Purpose

Scaffold production-ready, accessible UI components for SecureGate following the design system and code style rules.

---

## Before You Start

Read these files first:
- `.agents/.rules/design-system.md` — color palette, typography, Tailwind conventions
- `.agents/.rules/code-style.md` — TypeScript patterns, props, naming

---

## Component Categories

### 1. UI Primitives (`components/ui/`)

Stateless, reusable, no auth logic. Examples: `Button`, `Input`, `FormField`, `Card`, `Alert`, `Spinner`.

**Template — UI Primitive:**

```tsx
// components/ui/ComponentName.tsx
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  // Define all props explicitly — no spreading unknown props
  className?: string;
}

export function ComponentName({ className }: ComponentNameProps) {
  return (
    <div className={cn("base-classes", className)}>
      {/* content */}
    </div>
  );
}
```

### 2. Auth Components (`components/auth/`)

Form-level compositions that wire up to API routes or server actions. Examples: `SignUpForm`, `SignInForm`, `ForgotPasswordForm`, `ResetPasswordForm`.

**Template — Auth Form:**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { signInSchema } from "@/lib/validations/auth.schemas";

type FormData = z.infer<typeof signInSchema>;

export function SignInForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        setServerError(json.error ?? "Something went wrong.");
        return;
      }

      // Redirect on success — let NextAuth handle the session refresh
      window.location.href = "/dashboard";
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isLoading}>
      {serverError && <Alert variant="error" message={serverError} />}

      <FormField
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button
        type="submit"
        label="Sign in"
        isLoading={isLoading}
        disabled={isLoading}
        className="mt-4 w-full"
      />
    </form>
  );
}
```

---

## Step-by-Step: Building a New Component

### Step 1 — Classify

Decide: is this a **UI primitive** (`components/ui/`) or an **auth composition** (`components/auth/`)?

### Step 2 — Define the Interface

Write the `interface` for props first. Every prop must be typed. No `any`.

### Step 3 — Check the Design System

Verify colors, spacing, and typography against `.agents/.rules/design-system.md` before writing JSX.

### Step 4 — Implement Accessibility

- All inputs have `<label>` via `htmlFor`/`id`.
- Error messages use `role="alert"`.
- Interactive elements are keyboard-navigable.
- Loading state uses `aria-busy`.

### Step 5 — Export and Use

Named exports only — no default exports for components (except page files which Next.js requires as default).

```ts
// ✅ Named export
export function Button(...) {}

// Import
import { Button } from "@/components/ui/Button";
```

---

## Common UI Primitives Reference

### Button

```tsx
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
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary"
          ? "bg-gray-900 text-white hover:bg-gray-700 focus:ring-gray-900"
          : "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
        (disabled || isLoading) && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {label}
    </button>
  );
}
```

### FormField

```tsx
// components/ui/FormField.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          className={cn(
            "block w-full rounded-md border px-3 py-2 text-sm shadow-sm placeholder-gray-400",
            "focus:outline-none focus:ring-1",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-gray-500 focus:ring-gray-500",
            className
          )}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
```

### Alert

```tsx
// components/ui/Alert.tsx
import { cn } from "@/lib/utils";

interface AlertProps {
  variant: "error" | "success" | "info";
  message: string;
  className?: string;
}

const variantClasses = {
  error: "border-red-200 bg-red-50 text-red-600",
  success: "border-green-200 bg-green-50 text-green-600",
  info: "border-gray-200 bg-gray-50 text-gray-600",
};

export function Alert({ variant, message, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-md border px-4 py-3 text-sm", variantClasses[variant], className)}
    >
      {message}
    </div>
  );
}
```

---

## Checklist Before Submitting a Component

- [ ] Props interface fully typed — no `any`
- [ ] Tailwind classes match design system tokens
- [ ] Accessible: labels, aria attributes, keyboard nav
- [ ] Error states handled and visible
- [ ] Loading state handled (buttons disabled + spinner)
- [ ] Named export used
- [ ] No direct database or auth imports in UI components
