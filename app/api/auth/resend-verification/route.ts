import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { z } from "zod";
import { generateVerificationToken } from "@/lib/tokens/generate";
import { sendVerificationEmail } from "@/lib/email/resend";

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const { email } = result.data;

    const user = await db.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });

    // Always respond with generic message to prevent email enumeration
    if (!user || user.emailVerified !== null) {
      return NextResponse.json({
        message: "If the account exists and is unverified, a new verification email has been sent.",
      });
    }

    const token = await generateVerificationToken(email);
    await sendVerificationEmail(email, token);

    return NextResponse.json({
      message: "Verification email sent! Check your inbox.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
