// lib/logger.ts

export const logger = {
  error: (message: string, meta?: Record<string, unknown>): void => {
    console.error(JSON.stringify({ level: "error", message, ...meta }));
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(JSON.stringify({ level: "info", message, ...meta }));
  },
};
