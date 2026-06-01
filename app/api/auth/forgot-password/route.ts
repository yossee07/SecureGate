// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth.schemas";
import { generatePasswordResetToken } from "@/lib/tokens/generate";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit/limiter";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, "forgot-password");
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
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Always return the same message — don't reveal whether the email exists
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "If an account with that email exists, you will receive a reset link shortly." },
        { status: 200 }
      );
    }

    const token = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, token);

    return NextResponse.json(
      { message: "If an account with that email exists, you will receive a reset link shortly." },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Forgot password failed", { error: String(error) });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
