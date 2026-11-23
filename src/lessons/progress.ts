/**
 * Where a learner stopped in each lesson, kept in this browser only.
 * Pure functions over a storage object so the rules are testable without a DOM.
 */
const PREFIX = "htl:progress:";

export interface StepStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The browser's own store, or nothing when storage is unavailable. */
export function localStore(): StepStore | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Furthest step index reached, 0 based; -1 when the lesson was never opened. */
export function readStep(lessonId: string, store: StepStore | undefined = localStore()): number {
  if (!store) return -1;
  let raw: string | null;
  try {
    raw = store.getItem(PREFIX + lessonId);
  } catch {
    return -1;
  }
  if (raw === null) return -1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

/** Records the furthest step reached; going back a step never lowers it. */
export function saveStep(lessonId: string, step: number, store: StepStore | undefined = localStore()): number {
  const best = Math.max(readStep(lessonId, store), step);
  if (!store || !Number.isInteger(step) || step < 0) return best;
  try {
    store.setItem(PREFIX + lessonId, String(best));
  } catch {
    /* storage disabled: progress simply is not kept */
  }
  return best;
}

/** The last step counts as finished. */
export function markComplete(lessonId: string, totalSteps: number, store: StepStore | undefined = localStore()): number {
  return saveStep(lessonId, totalSteps - 1, store);
}

export interface Progress {
  started: boolean;
  done: boolean;
  /** Steps reached, 1 based. */
  step: number;
  pct: number;
}

export function progressOf(step: number, totalSteps: number): Progress {
  if (totalSteps <= 0) return { started: false, done: false, step: 0, pct: 0 };
  const reached = Math.max(0, Math.min(step + 1, totalSteps));
  return {
    started: step >= 0,
    done: step >= totalSteps - 1,
    step: reached,
    pct: Math.round((reached / totalSteps) * 100),
  };
}
