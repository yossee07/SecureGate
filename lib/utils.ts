// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Masks an email address for safe display in the UI.
 * e.g. "john@example.com" → "j***@example.com"
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***@***.***";
  const masked = localPart.charAt(0) + "***";
  return `${masked}@${domain}`;
}

/**
 * Pure helper to check if a token date has expired.
 */
export function isTokenExpired(expires: Date): boolean {
  return new Date() > expires;
}
