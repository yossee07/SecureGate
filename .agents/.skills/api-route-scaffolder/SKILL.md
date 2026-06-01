# Skill: API Route Scaffolder

## Purpose

Create secure, validated, well-structured API route handlers for SecureGate's authentication endpoints.

---

## Before You Start

Read these files first:
- `.agents/.rules/security.md` — error messages, token handling, rate limiting requirements
- `.agents/.rules/code-style.md` — Zod validation patterns, error response shapes, async patterns
- `.agents/.rules/architecture.md` — where routes live, module import rules

---

## Route File Conventions

All API routes live under `app/api/` and are named `route.ts`.

```
app/api/auth/
├── [...nextauth]/route.ts     # NextAuth handler — do not modify manually
├── register/route.ts
├── verify-email/route.ts
├── forgot-password/route.ts
└── reset-password/route.ts
```

---

## API Route Template

Every route follows this exact structure:

```ts
// app/api/auth/[endpoint]/route.ts
import { z } from "zod";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db/prisma";
// Import other lib modules as needed

// 1. Define the Zod schema for this endpoint
const inputSchema = z.object({
  // fields here
});

// 2. Export only the HTTP methods this route supports
export async function POST(req: Request): Promise<Response> {
  try {
    // 3. Parse and validate input
    const body = await req.json();
    const result = inputSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { /* destructured fields */ } = result.data;

    // 4. Business logic here
    // Always use lib/ modules — no inline db queries in routes

    // 5. Return consistent response shape
    return Response.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error("[api/auth/endpoint]", { error: error instanceof Error ? error.message : String(error) });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```

---

## HTTP Status Code Reference

| Situation | Status | Body |
|-----------|--------|------|
| Success | `200` | `{ success: true, data?: ... }` |
| Resource created | `201` | `{ success: true }` |
| Validation error | `400` | `{ error: "Validation failed", issues: {...} }` |
| Auth failure | `401` | `{ error: "Invalid email or password." }` |
| Rate limit hit | `429` | `{ error: "Too many attempts. Please try again later." }` |
| Server error | `500` | `{ error: "Something went wrong. Please try again." }` |
| Forgot password (any email) | `200` | `{ success: true }` — **always 200** |

---

## Rate-Limited Route Template

For `POST /api/auth/sign-in` and `POST /api/auth/forgot-password`:

```ts
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import { logger } from "@/lib/logger";

export async function POST(req: Request): Promise<Response> {
  // Rate limit check FIRST — before any processing
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const rateLimitResult = await checkRateLimit(ip, "sign-in");

  if (!rateLimitResult.success) {
    return Response.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": "600" },
      }
    );
  }

  try {
    // ... rest of handler
  } catch (error) {
    logger.error("[api/auth/rate-limited]", { error: error instanceof Error ? error.message : String(error) });
  }
}
```

---

## Complete Example: Register Route

```ts
// app/api/auth/register/route.ts
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { generateVerificationToken } from "@/lib/tokens/generate";
import { sendVerificationEmail } from "@/lib/email/resend";
import { signUpSchema } from "@/lib/validations/auth.schemas";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = signUpSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Check for duplicate email
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await db.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, email: true },
    });

    // Generate and send verification email
    const token = await generateVerificationToken(user.email);
    await sendVerificationEmail(user.email, token);

    return Response.json({ success: true }, { status: 201 });

  } catch (error) {
    logger.error("[api/auth/register]", { error: error instanceof Error ? error.message : String(error) });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```

---

## Step-by-Step: Adding a New Auth Route

### Step 1 — Create the file

```
app/api/auth/[your-endpoint]/route.ts
```

### Step 2 — Define the Zod schema

Add the schema to `lib/validations/auth.schemas.ts`, not inline in the route.

### Step 3 — Apply rate limiting (if applicable)

Check `.agents/.rules/security.md` — login and forgot-password endpoints are always rate limited.

### Step 4 — Write the handler

Follow the template above. Business logic goes in `lib/` — routes orchestrate, they don't implement.

### Step 5 — Verify error responses

- Auth errors: generic messages only.
- Validation errors: return `issues` for the client to map to form fields.
- Server errors: never expose stack traces or internal messages.

### Step 6 — Export only needed HTTP methods

Only export `GET`, `POST`, `PUT`, `DELETE` etc. for methods this route handles. Next.js returns `405 Method Not Allowed` automatically for undefined methods.

---

## Checklist Before Submitting an API Route

- [ ] Input validated with Zod `safeParse` on the server
- [ ] Rate limiting applied if required by security rules
- [ ] Error messages are generic (no user enumeration)
- [ ] `try/catch` wraps all async operations
- [ ] Response status codes match the reference table
- [ ] Password hash excluded from all select queries that don't need it
- [ ] Tokens deleted after use
- [ ] No secrets or PII logged
