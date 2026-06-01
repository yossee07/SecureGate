"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

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
          setStatus("success");
          setMessage("Email verified successfully! You can now sign in.");
        } else {
          setStatus("error");
          setMessage(json.error ?? "This link has expired or is invalid. Please sign up again.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <Alert variant={status === "success" ? "success" : "error"} message={message} />
      {status === "success" && (
        <Link href="/login" className="block font-semibold text-primary hover:underline">
          Sign in
        </Link>
      )}
      {status === "error" && (
        <Link href="/signup" className="block font-semibold text-primary hover:underline">
          Create a new account
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="text-2xl font-bold text-on-background">Verify your email</h1>
      <Suspense fallback={<Spinner size="lg" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
