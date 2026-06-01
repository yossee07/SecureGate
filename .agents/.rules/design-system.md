# Design System Rules

> **Scope:** Visual design, Tailwind CSS conventions, component composition, UX copy, and accessibility standards for SecureGate.

---

## Design Philosophy

SecureGate is a **security-first application**, and the design should reflect that.

- **Trust over flash.** Clean, minimal, professional. No decorative animations that distract from function.
- **Clarity over cleverness.** Every label, error message, and CTA should be immediately understood.
- **Friction where it matters.** Password fields, confirmation dialogs, and destructive actions deserve deliberate UX friction.
- **Consistency above all.** Use the design tokens and component primitives — never ad-hoc styling.

---

## Tailwind CSS Rules

### Usage

- Use Tailwind utility classes exclusively. No custom CSS files except for `globals.css` (Tailwind directives only).
- Never use inline `style={{}}` props.
- Use `cn()` (from `clsx` + `tailwind-merge`) for conditional class composition.

```tsx
import { cn } from "@/lib/utils";

<button
  className={cn(
    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
    isLoading
      ? "cursor-not-allowed bg-gray-300 text-gray-500"
      : "bg-gray-900 text-white hover:bg-gray-700"
  )}
>
```

### globals.css

The only custom CSS file. Must contain only Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

No custom class definitions, no `@layer`, no CSS variables — until dark mode is added (see Dark Mode section).

### Responsive Design

- Mobile-first. Default classes apply at all sizes; use `sm:`, `md:`, `lg:` to override upward.
- Auth forms are centered, max-width constrained, and full-width on mobile.

```tsx
<div className="mx-auto w-full max-w-md px-4">
```

---

## Color Palette

SecureGate uses a neutral, monochromatic palette with a single accent.

| Role | Tailwind Token | Hex |
|------|---------------|-----|
| Background | `bg-gray-50` | #F9FAFB |
| Surface (card) | `bg-white` | #FFFFFF |
| Border | `border-gray-200` | #E5E7EB |
| Text primary | `text-gray-900` | #111827 |
| Text secondary | `text-gray-500` | #6B7280 |
| Text muted | `text-gray-400` | #9CA3AF |
| Accent (primary) | `bg-gray-900` | #111827 |
| Accent hover | `hover:bg-gray-700` | #374151 |
| Error | `text-red-600` | #DC2626 |
| Error background | `bg-red-50` | #FEF2F2 |
| Error border | `border-red-200` | #FECACA |
| Success | `text-green-600` | #16A34A |
| Success background | `bg-green-50` | #F0FDF4 |

**No other colors** should be introduced without a documented reason.

---

## Typography

| Role | Classes |
|------|---------|
| Page title | `text-2xl font-bold text-gray-900` |
| Section heading | `text-lg font-semibold text-gray-900` |
| Body text | `text-sm text-gray-700` |
| Secondary / helper | `text-sm text-gray-500` |
| Error text | `text-sm text-red-600` |
| Link | `text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600` |
| Label | `text-sm font-medium text-gray-700` |

Font family: System font stack via Tailwind default (`font-sans`).

---

## Component Primitives

### Button

```tsx
// components/ui/Button.tsx
interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
}
```

- `primary`: `bg-gray-900 text-white hover:bg-gray-700`
- `ghost`: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- Disabled state: always `opacity-50 cursor-not-allowed`, never just `pointer-events-none`.
- Loading state: show a spinner icon and disable the button. Never change button text to "Loading...".

### Input / FormField

```tsx
// components/ui/FormField.tsx
interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}
```

Input base classes: `block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500`

Error state: `border-red-400 focus:border-red-500 focus:ring-red-500`

Always render the error message in an `<p>` with `role="alert"` beneath the input.

```tsx
{error && (
  <p role="alert" className="mt-1 text-sm text-red-600">
    {error}
  </p>
)}
```

### Card

```tsx
// components/ui/Card.tsx
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
```

### Spinner

```tsx
// components/ui/Spinner.tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}
```

Base: `animate-spin rounded-full border-2 border-gray-300 border-t-gray-900`

- `size="sm"`: `h-4 w-4`
- `size="md"`: `h-5 w-5`
- `size="lg"`: `h-6 w-6`
- Applied inside buttons during loading state. Never replace spinner with text.
- Use `aria-hidden="true"` — the parent button's `aria-busy="true"` communicates state to assistive tech.

### Alert

Used for page-level success/error messages (e.g., "Email sent", "Invalid token").

```tsx
// Variants: "error" | "success" | "info"
<div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
  <p className="text-sm text-red-600">{message}</p>
</div>
```

---

## Auth Page Layout

All auth pages follow this layout:

```tsx
<main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
  <div className="w-full max-w-md space-y-6">

    {/* Logo / App Name */}
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900">SecureGate</h1>
      <p className="mt-1 text-sm text-gray-500">{pageSubtitle}</p>
    </div>

    {/* Form Card */}
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      {/* Form content */}
    </div>

    {/* Footer link */}
    <p className="text-center text-sm text-gray-500">
      {footerText}{" "}
      <Link href="/sign-in" className="font-medium text-gray-900 underline underline-offset-4">
        {linkLabel}
      </Link>
    </p>

  </div>
</main>
```

---

## UX Copy Rules

### Error Messages

| Scenario | Message |
|----------|---------|
| Invalid credentials | "Invalid email or password." |
| Email not verified | "Please verify your email address before signing in." |
| Account already exists | "An account with this email already exists." |
| Token expired | "This link has expired. Please request a new one." |
| Token invalid | "This link is invalid. Please request a new one." |
| Rate limit hit | "Too many attempts. Please try again in 10 minutes." |
| Generic server error | "Something went wrong. Please try again." |
| Forgot password (any email) | "If an account with that email exists, you'll receive a reset link shortly." |

**Rules:**
- Never say "User not found" or "Wrong password" separately — always combine into generic credential error.
- Never expose whether an email exists in the system (use the forgot-password copy pattern).
- Messages end with a period.
- Write in second person ("You", "your").

### CTA Labels

| Action | Button Label |
|--------|-------------|
| Register | "Create account" |
| Login | "Sign in" |
| Send reset email | "Send reset link" |
| Reset password | "Reset password" |
| Logout | "Sign out" |
| Resend verification | "Resend verification email" |

---

## Accessibility Rules

- Every `<input>` must have an associated `<label>` via `htmlFor` / `id`.
- Error messages use `role="alert"` so screen readers announce them.
- Buttons must have descriptive text — no icon-only buttons without `aria-label`.
- Color alone is never used to convey state — always pair color with text or icon.
- Focus rings must be visible (`focus:ring-1 focus:ring-gray-500`). Never `outline-none` without a replacement.

- Forms must be submittable via keyboard (`type="submit"` button present).
- Loading states must communicate to assistive technology: `aria-busy="true"` on the form or button.

### Dark Mode

- Dark mode is **out of scope** for the initial build.
- All tokens assume a light background. If dark mode is added later, replace hard-coded color classes with CSS variables in `globals.css` and apply via `dark:` variants.
- Do not introduce a theme toggle or dark mode styles until explicitly required.

---

## What NOT to Build

Do not add any of the following UI elements:

- Navigation bars with user profile dropdowns
- Admin interfaces or data tables
- Role/permission selectors
- Social login buttons
- Complex multi-step onboarding wizards
- Analytics dashboards
- Notification centres
- Settings pages beyond password reset
