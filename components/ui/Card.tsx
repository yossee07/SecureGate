import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border border-outline-variant bg-surface p-8 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
