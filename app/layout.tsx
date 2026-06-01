import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../tokens/tokens.css";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SecureGate — Secure Identity Management",
  description: "Production-grade authentication, identity verification, and security hardening.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${manrope.className} antialiased bg-background text-on-background min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
