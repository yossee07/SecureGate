// lib/email/resend.ts
import { Resend } from "resend";
import { verificationEmailHtml } from "./templates/verification-email";
import { resetPasswordEmailHtml } from "./templates/reset-password-email";

export const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "SecureGate <noreply@yourdomain.com>";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${BASE_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Verify your email address — SecureGate",
    html: verificationEmailHtml(verificationUrl),
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "Reset your password — SecureGate",
    html: resetPasswordEmailHtml(resetUrl),
  });
}
