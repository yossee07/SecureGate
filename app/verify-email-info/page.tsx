"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function VerifyEmailInfoContent() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Verification email sent! Check your inbox.");
      } else {
        setStatus("error");
        setMessage(json.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-on-background">Check your email</h1>
        <p className="text-sm text-on-surface-variant">
          We sent a verification link to your email address. Click the link to
          activate your account.
        </p>
      </div>

      {status === "success" ? (
        <Alert variant="success" message={message} />
      ) : (
        <form onSubmit={handleResend} className="space-y-4">
          {status === "error" && <Alert variant="error" message={message} />}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-on-surface mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-background placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            label="Resend verification email"
            isLoading={status === "loading"}
            className="w-full"
          />
        </form>
      )}

      <div className="text-center text-sm text-on-surface-variant">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
        <span className="mx-2">&middot;</span>
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create new account
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailInfoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-center text-on-surface-variant">Loading...</div>}>
        <VerifyEmailInfoContent />
      </Suspense>
    </main>
  );
}
