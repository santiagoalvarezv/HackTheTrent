import { getLesson } from "./data";
import type { LessonComponent } from "./types";

/** Free-build state for P-01. */
export interface BuildState {
  battery: boolean;
  led: "fwd" | "rev" | null;
  resistor: boolean;
  wireRed: boolean;
  wireBlack: "a20" | "a13" | null;
}

export const EMPTY_BUILD: BuildState = { battery: false, led: null, resistor: false, wireRed: false, wireBlack: null };
export const FULL_BUILD: BuildState = { battery: true, led: "fwd", resistor: true, wireRed: true, wireBlack: "a20" };

export type FreeKey = keyof BuildState;
export const FREE_KEYS: Record<FreeKey, string> = { battery: "B1", led: "D1", resistor: "R1", wireRed: "W1", wireBlack: "W2" };

export const PLACEMENT_OPTIONS: Record<FreeKey, { option: string; pins: string[]; label: string }[]> = {
  battery: [{ option: "std", pins: ["top+:0", "top-:0"], label: "Red lead → top + rail, black lead → top − rail" }],
  led: [{ option: "fwd", pins: ["e10", "e13"], label: "Anode e10, cathode e13" }],
  resistor: [{ option: "std", pins: ["d13", "d20"], label: "d13 → d20" }],
  wireRed: [{ option: "std", pins: ["top+:8", "a10"], label: "+ rail → a10" }],
  wireBlack: [
    { option: "a20", pins: ["a20", "top-:16"], label: "a20 → − rail (through R1)" },
    { option: "a13", pins: ["a13", "top-:10"], label: "a13 → − rail (skips R1)" },
  ],
};

function base(): LessonComponent[] {
  return getLesson("first-led")!.components;
}

/** All five P-01 parts, with pins as they would sit for this state. */
export function allComponents(s: BuildState): LessonComponent[] {
  return base().map((c) => {
    if (c.ref === "D1" && s.led === "rev") return { ...c, pins: { anode: "e13", cathode: "e10" } };
    if (c.ref === "W2" && s.wireBlack === "a13") return { ...c, pins: { a: "a13", b: "top-:10" } };
    return c;
  });
}

export function placedRefs(s: BuildState): string[] {
  return (Object.keys(FREE_KEYS) as FreeKey[]).filter((k) => s[k]).map((k) => FREE_KEYS[k]);
}

export function toComponents(s: BuildState): LessonComponent[] {
  const refs = placedRefs(s);
  return allComponents(s).filter((c) => refs.includes(c.ref));
}
