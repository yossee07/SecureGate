// lib/constants.ts

export const TOKEN_EXPIRY = {
  VERIFICATION: 15 * 60 * 1000,    // 15 minutes in ms
  PASSWORD_RESET: 60 * 60 * 1000,  // 1 hour in ms
} as const;

export const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes in milliseconds
} as const;

export const BCRYPT_SALT_ROUNDS = 12;
