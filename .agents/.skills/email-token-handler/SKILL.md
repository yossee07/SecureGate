# Skill: Email Token Handler

## Purpose

Generate cryptographically secure tokens, persist them with TTLs, validate them, and dispatch transactional authentication emails via Resend.

---

## Before You Start

Read these files first:
- `.agents/.rules/security.md` — token generation requirements, expiry rules, single-use enforcement
- `.agents/.skills/email-token-handler/resources/token-generator.ts` — reference implementation

---

## Token Types

| Token | TTL | Model | Purpose |
|-------|-----|-------|---------|
| Email Verification | 15 minutes | `VerificationToken` | Activate new accounts |
| Password Reset | 1 hour | `PasswordResetToken` | Allow password change |

---

## Token Generation

All tokens must be cryptographically random with minimum 128-bit entropy.

```ts
// lib/tokens/generate.ts
import { randomBytes } from "crypto";
import { db } from "@/lib/db/prisma";
import { TOKEN_EXPIRY } from "@/lib/constants";

export async function generateVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 256-bit token
  const expires = new Date(Date.now() + TOKEN_EXPIRY.VERIFICATION); // 15 min

  // Delete any existing token for this email before creating a new one
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return token;
}

export async function generatePasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET); // 1 hour

  // Delete existing reset tokens for this email
  await db.passwordResetToken.deleteMany({
    where: { email },
  });

  await db.passwordResetToken.create({
    data: { email, token, expires },
  });

  return token;
}
```

**Key rules:**
- Delete old tokens before creating new ones — one active token per email at a time.
- `randomBytes(32).toString("hex")` produces a 64-character hex string (256-bit entropy).
- Never use `Math.random()`, `crypto.randomUUID()` alone, or any user-derived data as a token.

---

## Token Validation

```ts
// lib/tokens/validate.ts
import { db } from "@/lib/db/prisma";

export async function validateVerificationToken(token: string) {
  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false, error: "Token not found" };

  if (new Date() > record.expires) {
    // Clean up expired token
    await db.verificationToken.delete({ where: { id: record.id } });
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, record };
}

export async function validatePasswordResetToken(token: string) {
  const record = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false, error: "Token not found" };

  if (new Date() > record.expires) {
    await db.passwordResetToken.delete({ where: { id: record.id } });
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, record };
}
```

---

## Email Dispatch

### Resend Client

```ts
// lib/email/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Sending Emails

Files follow the structure defined in architecture.md — separate templates under `lib/email/templates/`.

```ts
// lib/email/resend.ts — Resend client + send functions
import { Resend } from "resend";
import { verificationEmailHtml } from "./templates/verification-email";
import { resetPasswordEmailHtml } from "./templates/reset-password-email";

export const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "SecureGate <noreply@yourdomain.com>";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${BASE_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Verify your email address",
    html: verificationEmailHtml(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your password",
    html: resetPasswordEmailHtml(resetUrl),
  });
}
```

### Email HTML Templates

Keep email templates simple and functional — these are transactional emails, not marketing. Each template is a standalone function in `lib/email/templates/`.

```ts
// lib/email/templates/verification-email.ts
export function verificationEmailHtml(url: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827;">Verify your email address</h2>
        <p style="color: #374151;">Click the button below to verify your email and activate your SecureGate account. This link expires in 15 minutes.</p>
        <a
          href="${url}"
          style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;"
        >
          Verify email address
        </a>
        <p style="color: #6B7280; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">If the button above doesn't work, copy and paste this URL: ${url}</p>
      </body>
    </html>
  `;
}
```

```ts
// lib/email/templates/reset-password-email.ts
export function resetPasswordEmailHtml(url: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827;">Reset your password</h2>
        <p style="color: #374151;">Click the button below to reset your SecureGate password. This link expires in 1 hour.</p>
        <a
          href="${url}"
          style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0;"
        >
          Reset password
        </a>
        <p style="color: #6B7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">If the button above doesn't work, copy and paste this URL: ${url}</p>
      </body>
    </html>
  `;
}
```

---

## Token Lifecycle

```
Generate → Store (with expiry) → Embed in URL → Email sent
                                                      ↓
                                              User clicks link
                                                      ↓
                                           Validate (exists + not expired)
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                  Valid                               Invalid/Expired
                                    ↓                                       ↓
                           Use token (update DB)                    Delete if expired
                                    ↓                                       ↓
                           Delete token from DB                      Return error
                                    ↓
                           Return success
```

---

## Checklist for Token Operations

- [ ] Token generated with `crypto.randomBytes(32).toString("hex")`
- [ ] Old tokens for the same email deleted before creating new one
- [ ] `expires` set using `Date.now() + TOKEN_EXPIRY.VERIFICATION/PASSWORD_RESET`
- [ ] Token expiry checked server-side before use
- [ ] Expired tokens deleted from the database on detection
- [ ] Token deleted after successful use (inside a transaction if updating user simultaneously)
- [ ] Email sent after token is stored (not before)
- [ ] Email HTML includes expiry notice
- [ ] `NEXTAUTH_URL` used to construct links (not hard-coded domain)
- [ ] No token value logged anywhere
