import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Hack the Trent" },
      { name: "description", content: "Set a new password for your Hack the Trent account." },
      { property: "og:title", content: "Choose a new password — Hack the Trent" },
      { property: "og:description", content: "Set a new password for your Hack the Trent account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const check = passwordSchema.safeParse(pw);
    if (!check.success) { setError(`Password needs: ${check.error.issues[0]?.message.toLowerCase()}.`); return; }
    if (pw !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) { setError("This reset link has expired. Request a new one from the log in page."); return; }
    navigate({ to: "/" });
  };
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-8 shadow-lift">
        <h1 className="text-3xl font-semibold">Choose a new password</h1>
        <div><Label htmlFor="rp1">New password</Label><div className="mt-1.5"><PasswordInput id="rp1" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div></div>
        <div><Label htmlFor="rp2">Confirm password</Label><div className="mt-1.5"><PasswordInput id="rp2" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div></div>
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" size="xl" disabled={busy}>{busy ? "Saving..." : "Save password"}</Button>
      </form>
    </main>
  );
}
