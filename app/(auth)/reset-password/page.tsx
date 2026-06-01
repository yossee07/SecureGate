"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error" message="Missing reset token. Please request a new reset link." />
        <Link
          href="/forgot-password"
          className="block text-center font-semibold text-primary hover:underline"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-on-background">Reset password</h1>
        <p className="text-sm text-on-surface-variant">Enter your new password below.</p>
      </div>
      <Suspense fallback={<Spinner size="lg" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
