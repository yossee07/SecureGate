import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authPages = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/verify-email-info"];
const protectedPages = ["/dashboard"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const secret = process.env.NEXTAUTH_SECRET;

  const token = await getToken({
    req,
    ...(secret ? { secret } : {}),
  });

  const isAuthenticated = !!token;

  if (isAuthenticated && authPages.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isAuthenticated && protectedPages.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password/:path*",
    "/verify-email/:path*",
    "/verify-email-info",
  ],
};
