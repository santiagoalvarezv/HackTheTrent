import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, LogIn, LogOut, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { setGuest, useGuest } from "@/lessons/guest";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

export function UserMenu() {
  const { user, ready } = useAuth();
  const guest = useGuest();
  const navigate = useNavigate();
  if (!ready) return <span className="h-9 w-24" aria-hidden />;
  if (!user && guest) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Guest menu" className="lift-glow flex h-10 shrink-0 items-center gap-2 rounded-full bg-card px-3 text-sm font-semibold text-foreground">
          <UserRound className="size-4" /> Guest
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl">
          <DropdownMenuLabel className="font-normal"><span className="block font-semibold">Guest</span><span className="text-xs text-muted-foreground">Progress is not saved</span></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: "/auth", search: { tab: "signup" } })}><UserPlus /> Sign up</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate({ to: "/auth" })}><LogIn /> Log in</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setGuest(false); navigate({ to: "/", replace: true }); }}><LogOut /> Exit guest mode</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (!user) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden truncate text-sm text-on-bg-muted sm:inline">Sign in to save your progress</span>
        <Button asChild size="sm" className="h-9 shrink-0 px-4"><Link to="/auth"><LogIn /> Log in</Link></Button>
      </div>
    );
  }
  const name = (user.user_metadata?.["full_name"] as string | undefined) ?? (user.user_metadata?.["name"] as string | undefined) ?? user.email ?? "You";
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="lift-glow grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <DropdownMenuLabel className="truncate font-normal"><span className="block font-semibold">{name}</span><span className="text-xs text-muted-foreground">{user.email}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/", hash: "lessons" })}><BarChart3 /> My progress</DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }}><LogOut /> Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
