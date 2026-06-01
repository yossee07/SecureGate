"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";

export default function VerifyEmailTokenPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          router.push("/verification-success");
        } else {
          setStatus("error");
          setMessage(json.error ?? "This link has expired or is invalid.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card>
        {status === "loading" && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}
        {status === "success" && (
          <div className="space-y-4 text-center">
            <Alert variant="success" message="Email verified! Redirecting..." />
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4 text-center">
            <Alert variant="error" message={message} />
            <div className="space-y-2">
              <Link
                href="/verify-email-info"
                className="block font-semibold text-primary hover:underline"
              >
                Resend verification email
              </Link>
              <Link
                href="/signup"
                className="block text-sm text-on-surface-variant hover:underline"
              >
                Create a new account
              </Link>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
