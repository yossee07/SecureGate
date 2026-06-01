# Security Rules

> ⚠️ **HIGHEST PRIORITY.** These rules are non-negotiable. No feature, deadline, or convenience justifies violating them. Read this file before writing any authentication-related code.

---

## The Core Security Contract

SecureGate exists to demonstrate production-grade authentication. Every line of code is a security statement. If a change weakens any of the guarantees below, it must not be merged.

---

## 1. Password Handling

### Hashing

- **Always** hash passwords with `bcryptjs` before storing.
- **Minimum 12 salt rounds.** Never lower this.
- Never use `md5`, `sha1`, `sha256`, or any non-adaptive hash function for passwords.

```ts
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";

const hashedPassword = await bcrypt.hash(plainTextPassword, BCRYPT_SALT_ROUNDS);
```

### Comparison

- Use `bcrypt.compare()` for password verification. Never compare plain text.
- Use a constant-time comparison — `bcrypt.compare` handles this.

```ts
const isValid = await bcrypt.compare(plainTextPassword, storedHash);
```

### Storage

- Never log passwords — not even hashed passwords.
- Never return password hashes in API responses.
- Never store passwords in cookies, local storage, or session data.
- When querying users, always explicitly **exclude** the password field unless you explicitly need it for comparison.

```ts
// ✅ Correct — password excluded
const user = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, emailVerified: true },
});

// ❌ Wrong — returns hashed password unnecessarily
const user = await db.user.findUnique({ where: { email } });
```

---

## 2. Token Security

### Generation

- All tokens (verification, password reset) must be **cryptographically random**.
- Use `crypto.randomUUID()` or `crypto.randomBytes` from Node's built-in `crypto` module.
- Token minimum entropy: 128 bits.

```ts
import { randomBytes } from "crypto";

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex"); // 256-bit token
}
```

### Expiry

- **Verification tokens:** expire after **15 minutes**.
- **Password reset tokens:** expire after **1 hour**.
- Expiry is checked **server-side** on every token use — never trust client-provided timestamps.
- Expired tokens must be deleted from the database after rejection.

```ts
if (new Date() > token.expires) {
  await db.verificationToken.delete({ where: { id: token.id } });
  return { error: "Token expired" };
}
```

### Single Use

- Password reset tokens are **invalidated immediately after use**. Delete them from the database before returning success.
- Verification tokens are deleted upon successful verification.
- Never allow a token to be used twice.

### Storage

- Tokens are stored in the database, not in cookies or session.
- Never embed tokens in URLs beyond the initial email link. Do not store them in the frontend after they have been consumed.

---

## 3. Authentication Error Messages

### User Enumeration Prevention

**Never** reveal whether an email address exists in the system through error messages or response timing.

| Scenario | ❌ Wrong message | ✅ Correct message |
|----------|----------------|------------------|
| Email not found at login | "No account found" | "Invalid email or password." |
| Wrong password | "Incorrect password" | "Invalid email or password." |
| Forgot password (no account) | "No account with that email" | "If an account with that email exists, you'll receive a reset link shortly." |
| Unverified account at login | "Email not verified" | "Please verify your email address before signing in." |

- Return HTTP `401` for invalid credentials. Never `404`.
- The forgot-password endpoint always returns HTTP `200` with the same response body — regardless of whether the email exists.

---

## 4. Rate Limiting

### Protected Endpoints

The following endpoints **must** be rate limited:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/sign-in` | 5 attempts | 10 minutes per IP |
| `POST /api/auth/forgot-password` | 5 attempts | 10 minutes per IP |

- Rate limiting is applied **per IP address**.
- When the limit is exceeded, return HTTP `429` with a `Retry-After` header.
- Do not reveal the exact attempt count to the client.

```ts
// HTTP 429 response
return Response.json(
  { error: "Too many attempts. Please try again later." },
  {
    status: 429,
    headers: { "Retry-After": "600" },
  }
);
```

---

## 5. Session Security

### NextAuth Configuration

- Use **JWT session strategy** with a strong `NEXTAUTH_SECRET` (minimum 32 random bytes).
- Session tokens are stored in `httpOnly`, `secure`, `sameSite: "lax"` cookies — enforced by NextAuth.
- Never expose the raw session token to JavaScript.
- Session duration: follow NextAuth defaults (30 days) or reduce — never extend without justification.

### Session Validation

- Never rely solely on client-side checks. Always validate the session server-side on protected routes.
- `middleware.ts` enforces route protection for `/dashboard`. Do not remove or bypass it.

```ts
// ✅ Correct — server-side session check on protected page
const session = await getServerSession();
if (!session) redirect("/sign-in");
```

---

## 6. Input Validation

- **All** user-supplied input must pass Zod validation **on the server** before being processed.
- Zod validation on the client is a UX enhancement only — never a security boundary.
- Never use raw `req.body` or `req.json()` output beyond the Zod parse boundary.
- Sanitise inputs before database insertion — Prisma parameterises queries, preventing SQL injection, but Zod schemas must still reject unexpected shapes.

---

## 7. Security Headers

The following HTTP headers must be set on all responses. Configure via `next.config.js`:

```js
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

---

## 8. Dependency Security

- Run `npm audit` before every deployment. Fix `high` and `critical` findings.
- Pin dependency versions in `package.json` — avoid `^` or `~` for security-sensitive packages.
- Never install packages that have not been reviewed for purpose and origin.
- Keep `bcryptjs`, `next-auth`, `prisma`, and `zod` up to date.

---

## 9. Secrets Management

- Never commit secrets to version control.
- `.env.local` is gitignored — verify this before first commit.
- Use Vercel environment variables for production secrets.
- `NEXTAUTH_SECRET` must be a minimum of 32 cryptographically random bytes:

```bash
openssl rand -base64 32
```

- Rotate secrets immediately if they are ever exposed.

---

## 10. Logging & Observability

- Never log PII (personally identifiable information) including email addresses, names, or IP addresses in plain text without a legal basis.
- Never log tokens, passwords, or session data.
- Log authentication events (failed login attempts, rate limit hits) server-side for observability — but without exposing sensitive values.

```ts
// ✅ Safe log
console.error("[auth] Failed login attempt for masked email");

// ❌ Unsafe
console.log("[auth] Failed login for:", email);
console.log("[auth] Token:", token);
```

---

## Security Review Checklist

Before any PR touching authentication code is merged, verify:

- [ ] Passwords are hashed with bcrypt (12+ rounds)
- [ ] Tokens use `crypto.randomBytes` (not `Math.random`)
- [ ] Token expiry is checked server-side
- [ ] Used tokens are deleted immediately
- [ ] Error messages are generic (no enumeration)
- [ ] Forgot-password endpoint returns 200 regardless of email existence
- [ ] Rate limiting is applied on login and forgot-password
- [ ] User password is excluded from all query results that don't need it
- [ ] All inputs are validated with Zod on the server
- [ ] No secrets are hard-coded
- [ ] Security headers are present
- [ ] `middleware.ts` protects `/dashboard`

> See `.agents/.workflows/security-review.md` for the full pre-deployment checklist.
