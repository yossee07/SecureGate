import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations/auth.schemas";
import { checkRateLimit } from "@/lib/rate-limit/limiter";

export const authConfig: NextAuthOptions = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const result = signInSchema.safeParse(credentials);
        if (!result.success) return null;

        const { email, password } = result.data;

        // Rate limit sign-in attempts by IP
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = forwarded?.split(",")[0]?.trim() ?? "anonymous";
        const rateCheck = checkRateLimit(ip, "sign-in");
        if (!rateCheck.success) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            emailVerified: true,
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new Error("EmailNotVerified");
        }

        return { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = (user as unknown as Record<string, unknown>).emailVerified as string | null ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        const verifiedStr = (token as unknown as Record<string, unknown>).emailVerified as string | null | undefined;
        (session.user as unknown as Record<string, unknown>).emailVerified = verifiedStr ? new Date(verifiedStr) : null;
      }
      return session;
    },
  },
};
