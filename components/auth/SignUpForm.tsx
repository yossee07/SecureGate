"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth.schemas";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): { label: string; score: number; color: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Weak", score, color: "bg-error" };
  if (score <= 3) return { label: "Fair", score, color: "bg-amber-500" };
  return { label: "Strong", score, color: "bg-green-500" };
}

export function SignUpForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const password = watch("password") ?? "";
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  async function onSubmit(data: SignUpInput) {
    setServerError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error === "EMAIL_EXISTS") {
          setServerError("EMAIL_EXISTS");
          return;
        }
        setServerError(json.error);
        return;
      }

      setSuccess(json.message);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <Alert variant="success" message={success} />
        <a href="/login" className="block font-semibold text-primary hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError === "EMAIL_EXISTS" ? (
        <Alert
          variant="error"
          message={
            <>
              An account with this email already exists.{" "}
              <a href="/sign-in" className="font-semibold underline">
                Sign in
              </a>{" "}
              or{" "}
              <a href="/forgot-password" className="font-semibold underline">
                reset your password
              </a>{" "}
              instead.
            </>
          }
        />
      ) : (
        serverError && <Alert variant="error" message={serverError} />
      )}

      <FormField
        id="name"
        label="Full name"
        placeholder="Jane Doe"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />

      <FormField
        id="email"
        label="Email address"
        type="email"
        placeholder="jane@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="space-y-1.5">
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    level <= strength.score ? strength.color : "bg-outline-variant/40"
                  )}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-on-surface-variant">
              Password strength: {strength.label}
            </p>
          </div>
        )}
      </div>

      <FormField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" label="Create account" isLoading={isSubmitting} className="w-full" />
    </form>
  );
}
