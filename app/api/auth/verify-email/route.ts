// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { verifyEmailSchema } from "@/lib/validations/auth.schemas";
import { validateVerificationToken } from "@/lib/tokens/validate";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = verifyEmailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid token." },
        { status: 400 }
      );
    }

    const { token } = result.data;
    const validation = await validateVerificationToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error === "Token expired" ? "This link has expired. Please sign up again." : "Invalid verification link." },
        { status: 400 }
      );
    }

    const { identifier: email, id: tokenId } = validation.record;

    await db.$transaction([
      db.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({
        where: { id: tokenId },
      }),
    ]);

    return NextResponse.json(
      { message: "Email verified successfully. You can now sign in." },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Email verification failed", { error: String(error) });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
