# Workflow: Security Review

## When to Use This Workflow

Run this checklist **before every pull request merge** and **before every deployment** to Vercel. No exceptions.

This is not optional. SecureGate is an authentication system. Security review is the last line of defence before production.

---

## Pre-Review Setup

```bash
# Ensure you are on a clean branch with all changes committed
git status

# Run the TypeScript compiler — no errors allowed
npx tsc --noEmit

# Run dependency audit
npm audit
```

**Acceptable:** No `high` or `critical` vulnerabilities.
**Unacceptable:** Any `high` or `critical` unresolved findings — fix before proceeding.

---

## Section 1: Password Security

- [ ] **Passwords are never stored in plain text.** Search for `bcrypt.hash` — every password write must go through it.
- [ ] **bcrypt salt rounds are 12 or higher.** Check `lib/constants.ts` → `BCRYPT_SALT_ROUNDS`.
- [ ] **`bcrypt.compare` is used for verification.** No plain-text password comparison anywhere.
- [ ] **Password field excluded from select queries** that do not explicitly need it for bcrypt comparison. Search for `db.user.findUnique` and `db.user.findMany` — verify `select` excludes `password` unless needed.
- [ ] **Passwords are never logged.** Search codebase for `console.log` containing any password-adjacent variable names.

```bash
# Helpful search commands
grep -r "password" --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"

# PowerShell alternative: Select-String -Path "**/*.ts","**/*.tsx" -Pattern "password"
```

---

## Section 2: Token Security

- [ ] **All tokens use `crypto.randomBytes`.** No `Math.random()`, no `Date.now()`, no UUID-only tokens.
- [ ] **Verification tokens expire after 15 minutes.** Check `TOKEN_EXPIRY.VERIFICATION` in `lib/constants.ts`.
- [ ] **Password reset tokens expire after 1 hour.** Check `TOKEN_EXPIRY.PASSWORD_RESET` in `lib/constants.ts`.
- [ ] **Token expiry is checked server-side** in `lib/tokens/validate.ts` — not inferred from client data.
- [ ] **Expired tokens are deleted** when detected during validation.
- [ ] **Used tokens are deleted immediately** after a successful operation (inside a `db.$transaction` with the associated update).
- [ ] **No token is used more than once.** Trace the verify-email and reset-password flows end-to-end.
- [ ] **Tokens are never logged.** Search for any log statement that could include token values.

---

## Section 3: Authentication Error Messages

Verify each error scenario returns the correct message. No message should reveal whether an email exists.

| Scenario | Expected HTTP Status | Expected Message |
|----------|---------------------|-----------------|
| Wrong password | `401` | "Invalid email or password." |
| Email not found | `401` | "Invalid email or password." |
| Email not verified | `401` | "Please verify your email address before signing in." |
| Forgot password (any email) | `200` | "If an account with that email exists, you'll receive a reset link shortly." |
| Expired token | `400` | "This link has expired. Please request a new one." |
| Invalid token | `400` | "This link is invalid. Please request a new one." |
| Server error | `500` | "Something went wrong. Please try again." |

- [ ] Forgot-password endpoint returns `200` regardless of whether the email exists in the database. Trace the code path for a non-existent email.
- [ ] Login endpoint returns `401` (not `404`) for non-existent users.
- [ ] No error message anywhere contains "not found", "does not exist", "no account", or "no user".

---

## Section 4: Rate Limiting

- [ ] **`/api/auth/sign-in` is rate limited** — verify `checkRateLimit(ip, "sign-in")` is the first operation.
- [ ] **`/api/auth/forgot-password` is rate limited** — verify `checkRateLimit(ip, "forgot-password")` is the first operation.
- [ ] **`/api/auth/register` is rate limited** — verify `checkRateLimit(ip, "register")` is the first operation.
- [ ] **Rate limit is per-IP** — confirm IP is extracted from `x-forwarded-for`.
- [ ] **HTTP 429 returned** when limit exceeded, with `Retry-After` header.
- [ ] **No rate limiting applied** to endpoints that shouldn't have it.
- [ ] **Constants match PRD:** max 5 attempts, 10-minute window. Check `RATE_LIMIT` in `lib/constants.ts`.

---

## Section 5: Session Security

- [ ] **`NEXTAUTH_SECRET` is set** in `.env.local` (development) and Vercel environment variables (production). Minimum 32 random bytes.
- [ ] **Session cookies are `httpOnly` and `secure`** — this is handled by NextAuth but confirm no custom cookie config overrides it.
- [ ] **Protected routes redirect to `/sign-in`** — confirm `middleware.ts` matcher includes `/dashboard/:path*`.
- [ ] **Dashboard page validates session server-side** in addition to middleware (defence in depth).
- [ ] **Session is destroyed on logout** — no residual session data after `signOut()`.

---

## Section 6: Input Validation

- [ ] **Every API route validates input with Zod `safeParse`** before any processing.
- [ ] **Client-side validation is never the only validation** — verify that removing client-side Zod would still result in server rejection of invalid input.
- [ ] **No raw `req.json()` output** is passed beyond the Zod parse boundary.

---

## Section 7: Security Headers

Check `next.config.js` includes all required headers:

- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` — present and not trivially permissive (`default-src *` is not acceptable)
- [ ] `Permissions-Policy` — camera, microphone, geolocation all disabled

Test headers in production using [securityheaders.com](https://securityheaders.com) after deployment.

---

## Section 8: Secrets and Environment Variables

- [ ] **`.env.local` is in `.gitignore`** — run `git check-ignore -v .env.local` to verify.
- [ ] **No secrets are hard-coded** in any source file. Search: `grep -r "sk_" --include="*.ts"` (or `Select-String -Path "*.ts" -Pattern "sk_"` on Windows) and similar for Resend and NextAuth secrets.
- [ ] **No `NEXT_PUBLIC_` prefix on secrets** — client-exposed variables are accessible to all users.
- [ ] **Required environment variables are documented** in `.env.example` (with placeholder values, not real secrets).
- [ ] **`EMAIL_FROM` is set and the sender domain is verified** in Resend — check Resend dashboard for domain verification status.

---

## Section 9: Dependency Audit

```bash
npm audit
```

- [ ] Zero `high` severity findings
- [ ] Zero `critical` severity findings
- [ ] All auth-critical packages are up to date: `next-auth`, `bcryptjs`, `zod`, `@prisma/client`

---

## Section 10: Out-of-Scope Features

Verify no out-of-scope features were accidentally introduced:

- [ ] No OAuth provider routes or buttons
- [ ] No MFA or TOTP code
- [ ] No role or permission logic
- [ ] No team or organisation models
- [ ] No admin panel routes
- [ ] No billing or payment code
- [ ] No social login buttons

---

## Section 11: Code Quality

- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] No `any` types introduced
- [ ] No `console.log` statements left in production code (all server-side error logging uses `logger.error()` from `lib/logger.ts`)
- [ ] No commented-out code blocks committed

---

## Sign-Off

Complete this section before merging:

| Check | Status |
|-------|--------|
| Password security | ⬜ Pass / ⬜ Fail |
| Token security | ⬜ Pass / ⬜ Fail |
| Error messages | ⬜ Pass / ⬜ Fail |
| Rate limiting | ⬜ Pass / ⬜ Fail |
| Session security | ⬜ Pass / ⬜ Fail |
| Input validation | ⬜ Pass / ⬜ Fail |
| Security headers | ⬜ Pass / ⬜ Fail |
| Secrets management | ⬜ Pass / ⬜ Fail |
| Dependency audit | ⬜ Pass / ⬜ Fail |
| Out-of-scope check | ⬜ Pass / ⬜ Fail |
| Code quality | ⬜ Pass / ⬜ Fail |

**All sections must pass before this PR is merged or this build is deployed.**

Any `Fail` must be resolved and re-reviewed. There are no exceptions.
