// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/prisma";
import { signUpSchema } from "@/lib/validations/auth.schemas";
import { generateVerificationToken } from "@/lib/tokens/generate";
import { sendVerificationEmail } from "@/lib/email/resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { maskEmail } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, "register");
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateCheck.resetAt),
          },
        }
      );
    }

    const body = await req.json();
    const result = signUpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await db.user.create({
      data: { name, email, password: hashedPassword },
    });

    const token = await generateVerificationToken(email);

    const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verificationUrl = `${BASE_URL}/verify-email/${token}`;
    console.log(`\n[DEV] Verification link for ${email}: ${verificationUrl}\n`);

    // Email failure must not block signup — user is already created
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      const errorMessage = String(emailError);
      logger.error("Verification email send failed after signup", { error: errorMessage });
      console.error("[EMAIL] Failed to send verification email:", errorMessage);
      console.log(`[DEV] Verification link for ${email}: ${verificationUrl}`);
    }

    return NextResponse.json(
      { message: `Account created. Check ${maskEmail(email)} to verify.` },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Registration failed", { error: String(error) });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
