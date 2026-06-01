# Workflow: New Component

## When to Use This Workflow

Use this workflow any time you need to add a new UI component to SecureGate — whether a primitive (button, input, card) or an auth-specific composition (sign-in form, forgot-password form).

---

## Pre-Work

Before writing any code:

- [ ] Read `.agents/.skills/component-builder/SKILL.md`
- [ ] Read `.agents/.rules/design-system.md` (colors, typography, Tailwind tokens)
- [ ] Read `.agents/.rules/code-style.md` (TypeScript, props, naming)

---

## Step 1 — Classify the Component

**Decision tree:**

```
Is this a stateless, reusable primitive with no auth logic?
  YES → components/ui/
  NO  →
    Does it compose multiple UI primitives and handle a specific auth interaction?
      YES → components/auth/
      NO  → Does not belong in this project (see out-of-scope list below)
```

**Out-of-scope component types (do not build):**
- Navigation headers with profile menus
- Admin tables or data grids
- Role/permission selectors
- Social login buttons
- Settings panels

---

## Step 2 — Check for Existing Components

Before building, verify the component doesn't already exist:

```
components/
├── ui/
│   ├── Button.tsx       ← already exists
│   ├── FormField.tsx    ← already exists
│   ├── Card.tsx         ← already exists
│   ├── Alert.tsx        ← already exists
│   └── Spinner.tsx      ← already exists
└── auth/
    ├── SignUpForm.tsx    ← already exists
    ├── SignInForm.tsx    ← already exists
    ├── ForgotPasswordForm.tsx  ← already exists
    └── ResetPasswordForm.tsx   ← already exists
```

If the component exists, extend it. Do not duplicate.

---

## Step 3 — Write the Props Interface First

Define the TypeScript interface before any JSX. No `any`. Every prop typed.

```ts
interface MyComponentProps {
  // required props first
  label: string;
  // optional props after
  className?: string;
  disabled?: boolean;
}
```

---

## Step 4 — Implement the Component

Follow the template in `.agents/.skills/component-builder/SKILL.md`.

**Checklist while writing:**
- [ ] Tailwind classes use only design system tokens (see `.agents/.rules/design-system.md`)
- [ ] No inline `style={{}}` props
- [ ] Use `cn()` from `@/lib/utils` for conditional classes
- [ ] Error states are visible and accessible (`role="alert"`)
- [ ] Loading states: button disabled + spinner shown
- [ ] All inputs have `<label>` via `htmlFor`/`id`
- [ ] Focus rings visible (never `outline-none` without a replacement)

---

## Step 5 — Add `"use client"` Only If Required

Only add the directive if the component uses:
- `useState`, `useEffect`, or other React hooks
- Browser APIs
- Event handlers like `onClick` directly on interactive elements

```tsx
// ✅ Add if needed
"use client";

// ❌ Never add by default — default to Server Component
```

---

## Step 6 — Export

Use **named exports** for all components. Pages require default exports (Next.js convention) — everything else uses named.

```ts
// ✅ Named export
export function Button({ ... }: ButtonProps) { ... }

// ❌ Avoid default exports in components/
export default function Button(...) { ... }
```

---

## Step 7 — Verify Imports

All imports must use the `@/` alias:

```ts
// ✅
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

// ❌
import { cn } from "../../lib/utils";
```

Components must **never** import from:
- `@/lib/db/` (database)
- `@/lib/tokens/` (token logic)
- `@/lib/auth/` (auth config)

---

## Step 8 — Final Checklist

Before marking done:

- [ ] Props interface fully typed — no `any`
- [ ] Tailwind classes match design system tokens
- [ ] Accessible: labels, `role="alert"`, keyboard navigable
- [ ] Error state visible and announced
- [ ] Loading state handled (button disabled + spinner)
- [ ] Named export used
- [ ] No database or auth imports in the component
- [ ] File is in the correct directory (`ui/` or `auth/`)
- [ ] File name matches `PascalCase.tsx` convention
- [ ] TypeScript compiles without errors
