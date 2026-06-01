// lib/tokens/validate.ts
import { db } from "@/lib/db/prisma";

export async function validateVerificationToken(token: string): Promise<
  | { valid: true; record: { id: string; identifier: string; expires: Date } }
  | { valid: false; error: string }
> {
  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false, error: "Token not found" };

  if (new Date() > record.expires) {
    // Clean up expired token
    await db.verificationToken.delete({ where: { id: record.id } });
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, record };
}

export async function validatePasswordResetToken(token: string): Promise<
  | { valid: true; record: { id: string; email: string; expires: Date } }
  | { valid: false; error: string }
> {
  const record = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false, error: "Token not found" };

  if (new Date() > record.expires) {
    await db.passwordResetToken.delete({ where: { id: record.id } });
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, record };
}
