import { RATE_LIMIT } from "@/lib/constants";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

type RateLimitKey = "sign-in" | "forgot-password" | "register";

const ENDPOINT_LIMITS: Record<RateLimitKey, number> = {
  "sign-in": 5,
  "forgot-password": 3,
  register: 3,
};

export function checkRateLimit(
  ip: string,
  key: RateLimitKey
): { success: boolean; remaining: number; resetAt: number; limit: number } {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const maxAttempts = ENDPOINT_LIMITS[key] ?? RATE_LIMIT.MAX_ATTEMPTS;

  const existing = store.get(storeKey);

  // Window expired — reset
  if (!existing || now > existing.resetAt) {
    store.set(storeKey, { count: 1, resetAt: now + RATE_LIMIT.WINDOW_MS });
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetAt: now + RATE_LIMIT.WINDOW_MS,
      limit: maxAttempts,
    };
  }

  // Limit exceeded
  if (existing.count >= maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: maxAttempts,
    };
  }

  // Increment counter
  store.set(storeKey, { ...existing, count: existing.count + 1 });
  return {
    success: true,
    remaining: maxAttempts - existing.count - 1,
    resetAt: existing.resetAt,
    limit: maxAttempts,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "anonymous";
  }
  return "anonymous";
}
