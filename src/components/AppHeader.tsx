import { Link } from "@tanstack/react-router";
import { CircuitBoard } from "lucide-react";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/UserMenu";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        <Link to="/" className="flex items-center gap-3 rounded-xl">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft"><CircuitBoard className="size-4" strokeWidth={2} /></span>
          <span className="brand-wordmark">Electriality</span>
        </Link>
        {children}
      </div>
      <UserMenu />
    </header>
  );
}
