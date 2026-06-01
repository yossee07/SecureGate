import Link from "next/link";

export default function VerificationSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-on-background">Email verified</h1>
          <p className="text-sm text-on-surface-variant">
            Your email address has been verified successfully. You can now sign in to your account.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 active:scale-[0.98]"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
