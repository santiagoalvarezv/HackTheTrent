import { describe, expect, it } from "vitest";
import { markComplete, progressOf, readStep, saveStep, type StepStore } from "./progress";

/** In-memory stand-in for the browser's storage. */
function memoryStore(seed: Record<string, string> = {}): StepStore & Record<string, string> {
  const data: Record<string, string> = { ...seed };
  return {
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    ...data,
  } as StepStore & Record<string, string>;
}

const KEY = "htl:progress:blinking-led";

describe("lesson progress storage", () => {
  it("has no progress for a lesson that was never opened", () => {
    expect(readStep("blinking-led", memoryStore())).toBe(-1);
  });

  it("keeps the step it is given under the lesson's own key", () => {
    const store = memoryStore();
    saveStep("blinking-led", 3, store);
    expect(store.getItem(KEY)).toBe("3");
    expect(readStep("blinking-led", store)).toBe(3);
  });

  it("ignores a stored value that is not a whole step number", () => {
    expect(readStep("blinking-led", memoryStore({ [KEY]: "abc" }))).toBe(-1);
    expect(readStep("blinking-led", memoryStore({ [KEY]: "-2" }))).toBe(-1);
    expect(readStep("blinking-led", memoryStore({ [KEY]: "1.5" }))).toBe(-1);
  });

  it("never moves the furthest step backwards", () => {
    const store = memoryStore();
    saveStep("blinking-led", 5, store);
    saveStep("blinking-led", 1, store);
    expect(readStep("blinking-led", store)).toBe(5);
  });

  it("counts the last step as finished", () => {
    const store = memoryStore();
    markComplete("blinking-led", 7, store);
    expect(readStep("blinking-led", store)).toBe(6);
    expect(progressOf(readStep("blinking-led", store), 7).done).toBe(true);
  });

  it("reports one step of six as 17 percent, and the last step as complete", () => {
    expect(progressOf(0, 6)).toEqual({ started: true, done: false, step: 1, pct: 17 });
    expect(progressOf(-1, 6)).toEqual({ started: false, done: false, step: 0, pct: 0 });
    expect(progressOf(5, 6)).toEqual({ started: true, done: true, step: 6, pct: 100 });
    expect(progressOf(2, 7).pct).toBe(43);
  });

  it("keeps lessons apart from each other", () => {
    const store = memoryStore();
    saveStep("first-led", 4, store);
    expect(readStep("first-led", store)).toBe(4);
    expect(readStep("buzzer-alarm", store)).toBe(-1);
  });
});
