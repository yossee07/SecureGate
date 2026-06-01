// lib/tokens/generate.ts
import { randomBytes } from "crypto";
import { db } from "@/lib/db/prisma";
import { TOKEN_EXPIRY } from "@/lib/constants";

export async function generateVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 256-bit token
  const expires = new Date(Date.now() + TOKEN_EXPIRY.VERIFICATION); // 15 min

  // Delete any existing token for this email before creating a new one
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return token;
}

export async function generatePasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 256-bit token
  const expires = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET); // 1 hour

  // Delete existing reset tokens for this email
  await db.passwordResetToken.deleteMany({
    where: { email },
  });

  await db.passwordResetToken.create({
    data: { email, token, expires },
  });

  return token;
}
