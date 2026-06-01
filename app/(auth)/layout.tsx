// app/(auth)/layout.tsx
import { Card } from "@/components/ui/Card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card>{children}</Card>
    </main>
  );
}
