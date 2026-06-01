# Workflow: New Auth Flow

## When to Use This Workflow

Use this workflow when adding or modifying a complete end-to-end authentication flow — from the UI page through the API route, database operations, and email delivery.

---

## Pre-Work

Before writing any code:

- [ ] Read `.agents/.rules/security.md` — mandatory
- [ ] Read `.agents/.skills/auth-flow-builder/SKILL.md` — full flow reference
- [ ] Read `.agents/.skills/auth-flow-builder/resources/auth-config.ts` — NextAuth setup
- [ ] Read `.agents/.skills/email-token-handler/SKILL.md` — if the flow involves tokens or email
- [ ] Read `.agents/.skills/rate-limit-guard/SKILL.md` — if the flow involves login, register, or forgot-password

---

## In-Scope Auth Flows

Only these flows exist in SecureGate:

| Flow | Entry Page | API Route |
|------|-----------|-----------|
| Registration | `/sign-up` | `/api/auth/register` |
| Email Verification | `/verify-email?token=...` | `/api/auth/verify-email` |
| Login | `/sign-in` | NextAuth (`/api/auth/[...nextauth]`) |
| Forgot Password | `/forgot-password` | `/api/auth/forgot-password` |
| Reset Password | `/reset-password?token=...` | `/api/auth/reset-password` |
| Logout | Dashboard | NextAuth `signOut()` |

Do not add flows for: OAuth, MFA, role selection, team management, or social login.

---

## Step 1 — Map the Complete Flow

Before writing code, write out every step in the flow:

```
1. User action (which page, which form)
2. Client-side validation (Zod schema on form)
3. API call (which route, which method)
4. Server-side validation (Zod safeParse)
5. Rate limit check (if applicable)
6. Database operation(s)
7. Token generation (if applicable)
8. Email dispatch (if applicable)
9. Response to client
10. Client redirect / state update
```

---

## Step 2 — Create the Page

Pages live in `app/(auth)/` (route group — no URL impact):

```tsx
// app/(auth)/[flow-name]/page.tsx
import { FlowNameForm } from "@/components/auth/FlowNameForm";
import Link from "next/link";

export default function FlowNamePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">SecureGate</h1>
          <p className="mt-1 text-sm text-gray-500">[Page subtitle]</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <FlowNameForm />
        </div>
        <p className="text-center text-sm text-gray-500">
          [Footer copy]{" "}
          <Link href="/sign-in" className="font-medium text-gray-900 underline underline-offset-4">
            [Link label]
          </Link>
        </p>
      </div>
    </main>
  );
}
```

---

## Step 3 — Add the Zod Schema

All schemas live in `lib/validations/auth.schemas.ts`:

```ts
export const flowNameSchema = z.object({
  // Define fields matching the form
});
export type FlowNameInput = z.infer<typeof flowNameSchema>;
```

---

## Step 4 — Create the Form Component

Follow `.agents/.skills/component-builder/SKILL.md` and the auth form template.

Key points:
- `"use client"` required (form state, event handlers)
- Use `react-hook-form` + `zodResolver`
- Show server errors via `<Alert variant="error" />`
- Disable submit button + show spinner while loading
- On success, use `window.location.href` or Next.js router for redirect

---

## Step 5 — Create the API Route

Follow `.agents/.workflows/new-api-route.md` and `.agents/.skills/api-route-scaffolder/SKILL.md`.

The route orchestrates — business logic goes in `lib/`:

```
route.ts → lib/db/prisma.ts        (database)
         → lib/tokens/generate.ts  (token creation)
         → lib/tokens/validate.ts  (token validation)
         → lib/email/resend.ts     (email dispatch)
         → lib/rate-limit/limiter.ts (rate limiting)
```

---

## Step 6 — Handle Token Flows (if applicable)

If the flow involves tokens (verification, password reset):

1. **Generation:** Use `generateVerificationToken()` or `generatePasswordResetToken()` from `lib/tokens/generate.ts`
2. **Email dispatch:** Send email after token is stored — never before
3. **Validation:** Use `validateVerificationToken()` or `validatePasswordResetToken()` from `lib/tokens/validate.ts`
4. **Deletion:** Delete token inside a `db.$transaction` with the associated update

See `.agents/.skills/email-token-handler/SKILL.md` and `.agents/.skills/email-token-handler/resources/token-generator.ts` for complete reference.

---

## Step 7 — Update Middleware (if adding protected routes)

If the new flow introduces a new protected route (like the dashboard), update `middleware.ts`:

```ts
// middleware.ts
export { auth as middleware } from "@/lib/auth/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",     // Protected
    "/new-protected/:path*", // Add new protected routes here
    "/(auth)/:path*",        // Redirect authed users away from auth pages
  ],
};
```

---

## Step 8 — Test the Complete Flow Manually

Walk through the entire flow in the browser:

**Registration:**
- [ ] Invalid inputs show field-level errors
- [ ] Duplicate email shows appropriate error
- [ ] Success sends a verification email (check Resend dashboard)
- [ ] Verification link works and expires after 15 min
- [ ] Expired link shows correct error page

**Login:**
- [ ] Wrong password shows generic error (not "wrong password")
- [ ] Unverified account shows verification message
- [ ] Correct credentials redirect to dashboard
- [ ] Rate limit kicks in after 5 attempts
- [ ] Dashboard is inaccessible without session

**Forgot / Reset Password:**
- [ ] Non-existent email returns same success message as real email
- [ ] Reset link works and expires after 1 hour
- [ ] Used token cannot be reused
- [ ] Password is updated (can sign in with new password)

---

## Step 9 — Security Review

Run `.agents/.workflows/security-review.md` before marking the flow complete. Every auth flow must pass the full security checklist.

---

## Step 10 — Final Checklist

- [ ] Page exists in `app/(auth)/`
- [ ] Form component in `components/auth/`
- [ ] Zod schema in `lib/validations/auth.schemas.ts`
- [ ] API route follows scaffolder template
- [ ] Rate limiting applied where required
- [ ] Forgot-password returns 200 regardless of email existence
- [ ] Error messages are generic (no enumeration)
- [ ] Tokens checked for expiry, deleted after use, in transactions
- [ ] Password hashed before storage (register and reset flows)
- [ ] Middleware updated if new protected routes added
- [ ] Full manual flow test completed
- [ ] Security review checklist passed
