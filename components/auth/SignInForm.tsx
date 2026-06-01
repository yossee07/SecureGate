"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInSchema, type SignInInput } from "@/lib/validations/auth.schemas";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const emailFromRedirect = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(data: SignInInput) {
    setServerError(null);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (!result) {
      setServerError("Something went wrong. Please try again.");
      return;
    }

    if (result.error === "EmailNotVerified") {
      const params = new URLSearchParams({ email: data.email });
      router.push(`/verify-email-info?${params}`);
      return;
    }

    if (result.error) {
      setServerError("Invalid credentials.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && <Alert variant="error" message={serverError} />}

      <FormField
        id="email"
        label="Email address"
        type="email"
        placeholder="jane@example.com"
        autoComplete="email"
        defaultValue={emailFromRedirect}
        error={errors.email?.message}
        {...register("email")}
      />

      <FormField
        id="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" label="Sign in" isLoading={isSubmitting} className="w-full" />
    </form>
  );
}
