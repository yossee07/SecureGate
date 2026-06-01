import Link from "next/link";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-on-background">Welcome back</h1>
        <p className="text-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-on-surface-variant">
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
