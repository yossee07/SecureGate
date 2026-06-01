import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Card } from "@/components/ui/Card";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-on-background">Create your account</h1>
            <p className="text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
          <SignUpForm />
        </div>
      </Card>
    </main>
  );
}
