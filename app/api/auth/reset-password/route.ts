// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth.schemas";
import { validatePasswordResetToken } from "@/lib/tokens/validate";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const { token, password } = result.data;
    const validation = await validatePasswordResetToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error === "Token expired" ? "This link has expired. Please request a new reset link." : "Invalid reset link." },
        { status: 400 }
      );
    }

    const { email, id: tokenId } = validation.record;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await db.$transaction([
      db.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.delete({
        where: { id: tokenId },
      }),
    ]);

    return NextResponse.json(
      { message: "Password reset successfully. You can now sign in with your new password." },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Password reset failed", { error: String(error) });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
