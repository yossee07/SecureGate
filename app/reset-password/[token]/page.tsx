import { validatePasswordResetToken } from "@/lib/tokens/validate";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await validatePasswordResetToken(params.token);

  if (!result.valid) {
    const isExpired = result.error === "Token expired";
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card>
          <div className="space-y-4 text-center">
            <Alert
              variant="error"
              message={
                isExpired
                  ? "This link has expired. Please request a new reset link."
                  : "This link is invalid or has expired."
              }
            />
            <Link
              href="/forgot-password"
              className="block font-semibold text-primary hover:underline"
            >
              Request new reset link
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-on-background">Reset password</h1>
            <p className="text-sm text-on-surface-variant">Enter your new password below.</p>
          </div>
          <ResetPasswordForm token={params.token} />
        </div>
      </Card>
    </main>
  );
}
