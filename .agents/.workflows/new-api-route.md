# Workflow: New API Route

## When to Use This Workflow

Use this workflow any time you add a new API route handler to SecureGate.

---

## Pre-Work

Before writing any code:

- [ ] Read `.agents/.skills/api-route-scaffolder/SKILL.md`
- [ ] Read `.agents/.rules/security.md` (error messages, rate limiting, token handling)
- [ ] Read `.agents/.rules/architecture.md` (module boundaries, import rules)

---

## Step 1 — Confirm the Route is In Scope

SecureGate's API routes are limited to these authentication operations:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler |
| `/api/auth/register` | POST | User registration |
| `/api/auth/verify-email` | POST | Email verification |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Perform password reset |

**If your new route is not one of the above** — confirm it's required by the PRD before proceeding. Do not add routes for:
- User profile updates
- Account deletion
- Admin operations
- Webhooks
- Any non-auth functionality

---

## Step 2 — Create the File

```
app/api/auth/[your-endpoint]/route.ts
```

---

## Step 3 — Define the Zod Schema

Add the input schema to `lib/validations/auth.schemas.ts` — **not** inline in the route file.

```ts
// lib/validations/auth.schemas.ts
export const yourEndpointSchema = z.object({
  // fields
});
export type YourEndpointInput = z.infer<typeof yourEndpointSchema>;
```

---

## Step 4 — Determine Rate Limiting Requirement

| Endpoint | Rate Limited? |
|----------|--------------|
| `/api/auth/sign-in` | ✅ Yes |
| `/api/auth/forgot-password` | ✅ Yes |
| `/api/auth/register` | ✅ Yes |
| All others | ❌ No |

If rate limiting is required, apply it as the **first** operation. See `.agents/.skills/rate-limit-guard/SKILL.md`.

---

## Step 5 — Write the Handler

Use this skeleton from `.agents/.skills/api-route-scaffolder/SKILL.md`:

```ts
import { logger } from "@/lib/logger";
import { yourEndpointSchema } from "@/lib/validations/auth.schemas";
// Import other lib/ modules as needed

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const result = yourEndpointSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Business logic via lib/ modules

    return Response.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error("[api/auth/your-endpoint]", { error: error instanceof Error ? error.message : String(error) });
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```

---

## Step 6 — Verify Error Responses

Run through this mental checklist for every error return:

**Authentication errors:**
- [ ] Generic message only — no "user not found" vs "wrong password" distinction
- [ ] Return `401`, not `404`

**Forgot password:**
- [ ] Always returns `200` regardless of whether the email exists

**Validation errors:**
- [ ] Returns `400` with `issues` object so the client can map to form fields

**Server errors:**
- [ ] Returns `500` with generic message — no stack trace, no internal details exposed

---

## Step 7 — Verify Database Queries

For any route that queries the `User` model:

- [ ] `password` field is **excluded** from `select` unless explicitly needed for bcrypt comparison
- [ ] Use `findUnique` (not `findFirst`) for lookups by unique fields
- [ ] Token operations are wrapped in `db.$transaction([...])` where atomicity is required

---

## Step 8 — Only Export Needed HTTP Methods

```ts
// ✅ Only export the methods this route handles
export async function POST(req: Request) { ... }

// ❌ Do not export unused methods — Next.js returns 405 automatically
export async function GET(req: Request) { ... } // Don't add unless needed
```

---

## Step 9 — Final Checklist

- [ ] Route path follows `app/api/auth/[endpoint]/route.ts` convention
- [ ] Zod schema defined in `lib/validations/auth.schemas.ts`
- [ ] `safeParse` used (not `parse`)
- [ ] Rate limiting applied if required (first operation in handler)
- [ ] `try/catch` wraps all async operations
- [ ] Error messages are generic — no user enumeration
- [ ] Password field excluded from select unless needed
- [ ] Token deletion happens inside transactions with associated DB updates
- [ ] Only needed HTTP methods exported
- [ ] No sensitive data logged
- [ ] TypeScript compiles without errors
