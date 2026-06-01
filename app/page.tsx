import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-on-background">
            SecureGate
          </h1>
          <p className="text-base text-on-surface-variant">
            Production-grade authentication and identity management.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface transition-all duration-200 hover:bg-surface-container"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
