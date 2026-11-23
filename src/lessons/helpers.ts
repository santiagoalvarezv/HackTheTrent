import type { LessonComponent } from "./types";

export const RED = "#c62828", BLACK = "#22252a", YELLOW = "#d9a400", GREEN = "#2e8b57", BLUE = "#2456b8", WHITE = "#e8e8e4", ORANGE = "#e3741c";
const COLOR_NAME: Record<string, string> = { [RED]: "red", [BLACK]: "black", [YELLOW]: "yellow", [GREEN]: "green", [BLUE]: "blue", [WHITE]: "white", [ORANGE]: "orange" };

type Extra = Partial<LessonComponent>;

export const wire = (ref: string, a: string, b: string, color: string, value: string, extra: Extra = {}): LessonComponent => ({
  ref, kind: "wire", name: a.startsWith("S:") ? `Wire link, ${COLOR_NAME[color] ?? "solid"} insulated` : `Jumper wire, ${COLOR_NAME[color] ?? ""}`,
  value, pins: { a, b }, color, ...extra,
});
export const res = (ref: string, a: string, b: string, ohms: number, value: string, extra: Extra = {}): LessonComponent => ({
  ref, kind: "resistor", name: "Resistor, carbon film, 1/4 W", value, pins: { a, b }, ohms, ...extra,
});
export const led = (ref: string, anode: string, cathode: string, extra: Extra = {}): LessonComponent => ({
  ref, kind: "led", name: `LED, ${extra.size === 3 ? 3 : 5} mm, red`, value: "Vf ≈ 2.0 V, 20 mA max", pins: { anode, cathode }, ...extra,
});
export const ecap = (ref: string, pos: string, neg: string, farads: number, value: string, size: number, bodyH: number): LessonComponent => ({
  ref, kind: "capacitor_electrolytic", name: "Electrolytic capacitor, radial", value, pins: { pos, neg }, farads, size, bodyH,
});
export const ccap = (ref: string, a: string, b: string, farads: number, value: string): LessonComponent => ({
  ref, kind: "capacitor_ceramic", name: "Ceramic capacitor", value, pins: { a, b }, farads,
});
export const diode = (ref: string, anode: string, cathode: string, variant: "1N4148" | "1N4007"): LessonComponent => ({
  ref, kind: "diode", name: variant === "1N4148" ? "Signal diode, DO-35" : "Rectifier diode, DO-41", value: variant === "1N4148" ? "1N4148, 100 V 200 mA" : "1N4007, 1000 V 1 A",
  pins: { anode, cathode }, variant,
});
export const dip = (ref: string, kind: "ic_dip8" | "ic_dip16", name: string, value: string, marking: string, pins: string[]): LessonComponent => ({
  ref, kind, name, value, marking, pins: Object.fromEntries(pins.map((p, i) => [String(i + 1), p])),
});
export const battery2aa = (pos: string, neg: string): LessonComponent => ({
  ref: "B1", kind: "battery", name: "Battery holder, 2×AA, with leads", value: "3.0 V", pins: { pos, neg },
});
export const battery9v = (pos: string, neg: string, at: [number, number] = [-27, -2]): LessonComponent => ({
  ref: "B1", kind: "battery9v", name: "9 V battery (PP3) with snap connector", value: "9.0 V", pins: { pos, neg }, at,
});
export const button = (a1: string, a2: string, b1: string, b2: string): LessonComponent => ({
  ref: "SW1", kind: "pushbutton", name: "Tactile push button, 6×6 mm", value: "Normally open, momentary", pins: { a1, a2, b1, b2 },
});

/** A DIP straddling a stripboard: pins 1..n/2 down column `c1` from row r0, the rest back up column `c2`. */
export function stripDip(c1: string, c2: string, r0: number, n: number): string[] {
  const half = n / 2;
  const left = Array.from({ length: half }, (_, i) => `S:${c1}${r0 + i}`);
  const right = Array.from({ length: half }, (_, i) => `S:${c2}${r0 + half - 1 - i}`);
  return [...left, ...right];
}
