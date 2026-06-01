# Architecture Rules

> **Scope:** These rules govern folder structure, module boundaries, naming conventions, and import discipline across the SecureGate codebase.

---

## Folder Structure Rules

### App Router Layout

```
app/
├── (auth)/               # Route group — does NOT appear in URL
│   ├── sign-up/page.tsx
│   ├── sign-in/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── dashboard/
│   └── page.tsx          # Protected — middleware enforces auth
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts   # NextAuth catch-all
│       ├── register/route.ts
│       ├── verify-email/route.ts
│       ├── forgot-password/route.ts
│       └── reset-password/route.ts
└── layout.tsx
```

- Route groups `(auth)` are used to group auth pages under a shared layout without affecting the URL.
- The `dashboard/` route is **always** protected by `middleware.ts`.
- API routes live under `app/api/` and are **never** used for page rendering logic.

### `tokens/` — Design Tokens

```
tokens/
├── color-tokens.json
├── convert-tokens.js
├── design-tokens.tokens.json
└── tokens.css
```

- Design tokens are authored as JSON and compiled to CSS at build time.
- `tokens/` is a build-time only dependency — never imported at runtime by application code.
- The generated `tokens.css` is imported once in the root layout.

### `lib/` — Pure Logic, No UI

```
lib/
├── auth/
│   ├── auth.config.ts        # NextAuth configuration object
│   ├── auth.ts               # Exported NextAuth instance
│   └── session.ts            # getServerSession helper
├── db/
│   └── prisma.ts             # Prisma client singleton
├── email/
│   ├── resend.ts             # Resend client + send functions (imports templates)
│   └── templates/
│       ├── verification-email.ts
│       └── reset-password-email.ts
├── tokens/
│   ├── generate.ts           # Secure token generation
│   └── validate.ts           # Token lookup + expiry check
├── validations/
│   ├── auth.schemas.ts       # Zod schemas for all auth forms
│   └── index.ts              # Re-exports
├── utils.ts                  # cn() utility (clsx + tailwind-merge)
└── rate-limit/
    └── limiter.ts            # Rate limit middleware factory
```

- `lib/` modules are **pure logic** — no React, no JSX, no UI imports.
- Each module has a single responsibility.
- Do not co-locate database queries inside components or pages.

### `components/` — UI Only

```
components/
├── ui/                   # Primitives — no auth logic
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── FormField.tsx
│   ├── Card.tsx
│   ├── Alert.tsx
│   └── Spinner.tsx
└── auth/                 # Auth-specific UI compositions
    ├── SignUpForm.tsx
    ├── SignInForm.tsx
    ├── ForgotPasswordForm.tsx
    └── ResetPasswordForm.tsx
```

- `components/ui/` contains **stateless, reusable primitives only**.
- `components/auth/` contains form components that wire up to server actions or API routes.
- Components **never** import directly from `lib/db/` or perform database operations.

---

## Module Boundary Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| `app/` pages | `components/`, `lib/`, `app/api/` (via fetch) | Other pages directly |
| `components/` | `components/ui/`, hooks, types | `lib/db/`, `lib/tokens/`, Prisma |
| `lib/auth/` | `lib/db/`, `lib/tokens/` | `components/`, `app/` |
| `lib/tokens/` | `lib/db/` | `lib/auth/`, `components/` |
| `lib/email/` | Email templates | `lib/db/`, `lib/auth/` |
| `app/api/` routes | All `lib/` modules | `components/` |

---

## Naming Conventions

### Files
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: `PascalCase.tsx` — e.g., `SignInForm.tsx`
- Lib modules: `kebab-case.ts` — e.g., `token-generator.ts`
- Zod schemas: `*.schemas.ts` — e.g., `auth.schemas.ts`

### Variables and Functions
- Functions: `camelCase` — e.g., `generateVerificationToken`
- Constants: `SCREAMING_SNAKE_CASE` — e.g., `TOKEN_EXPIRY_MS`
- Types/Interfaces: `PascalCase` — e.g., `VerificationToken`
- Zod schemas: `camelCase` with `Schema` suffix — e.g., `signUpSchema`

### Database Models
Follow Prisma conventions: `PascalCase` for models, `camelCase` for fields.

---

## Import Rules

- Use absolute imports via `@/` alias — never relative `../../` across feature boundaries.
- Import order (enforced by ESLint): external packages → internal `@/lib` → internal `@/components` → types.
- Never use barrel files (`index.ts`) that re-export from multiple feature areas — they create tight coupling.

```ts
// ✅ Correct
import { db } from "@/lib/db/prisma";
import { signUpSchema } from "@/lib/validations/auth.schemas";
import { SignUpForm } from "@/components/auth/SignUpForm";

// ❌ Wrong
import { db } from "../../lib/db/prisma";
import { everything } from "@/lib";
```

---

## Middleware Rules

`middleware.ts` lives at the **project root** and is responsible for:

1. Protecting the `/dashboard` route — redirect to `/sign-in` if no valid session.
2. Redirecting authenticated users away from auth pages back to `/dashboard`.
3. Nothing else. Middleware is not the place for business logic.

```ts
// middleware.ts — only route protection logic lives here
export { auth as middleware } from "@/lib/auth/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/(auth)/:path*"],
};
```

---

## Server Actions vs API Routes

| Use | When |
|-----|------|
| Server Actions | Form submissions where Next.js progressive enhancement is desired |
| API Routes (`app/api/`) | Rate-limited endpoints, NextAuth handlers, operations needing HTTP-level headers |

- Rate limiting **must** be implemented at the API route level using middleware, not inside server actions.
- All mutation operations (register, login, reset password) must be validated with Zod **on the server**, regardless of client-side validation.

---

## Environment Variables

All secrets live in `.env.local` (never committed). Required variables:

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
RESEND_API_KEY=
EMAIL_FROM=
```

- Never hard-code secrets.
- Never expose server-only env vars to the client (no `NEXT_PUBLIC_` prefix for secrets).
- Validate all required env vars at startup via `lib/env.ts` using a Zod schema.
