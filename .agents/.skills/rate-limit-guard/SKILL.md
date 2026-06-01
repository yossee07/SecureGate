# Skill: Rate Limit Guard

## Purpose

Protect sensitive authentication endpoints against brute-force attacks, credential stuffing, and abuse using IP-based rate limiting.

---

## Before You Start

Read these files first:
- `.agents/.rules/security.md` — which endpoints require rate limiting and why
- `.agents/.skills/rate-limit-guard/resources/rate-limit.ts` — reference implementation

---

## Protected Endpoints

| Endpoint | Max Attempts | Window |
|----------|-------------|--------|
| `POST /api/auth/sign-in` | 5 | 10 minutes per IP |
| `POST /api/auth/forgot-password` | 5 | 10 minutes per IP |
| `POST /api/auth/register` | 5 | 10 minutes per IP |

No other endpoints require rate limiting in the current MVP scope. If adding a new sensitive mutation endpoint, assess whether rate limiting is needed.

---

## Rate Limiting Strategy

SecureGate uses an **in-memory sliding window** rate limiter for simplicity and zero-dependency deployment on Vercel. For production scale, replace with a Redis-backed solution (e.g., Upstash).

### In-Memory Limiter (MVP)

```ts
// lib/rate-limit/limiter.ts
import { RATE_LIMIT } from "@/lib/constants";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// Global store — persists across requests within a serverless function instance
// Note: in-memory store resets on cold starts. Acceptable for MVP.
const store = new Map<string, RateLimitRecord>();

type RateLimitKey = "sign-in" | "forgot-password" | "register";

export function checkRateLimit(
  ip: string,
  key: RateLimitKey
): { success: boolean; remaining: number; resetAt: number } {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  const existing = store.get(storeKey);

  // Window expired — reset
  if (!existing || now > existing.resetAt) {
    store.set(storeKey, { count: 1, resetAt: now + RATE_LIMIT.WINDOW_MS });
    return {
      success: true,
      remaining: RATE_LIMIT.MAX_ATTEMPTS - 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
    };
  }

  // Limit exceeded
  if (existing.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  // Increment counter
  store.set(storeKey, { ...existing, count: existing.count + 1 });
  return {
    success: true,
    remaining: RATE_LIMIT.MAX_ATTEMPTS - existing.count - 1,
    resetAt: existing.resetAt,
  };
}
```

---

## Applying Rate Limiting to a Route

Rate limiting is always the **first operation** in a route handler — before input parsing, validation, or database access.

```ts
// app/api/auth/sign-in/route.ts
import { checkRateLimit } from "@/lib/rate-limit/limiter";
import { logger } from "@/lib/logger";

export async function POST(req: Request): Promise<Response> {
  // ① Rate limit check — always first
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const rateLimit = checkRateLimit(ip, "sign-in");

  if (!rateLimit.success) {
    const retryAfterSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return Response.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(5),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      }
    );
  }

  // ② Continue with normal route logic
  try {
    // ... validation, auth, etc.
  } catch (error) {
    logger.error("[api/auth/sign-in]", { error: error instanceof Error ? error.message : String(error) });
  }
}
```

---

## IP Address Extraction

On Vercel, the real client IP is forwarded via `x-forwarded-for`. Always extract it safely:

```ts
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (client IP)
    return forwarded.split(",")[0]?.trim() ?? "anonymous";
  }
  return "anonymous";
}
```

**Never** fail silently on missing IP — use `"anonymous"` as a fallback (this still rate-limits all requests without a forwarded IP together, which is safe).

---

## Response Headers

Always include these headers on rate-limited responses so clients and monitoring tools can parse the state:

| Header | Value |
|--------|-------|
| `Retry-After` | Seconds until the window resets |
| `X-RateLimit-Limit` | Max allowed attempts (`5`) |
| `X-RateLimit-Remaining` | Remaining attempts in current window |
| `X-RateLimit-Reset` | Unix timestamp (seconds) when window resets |

**Never include** the current attempt count in the response body — revealing this helps attackers calibrate.

---

## Constants Reference

```ts
// lib/constants.ts
export const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes in milliseconds
} as const;
```

---

## Upgrading to Redis (Post-MVP)

For production scale with multiple serverless instances, replace the in-memory store with Upstash Redis:

```ts
// lib/rate-limit/limiter.ts (Redis version — post-MVP)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiters = {
  "sign-in": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "securegate:sign-in",
  }),
  "forgot-password": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "securegate:forgot-password",
  }),
  "register": new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "securegate:register",
  }),
};

export async function checkRateLimit(ip: string, key: "sign-in" | "forgot-password" | "register") {
  return limiters[key].limit(ip);
}
```

Environment variables needed: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

---

## Checklist for Rate-Limited Endpoints

- [ ] `checkRateLimit` called as the **first** operation in the route
- [ ] IP extracted from `x-forwarded-for` with safe fallback
- [ ] HTTP `429` returned when limit exceeded
- [ ] `Retry-After` header included on `429` response
- [ ] No attempt count leaked in response body
- [ ] Rate limiting applied to `sign-in`, `forgot-password`, and `register` endpoints
- [ ] Constants imported from `@/lib/constants` (not hard-coded)
