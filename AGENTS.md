# SecureGate — AGENTS.md

## Project Overview

SecureGate is a focused, production-grade authentication and identity management system. It is intentionally narrow in scope — the entire codebase exists to demonstrate secure authentication architecture, not to be a full SaaS product.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · NextAuth.js (Credentials Provider) · bcryptjs · Zod · react-hook-form · clsx · tailwind-merge · Resend · Vercel

---

## Agent Orientation

Before writing any code, every agent must understand these constraints:

### What This Project Is
- A secure authentication system
- A demonstration of production-grade identity management
- A hardened, minimal surface-area application

### What This Project Is NOT
- An ecommerce platform
- A SaaS with roles, teams, or admin panels
- An OAuth/social login implementation
- A multi-factor authentication system
- A complex feature-rich dashboard

---

## Repository Structure

```
securegate/
├── AGENTS.md                        # ← You are here
├── .agents/
│   ├── .rules/
│   │   ├── architecture.md          # Structural and folder conventions
│   │   ├── code-style.md            # TypeScript, naming, formatting
│   │   ├── design-system.md         # UI/UX and Tailwind conventions
│   │   └── security.md              # Security rules — highest priority
│   ├── .skills/
│   │   ├── component-builder/       # How to scaffold UI components
│   │   ├── api-route-scaffolder/    # How to create API routes
│   │   ├── db-migration-runner/     # How to run Prisma migrations
│   │   ├── auth-flow-builder/       # Full auth flow construction
│   │   ├── email-token-handler/     # Token generation & email dispatch
│   │   └── rate-limit-guard/        # Rate limiting middleware
│   └── .workflows/
│       ├── new-component.md         # Step-by-step: add a UI component
│       ├── new-api-route.md         # Step-by-step: add an API route
│       ├── new-auth-flow.md         # Step-by-step: add an auth flow
│       └── security-review.md       # Pre-deploy security checklist
├── tokens/
│   ├── color-tokens.json
│   ├── convert-tokens.js
│   ├── design-tokens.tokens.json
│   └── tokens.css
├── app/                             # Next.js App Router (planned)
│   ├── (auth)/                      # Auth route group
│   │   ├── sign-up/
│   │   ├── sign-in/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/                   # Protected route
│   └── api/
│       └── auth/                    # NextAuth + custom auth endpoints
├── components/                      # (planned)
│   ├── ui/                          # Primitives (inputs, buttons, cards)
│   └── auth/                        # Auth-specific components
├── lib/                             # (planned)
│   ├── auth/                        # NextAuth config, session helpers
│   ├── db/                          # Prisma client singleton
│   ├── email/                       # Resend client, email templates
│   ├── tokens/                      # Token generation & validation
│   ├── validations/                 # Zod schemas
│   └── rate-limit/                  # Rate limiting logic
├── prisma/                          # (planned)
│   ├── schema.prisma
│   └── migrations/
└── middleware.ts                    # Route protection middleware (planned)
```

---

## Rules Index

| Rule File | Purpose |
|-----------|---------|
| `.agents/.rules/security.md` | **Highest priority.** Never violate these. |
| `.agents/.rules/architecture.md` | Folder structure, module boundaries, import rules |
| `.agents/.rules/code-style.md` | TypeScript patterns, naming, error handling |
| `.agents/.rules/design-system.md` | Tailwind usage, component structure, UX copy |

---

## Skills Index

| Skill | When to Use |
|-------|-------------|
| `.agents/.skills/auth-flow-builder/SKILL.md` | Building registration, login, verification, or reset flows |
| `.agents/.skills/email-token-handler/SKILL.md` | Generating tokens and dispatching verification/reset emails |
| `.agents/.skills/rate-limit-guard/SKILL.md` | Protecting endpoints against brute-force or abuse |
| `.agents/.skills/component-builder/SKILL.md` | Scaffolding reusable UI components |
| `.agents/.skills/api-route-scaffolder/SKILL.md` | Creating new API route handlers |
| `.agents/.skills/db-migration-runner/SKILL.md` | Adding models or modifying the Prisma schema |

---

## Workflows Index

| Workflow | When to Use |
|----------|-------------|
| `.agents/.workflows/new-component.md` | Adding any new UI component |
| `.agents/.workflows/new-api-route.md` | Adding any new API endpoint |
| `.agents/.workflows/new-auth-flow.md` | Adding or modifying an authentication flow end-to-end |
| `.agents/.workflows/security-review.md` | Before any PR merge or deployment |

---

## Core Principles

1. **Security first, always.** Read `.agents/.rules/security.md` before touching any auth-related code.
2. **Server-side validation is mandatory.** Client-side validation (Zod on forms) is supplementary only.
3. **Never leak sensitive information.** Error messages must be generic. No stack traces to the client.
4. **Tokens expire.** Every token has a TTL. Never store or use tokens without checking expiry.
5. **Passwords are never stored in plain text.** bcrypt with a minimum of 12 salt rounds.
6. **Rate limit all sensitive endpoints.** Login and forgot-password are protected by default.
7. **Protected routes redirect.** Unauthenticated users always land back at `/sign-in`.
8. **YAGNI.** If a feature is not in the PRD scope, do not build it.
