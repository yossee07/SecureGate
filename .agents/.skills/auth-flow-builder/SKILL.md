# Skill: Auth Flow Builder

## Purpose

Construct complete, end-to-end authentication flows for SecureGate — from the UI form through validation, the API route, database operations, email dispatch, and session creation.

---

## Before You Start

Read these files first (in order):
1. `.agents/.rules/security.md` — **mandatory**
2. `.agents/.rules/architecture.md` — module boundaries
3. `.agents/.rules/code-style.md` — TypeScript and error handling patterns
4. `.agents/.skills/auth-flow-builder/resources/auth-config.ts` — NextAuth configuration reference

---

## Auth Flows in SecureGate

| Flow | Entry Point | Key Steps |
|------|-------------|-----------|
| Registration | `/sign-up` | Validate → Hash → Create user → Send verification email |
| Email Verification | `/verify-email?token=...` | Validate token → Check expiry → Mark verified → Delete token |
| Login | `/sign-in` | Validate → Find user → Compare password → Check verified → Create session |
| Forgot Password | `/forgot-password` | Validate email → Generate token → Send email → Always return 200 |
| Reset Password | `/reset-password?token=...` | Validate token → Check expiry → Hash new password → Update → Delete token |
| Logout | Dashboard | Destroy session → Clear cookies → Redirect |

---

## Flow 1: Registration

### Components Involved
- `app/(auth)/sign-up/page.tsx` — page
- `components/auth/SignUpForm.tsx` — form
- `app/api/auth/register/route.ts` — API handler
- `lib/validations/auth.schemas.ts` — Zod schema
- `lib/tokens/generate.ts` — token generation
- `lib/email/resend.ts` — email dispatch
- `prisma/schema.prisma` — `User`, `VerificationToken`

### Page Structure

```tsx
// app/(auth)/sign-up/page.tsx
import { SignUpForm } from "@/components/auth/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">SecureGate</h1>
          <p className="mt-1 text-sm text-gray-500">Create your account</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <SignUpForm />
        </div>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-gray-900 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
```

### API Route

See `.agents/.skills/api-route-scaffolder/SKILL.md` for the full register route implementation.

### Rate Limiting

The register endpoint **must** be rate-limited to prevent bot account creation. Apply the same pattern used for sign-in and forgot-password (5 attempts per 10 minutes per IP).

### Success State

After registration, redirect the user to a `/verify-email` holding page with the message:
> "Check your email. We've sent a verification link to [masked email]."

Never show the full email address in the UI — mask it using a utility: `maskEmail(email)` → `j***@example.com`. Define this helper in `@/lib/utils.ts`.

---

## Flow 2: Email Verification

### Components Involved
- `app/(auth)/verify-email/page.tsx` — handles the token from the URL
- `app/api/auth/verify-email/route.ts` — validates and activates

### Page Structure

This page reads the `token` search param and calls the API on load.

```tsx
// app/(auth)/verify-email/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => (res.ok ? setStatus("success") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") return <p>Verifying your email...</p>;
  if (status === "success") return <Alert variant="success" message="Email verified. You can now sign in." />;
  return <Alert variant="error" message="This link is invalid or has expired. Please request a new one." />;
}
```

### API Route Logic

```ts
// app/api/auth/verify-email/route.ts — core logic
const token = await db.verificationToken.findUnique({ where: { token: input.token } });

if (!token) return 400 error;
if (new Date() > token.expires) {
  await db.verificationToken.delete({ where: { id: token.id } });
  return 400 error;
}

await db.$transaction([
  db.user.update({
    where: { email: token.identifier },
    data: { emailVerified: new Date() },
  }),
  db.verificationToken.delete({ where: { id: token.id } }),
]);

return 200 success;
```

Use a **transaction** to ensure both operations succeed or both fail atomically.

---

## Flow 3: Login

### Session Creation (NextAuth)

Login is handled by NextAuth's Credentials Provider. The `authorize` function performs the authentication:

```ts
// From auth-config.ts resource
async authorize(credentials) {
  const result = signInSchema.safeParse(credentials);
  if (!result.success) return null;

  const { email, password } = result.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, emailVerified: true },
  });

  if (!user) return null; // Generic — do not distinguish "no account" from "wrong password"

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  if (!user.emailVerified) return null; // Redirect handled in pages config

  return { id: user.id, name: user.name, email: user.email };
}
```

**After successful login:** NextAuth redirects to `/dashboard`.
**After failed login:** NextAuth redirects back to `/sign-in?error=CredentialsSignin`.

Map the error query param to a generic message:

```ts
const errorMessage =
  searchParams.get("error") === "CredentialsSignin"
    ? "Invalid email or password."
    : null;
```

### Session Type Augmentation

NextAuth's default session type does not include `name` or `email`. Add a type declaration:

```ts
// lib/auth/auth.ts or types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    } & DefaultSession["user"];
  }
}
```

---

## Flow 4: Forgot Password

### Key Security Rule

The API endpoint returns `200` with the same response body regardless of whether the email exists. This prevents user enumeration.

```ts
// Always return this — even if email doesn't exist
return Response.json({ success: true }, { status: 200 });
```

The response message:
> "If an account with that email exists, you'll receive a reset link shortly."

---

## Flow 5: Reset Password

### Token Validation Order

```ts
1. Find token by value
2. If not found → reject
3. If found but expired → delete token + reject
4. If valid → update password + delete token (in transaction)
```

Always delete the token **before** returning success. Use a `$transaction`:

```ts
await db.$transaction([
  db.user.update({
    where: { email: resetToken.email },
    data: { password: await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS) },
  }),
  db.passwordResetToken.delete({ where: { id: resetToken.id } }),
]);
```

---

## Flow 6: Logout

Logout is handled by NextAuth:

```tsx
import { signOut } from "next-auth/react";

<button onClick={() => signOut({ callbackUrl: "/sign-in" })}>
  Sign out
</button>
```

Or as a server action using `signOut` from `@/lib/auth/auth`.

---

## Protected Dashboard

The dashboard page must validate the session server-side:

```tsx
// app/dashboard/page.tsx
import { getServerSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  return (
    <main>
      <h1>Welcome, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
      <p>Verified: Yes</p>
    </main>
  );
}
```

`middleware.ts` handles the redirect at the edge, but the page itself also validates — defence in depth.

---

## Checklist for a Complete Auth Flow

- [ ] Page exists in `app/(auth)/` route group
- [ ] Form component in `components/auth/`
- [ ] Zod schema defined in `lib/validations/auth.schemas.ts`
- [ ] API route follows the scaffolder template
- [ ] Rate limiting applied where required
- [ ] Error messages are generic (no enumeration)
- [ ] Tokens checked for expiry and deleted after use
- [ ] Database operations in transactions where atomicity required
- [ ] Password hashed before storage (register + reset flows)
- [ ] `middleware.ts` updated if new protected routes added
- [ ] Security review checklist completed (`.agents/.workflows/security-review.md`)
