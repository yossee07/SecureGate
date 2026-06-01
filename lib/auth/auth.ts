// lib/auth/auth.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const handler = NextAuth(authConfig);

export { handler as handlers };

export async function auth() {
  const { getServerSession } = await import("next-auth");
  return await getServerSession(authConfig);
}

// NextAuth type augmentation — expose user.id in sessions
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }
}
