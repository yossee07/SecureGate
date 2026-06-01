# Skill: DB Migration Runner

## Purpose

Safely add or modify Prisma schema models and run database migrations for SecureGate.

---

## Before You Start

Read these files first:
- `.agents/.rules/security.md` — never store plain-text passwords; field selection rules
- `.agents/.rules/architecture.md` — Prisma singleton import pattern

---

## Prisma Schema Reference

The current SecureGate schema covers exactly these models:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String    // bcrypt hash — never plain text
  emailVerified DateTime? // null until verified
  createdAt     DateTime  @default(now())

  sessions      Session[]

  @@map("users")
}

model VerificationToken {
  id         String   @id @default(cuid())
  identifier String   // email address
  token      String   @unique
  expires    DateTime
  createdAt  DateTime @default(now())

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())

  @@map("password_reset_tokens")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// Note: With JWT strategy (see security.md), this Session model is unused by NextAuth
// but reserved for potential session tracking. Remove if not needed.
```

---

## Migration Commands

### Development

```bash
# Create and apply a migration (prompts for name)
npx prisma migrate dev --name <migration-name>

# Examples of good migration names:
npx prisma migrate dev --name add-user-model
npx prisma migrate dev --name add-verification-token
npx prisma migrate dev --name add-password-reset-token
npx prisma migrate dev --name add-session-cascade-delete
```

### Production (Vercel / CI)

```bash
# Apply pending migrations without generating new ones
npx prisma migrate deploy
```

This is the command that runs in CI/CD — it never generates new migrations.

### Reset (Development Only)

```bash
# ⚠️ Destroys all data — development only
npx prisma migrate reset
```

### Introspect (if working with existing DB)

```bash
npx prisma db pull
```

### Generate Prisma Client

Run this after any schema change before running the app:

```bash
npx prisma generate
```

---

## Step-by-Step: Adding a New Model or Field

### Step 1 — Edit `prisma/schema.prisma`

Add the new model or field. Follow these rules:
- Use `cuid()` as the default ID strategy (consistent with existing models).
- Add `createdAt DateTime @default(now())` to all new models.
- All tables use `@@map("snake_case_table_name")` for PostgreSQL convention.
- Tokens always have an `expires DateTime` field.
- Soft deletes are NOT used — delete records outright.

### Step 2 — Name the migration descriptively

```bash
npx prisma migrate dev --name <verb-noun>
# Good: add-account-model, add-expires-field-to-session
# Bad: migration1, update, fix
```

### Step 3 — Regenerate the Prisma client

```bash
npx prisma generate
```

### Step 4 — Update the Prisma singleton if needed

The Prisma client singleton lives at `lib/db/prisma.ts`. It does not need to change when you add models — the generated client handles new types automatically.

### Step 5 — Update TypeScript types

If you added a model, add its type to your service layer. Prefer using `Prisma.ModelGetPayload<...>` for typed query results over manual type definitions:

```ts
import { Prisma } from "@prisma/client";

type UserWithoutPassword = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true; emailVerified: true; createdAt: true };
}>;
```

---

## Schema Rules

### What to Add

Only add models that are explicitly required by the PRD:
- `User`
- `VerificationToken`
- `PasswordResetToken`
- `Session`

### What NOT to Add

Do not add any of the following — they are out of scope:
- `Role`, `Permission`, `Policy` — no RBAC
- `Team`, `Organization`, `Membership` — no team features
- `OAuthAccount` — no OAuth providers
- `AuditLog` — out of scope for MVP
- `Subscription`, `Plan`, `Invoice` — no billing

### Field Rules

- `password` fields store **bcrypt hashes only**. Document this with a comment in the schema.
- `token` fields on `VerificationToken` and `PasswordResetToken` must be `@unique`.
- `expires` fields must always be present on token models.
- Use `String @id @default(cuid())` for all primary keys — never auto-increment integers.

---

## Seeding (Development)

Create `prisma/seed.ts` for development seed data. Never seed production.

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  await db.user.upsert({
    where: { email: "dev@example.com" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@example.com",
      password: await bcrypt.hash("DevPassword123!", 12),
      emailVerified: new Date(),
    },
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run: `npm run db:seed` (or directly: `npx prisma db seed`)

---

## Checklist Before Running a Migration

- [ ] Schema changes match the PRD requirements — no out-of-scope models
- [ ] Token models have `expires` field
- [ ] `password` field documented as bcrypt hash
- [ ] `token` fields are `@unique`
- [ ] `@@map` uses `snake_case`
- [ ] Migration name is descriptive (`verb-noun`)
- [ ] `prisma generate` run after migration
- [ ] TypeScript compiles without errors after schema change
