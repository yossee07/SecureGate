// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth";

// NextAuth's handler function handles both GET and POST internally
export const GET = handlers;
export const POST = handlers;
