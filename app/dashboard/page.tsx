import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const emailVerified = (session.user as Record<string, unknown>).emailVerified as Date | null;

  if (!emailVerified) {
    const params = new URLSearchParams({ email: session.user.email ?? "" });
    redirect(`/verify-email-info?${params}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-background">Welcome to SecureGate</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              You are signed in as {session.user.name}
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface p-6 space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">Account details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Name</dt>
              <dd className="font-medium text-on-surface">{session.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Email</dt>
              <dd className="font-medium text-on-surface">{session.user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">User ID</dt>
              <dd className="font-mono text-xs text-on-surface-variant">{session.user.id}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
