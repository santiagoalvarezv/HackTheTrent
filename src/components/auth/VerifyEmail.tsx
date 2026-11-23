import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function VerifyEmail({ email, onChangeEmail, onVerified }: { email: string; onChangeEmail: () => void; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const verify = async () => {
    setBusy(true); setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
    setBusy(false);
    if (e) {
      setError(/expired/i.test(e.message) ? "This code has expired. Tap Resend code to get a new one." : "That code isn't right. Check the 6 digits and try again.");
      return;
    }
    onVerified();
  };
  const resend = async () => {
    setError(null); setNote(null);
    const { error: e } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
    if (e) setError("We couldn't send a new code right now. Please wait a minute and try again.");
    else { setNote("A new code is on its way."); setCooldown(30); }
  };
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl font-semibold">Verify your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>.</p>
      <form className="mt-6 flex w-full flex-col items-center gap-5" onSubmit={(e) => { e.preventDefault(); if (code.length === 6) void verify(); }}>
        <InputOTP maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} autoFocus aria-label="6-digit code">
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((k) => <InputOTPSlot key={k} index={k} className="size-12 rounded-xl border font-mono text-lg first:rounded-xl last:rounded-xl" />)}
          </InputOTPGroup>
        </InputOTP>
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        {note && <p role="status" className="text-sm font-semibold text-success">{note}</p>}
        <Button type="submit" size="xl" className="w-full" disabled={code.length !== 6 || busy}>{busy ? "Verifying..." : "Verify"}</Button>
      </form>
      <div className="mt-4 flex w-full items-center justify-between text-sm">
        <button type="button" onClick={onChangeEmail} className="font-semibold text-primary hover:underline">Change email</button>
        <Button type="button" variant="outline" size="sm" className="h-9" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>
      </div>
    </div>
  );
}
