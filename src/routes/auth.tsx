import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Circle, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { VerifyEmail } from "@/components/auth/VerifyEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logInSchema, PASSWORD_RULES, passwordStrength, signUpSchema } from "@/lib/password";
import { cn } from "@/lib/utils";
import { rememberRedirect, safeRedirect, setGuest, takeRedirect } from "@/lessons/guest";
import { SERVER_UNREACHABLE, withTimeout } from "@/lib/with-timeout";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in or sign up — Hack the Trent" },
      { name: "description", content: "Create a free Hack the Trent account to save your lesson progress." },
      { property: "og:title", content: "Log in or sign up — Hack the Trent" },
      { property: "og:description", content: "Save your electronics lesson progress across devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string; tab?: "login" | "signup" } => {
    const redirect = safeRedirect(s["redirect"]);
    return { ...(redirect ? { redirect } : {}), ...(s["tab"] === "signup" ? { tab: "signup" as const } : {}) };
  },
  component: AuthPage,
});

/** After signing in (or choosing guest), go to the lesson that was clicked, else the lessons page. */
function useFinish() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  return () => { takeRedirect(); navigate({ href: redirect ?? "/", replace: true }); };
}

type Msg = { tone: "info" | "error"; text: string } | null;

function AuthPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">(search.tab ?? "login");
  const finish = useFinish();
  // Google/Apple/Microsoft return to the home page, which continues to this path.
  useEffect(() => { rememberRedirect(search.redirect); }, [search.redirect]);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-on-bg-muted hover:text-on-bg"><ArrowLeft className="size-4" /> Back to lessons</Link>
        <div className="rounded-2xl bg-card p-7 shadow-lift sm:p-9">
          {verifyEmail ? (
            <VerifyEmail email={verifyEmail} onChangeEmail={() => { setVerifyEmail(null); setTab("signup"); }} onVerified={finish} />
          ) : (
            <>
              <div role="tablist" aria-label="Account" className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
                {(["login", "signup"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setMsg(null); }}
                    className={cn("h-10 rounded-xl text-sm font-bold transition-colors", tab === t ? "bg-primary text-primary-foreground shadow-soft" : "text-secondary-foreground hover:bg-accent")}>
                    {t === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>
              <SocialButtons onMessage={setMsg} />
              {msg && <p role="alert" className={cn("mt-4 rounded-xl px-4 py-3 text-sm font-semibold", msg.tone === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>{msg.text}</p>}
              <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              {tab === "login" ? <LogInForm /> : <SignUpForm onSent={setVerifyEmail} />}
              <div className="mt-6 border-t pt-6">
                <Button type="button" variant="outline" size="xl" className="w-full" onClick={() => { setGuest(true); finish(); }}>
                  <UserRound /> Continue as guest
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">Every lesson is open. Your progress won't be saved.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function FieldError({ text }: { text?: string | undefined }) {
  return text ? <p role="alert" className="mt-1.5 text-sm font-semibold text-destructive">{text}</p> : null;
}

function LogInForm() {
  const finish = useFinish();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const form = useForm<z.infer<typeof logInSchema>>({ resolver: zodResolver(logInSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = form;
  const submit = handleSubmit(async (v) => {
    setError(null); setNote(null);
    let e: { message: string } | null;
    try { ({ error: e } = await withTimeout(supabase.auth.signInWithPassword({ email: v.email, password: v.password }))); }
    catch { setError(SERVER_UNREACHABLE); return; }
    if (e) {
      setError(/confirm/i.test(e.message) ? "Please verify your email first. Check your inbox for the code." : "That email and password don't match. Try again or reset your password.");
      return;
    }
    finish();
  });
  const forgot = async () => {
    setError(null); setNote(null);
    const email = getValues("email").trim();
    if (!email) { setError("Type your email above, then tap Forgot password."); return; }
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (e) setError("We couldn't send the reset email. Please try again in a minute.");
    else setNote("If that email has an account, a reset link is on its way.");
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div><Label htmlFor="li-email">Email</Label><Input id="li-email" type="email" autoComplete="email" className="mt-1.5 h-12 rounded-2xl text-base" {...register("email")} /><FieldError text={errors.email?.message} /></div>
      <div>
        <div className="flex items-center justify-between"><Label htmlFor="li-pass">Password</Label>
          <button type="button" onClick={forgot} className="text-sm font-semibold text-primary hover:underline">Forgot password?</button></div>
        <div className="mt-1.5"><PasswordInput id="li-pass" autoComplete="current-password" {...register("password")} /></div>
        <FieldError text={errors.password?.message} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
      {note && <p role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{note}</p>}
      <Button type="submit" size="xl" className="mt-2 w-full" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Log in"}</Button>
    </form>
  );
}

const STRENGTH = { weak: { w: "33%", c: "bg-destructive" }, medium: { w: "66%", c: "bg-highlight" }, strong: { w: "100%", c: "bg-success" } } as const;

function SignUpForm({ onSent }: { onSent: (email: string) => void }) {
  const finish = useFinish();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema), mode: "onChange", defaultValues: { name: "", email: "", password: "", confirm: "" } });
  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isValid, touchedFields } } = form;
  const pw = watch("password");
  const confirm = watch("confirm");
  const { strength } = passwordStrength(pw);
  const submit = handleSubmit(async (v) => {
    setError(null);
    let res;
    try {
      res = await withTimeout(supabase.auth.signUp({
        email: v.email, password: v.password,
        options: { data: { full_name: v.name }, emailRedirectTo: window.location.origin },
      }));
    } catch { setError(SERVER_UNREACHABLE); return; }
    const { data, error: e } = res;
    if (e) {
      setError(/registered|exists/i.test(e.message) ? "That email already has an account. Try logging in instead." : /password/i.test(e.message) ? e.message : "We couldn't create your account. Please try again.");
      return;
    }
    if (data.user && data.user.identities?.length === 0) { setError("That email already has an account. Try logging in instead."); return; }
    // Confirmation off: signed in straight away, continue to the clicked lesson. Otherwise show the code screen.
    if (data.session) { finish(); return; }
    onSent(v.email);
  });
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div><Label htmlFor="su-name">Name</Label><Input id="su-name" autoComplete="name" className="mt-1.5 h-12 rounded-2xl text-base" {...register("name")} /><FieldError text={touchedFields.name ? errors.name?.message : undefined} /></div>
      <div><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" autoComplete="email" className="mt-1.5 h-12 rounded-2xl text-base" {...register("email")} /><FieldError text={touchedFields.email ? errors.email?.message : undefined} /></div>
      <div>
        <Label htmlFor="su-pass">Password</Label>
        <div className="mt-1.5"><PasswordInput id="su-pass" autoComplete="new-password" {...register("password")} /></div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full transition-all duration-300", pw ? STRENGTH[strength].c : "")} style={{ width: pw ? STRENGTH[strength].w : "0%" }} /></div>
          <span className="w-16 text-right text-xs font-bold capitalize text-muted-foreground">{pw ? strength : ""}</span>
        </div>
        <ul className="mt-3 grid gap-1.5 text-sm" aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(pw);
            return (
              <li key={r.id} className={cn("flex items-center gap-2 transition-colors", ok ? "font-semibold text-success" : "text-muted-foreground")}>
                {ok ? <Check className="size-4" /> : <Circle className="size-4" />} {r.label}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <Label htmlFor="su-confirm">Confirm password</Label>
        <div className="mt-1.5"><PasswordInput id="su-confirm" autoComplete="new-password" {...register("confirm")} /></div>
        {confirm && <p className={cn("mt-1.5 text-sm font-semibold", confirm === pw ? "text-success" : "text-destructive")}>{confirm === pw ? "Passwords match" : "Passwords do not match"}</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit" size="xl" className="mt-2 w-full" disabled={!isValid || isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</Button>
    </form>
  );
}
