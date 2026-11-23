/**
 * Guest mode: lessons open without an account, progress lives only in memory for this page.
 * The "chose guest" flag is per tab (sessionStorage) so the auth screen is not shown again this visit.
 */
import { useSyncExternalStore } from "react";

const FLAG = "htt:guest";
const AFTER = "htt:after-auth";
let guest: boolean | null = null;
const steps = new Map<string, number>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function isGuest(): boolean {
  if (guest === null) {
    try { guest = typeof window !== "undefined" && sessionStorage.getItem(FLAG) === "1"; } catch { guest = false; }
  }
  return guest;
}
export function setGuest(on: boolean) {
  guest = on;
  try { if (on) sessionStorage.setItem(FLAG, "1"); else sessionStorage.removeItem(FLAG); } catch { /* memory only */ }
  if (!on) steps.clear();
  emit();
}
export function useGuest(): boolean {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, isGuest, () => false);
}

/** In-memory furthest step for guests; never lowered by going back. */
export function guestStep(lessonId: string): number { return steps.get(lessonId) ?? -1; }
export function saveGuestStep(lessonId: string, step: number) {
  steps.set(lessonId, Math.max(guestStep(lessonId), step));
  emit();
}

/** Only same-site paths are accepted as a place to return to after signing in. */
export function safeRedirect(path: unknown): string | undefined {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : undefined;
}
/** Remembered across the Google/Apple/Microsoft round trip, which returns to the home page. */
export function rememberRedirect(path: string | undefined) {
  try { if (path) sessionStorage.setItem(AFTER, path); else sessionStorage.removeItem(AFTER); } catch { /* ignore */ }
}
export function takeRedirect(): string | undefined {
  try { const p = sessionStorage.getItem(AFTER); sessionStorage.removeItem(AFTER); return safeRedirect(p); } catch { return undefined; }
}
