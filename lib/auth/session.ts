// lib/auth/session.ts
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authConfig } from "./auth.config";

export async function getServerSession() {
  return await nextAuthGetServerSession(authConfig);
}
