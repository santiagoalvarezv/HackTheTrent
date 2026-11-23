import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";

type Provider = "google" | "apple" | "microsoft";
const NAMES: Record<Provider, string> = { google: "Google", apple: "Apple", microsoft: "Microsoft" };

const GoogleG = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="!size-[18px]"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);
const MicrosoftLogo = () => (
  <svg aria-hidden viewBox="0 0 21 21" className="!size-[18px]"><path fill="#F25022" d="M1 1h9v9H1z"/><path fill="#7FBA00" d="M11 1h9v9h-9z"/><path fill="#00A4EF" d="M1 11h9v9H1z"/><path fill="#FFB900" d="M11 11h9v9h-9z"/></svg>
);

/* Provider brand colours are required by each provider's button guidelines; they are not app theme colours. */
const BTN = "lift-glow btn-press inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl px-3 text-sm font-medium disabled:opacity-60";

export function SocialButtons({ onMessage }: { onMessage: (m: { tone: "info" | "error"; text: string } | null) => void }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const go = async (p: Provider) => {
    onMessage(null);
    setBusy(p);
    try {
      const res = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
      if (res.redirected) return;
      if (res.error) {
        const msg = String(res.error.message ?? res.error);
        if (/not (supported|enabled)|unsupported|provider/i.test(msg)) {
          onMessage({ tone: "info", text: `Sign in with ${NAMES[p]} is coming soon. Use email for now.` });
        } else if (!/cancel|closed/i.test(msg)) {
          onMessage({ tone: "error", text: "That sign-in didn't finish. Please try again." });
        }
        return;
      }
      window.location.assign("/");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={!!busy} onClick={() => go("google")} className={`${BTN} btn-google`}>
        <GoogleG /> {busy === "google" ? "Connecting..." : "Continue with Google"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => go("apple")} className={`${BTN} btn-apple`}>
        {busy === "apple" ? "Connecting..." : "Continue with Apple"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => go("microsoft")} className={`${BTN} btn-microsoft`}>
        <MicrosoftLogo /> {busy === "microsoft" ? "Connecting..." : "Continue with Microsoft"}
      </button>
    </div>
  );
}
