# Code Style Rules

> **Scope:** TypeScript patterns, error handling, function design, and formatting conventions for SecureGate.

---

## TypeScript Rules

### Strict Mode — Always On

`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type Definitions

- Prefer `type` over `interface` for object shapes derived from Zod schemas.
- Use `interface` for component props and extensible contracts.
- Never use `any`. Use `unknown` and narrow with type guards.
- Use `satisfies` to catch type errors while preserving literal types.

```ts
// ✅ Correct — Zod-derived type
const signUpSchema = z.object({ email: z.string().email() });
type SignUpInput = z.infer<typeof signUpSchema>;

// ✅ Correct — component props
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// ❌ Wrong
const data: any = await response.json();
```

### Async/Await

- Always use `async/await`. Never `.then()` chains.
- Wrap all async operations in `try/catch` at the API route or server action level.
- Never let unhandled promise rejections propagate.

```ts
// ✅ Correct
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ...
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ❌ Wrong
export async function POST(req: Request) {
  const body = await req.json(); // unguarded
}
```

---

## Zod Validation Patterns

All inputs must be validated with Zod **on the server**. Client-side Zod validation is a UX enhancement only.

### Schema Definition

```ts
// lib/validations/auth.schemas.ts
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type SignUpInput = z.infer<typeof signUpSchema>;
```

### Server-Side Parsing Pattern

```ts
const result = signUpSchema.safeParse(body);

if (!result.success) {
  return Response.json(
    { error: "Validation failed", issues: result.error.flatten().fieldErrors },
    { status: 400 }
  );
}

const { name, email, password } = result.data;
```

- Always use `safeParse`, never `parse` (which throws).
- Return `400` with `fieldErrors` on validation failure.
- Never pass raw user input beyond the Zod parse boundary.

---

## Error Handling Rules

### API Routes

Return consistent error shapes:

```ts
// Success
Response.json({ success: true, data: ... }, { status: 200 });

// Validation error
Response.json({ error: "Validation failed", issues: { ... } }, { status: 400 });

// Auth error — ALWAYS generic message
Response.json({ error: "Invalid credentials" }, { status: 401 });

// Forgot-password — always 200, never reveal whether email exists
Response.json({ error: "If this account exists, you will receive an email" }, { status: 200 });

// Server error — never expose internals
Response.json({ error: "Something went wrong" }, { status: 500 });
```

### Logging

- Use a logger abstraction from day one — do not switch between `console.error` and a structured logger later.
- Log errors server-side via `lib/logger.ts`. In production, swap the transport (e.g., Pino) without changing call sites.
- Never log passwords, tokens, or PII.

```ts
// lib/logger.ts
export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: "error", message, ...meta }));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },
};

// ✅ OK
logger.error("[register] Failed to create user", {
  error: error instanceof Error ? error.message : String(error),
});

// ❌ Never
console.log("Password:", password);
console.log("Token:", verificationToken);
```

---

## Function Design

### Single Responsibility

Each function does one thing. If a function name contains "and", split it.

```ts
// ✅ Correct
async function hashPassword(password: string): Promise<string> { ... }
async function createUser(input: SignUpInput): Promise<User> { ... }
async function sendVerificationEmail(email: string, token: string): Promise<void> { ... }

// ❌ Wrong
async function createUserAndSendEmail(input: SignUpInput): Promise<void> { ... }
```

### Return Types

Always annotate return types on exported functions.

```ts
// ✅ Correct
export async function generateVerificationToken(email: string): Promise<string> { ... }
export async function getUserByEmail(email: string): Promise<User | null> { ... }
```

### Pure Functions for Business Logic

Isolate pure logic from side effects:

```ts
// ✅ Pure — testable
function isTokenExpired(expires: Date): boolean {
  return new Date() > expires;
}

// Side-effect — clearly named
async function deleteExpiredToken(id: string): Promise<void> { ... }
```

---

## React Component Rules

### Server Components by Default

All pages and layouts are **Server Components** unless interactivity is required. Only add `"use client"` when you need:
- `useState` / `useEffect`
- Browser APIs
- Event handlers

```tsx
// ✅ Default — Server Component
export default async function DashboardPage() {
  const session = await getServerSession();
  return <div>Welcome, {session.user.name}</div>;
}

// ✅ Only when needed
"use client";
export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### Props

- Destructure props at the function signature.
- Use explicit `interface` types for all component props.
- Never pass raw database objects as props — map to DTOs.

### Form Handling

- Use `react-hook-form` with `zodResolver` for client-side form state.
- Submit via `fetch` to API routes or via Next.js server actions.
- Show loading state during submission. Disable submit button while pending.

---

## Prisma Patterns

### Singleton Client

```ts
// lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

Always import `db` from `@/lib/db/prisma`. Never instantiate `PrismaClient` elsewhere.

### Query Patterns

- Always `select` only the fields you need — never return full user objects with hashed passwords.
- Use `findUnique` for lookups by unique fields, not `findFirst`.

```ts
// ✅ Correct — select only needed fields
const user = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, emailVerified: true },
});

// ❌ Wrong — returns hashed password to caller
const user = await db.user.findUnique({ where: { email } });
```

---

## Constants and Magic Values

No magic strings or numbers inline. Define constants in a dedicated file.

```ts
// lib/constants.ts
export const TOKEN_EXPIRY = {
  VERIFICATION: 15 * 60 * 1000,   // 15 minutes in ms
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour in ms
} as const;

export const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes
} as const;

export const BCRYPT_SALT_ROUNDS = 12;
```
