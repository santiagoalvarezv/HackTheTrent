import { netOf, stripNetOf } from "./board";
import type { LessonComponent } from "./types";

export const SUPPLY_V = 3.0; // 2 x AA
export const LED_VF = 2.0; // red LED forward voltage
export const LED_MAX_MA = 20;
export const R1_OHMS = 220;
export const BATTERY_RINT = 2.0; // internal resistance of 2 x AA, ohms (approx.)
export const BUZZER_MA = 15; // active piezo buzzer at 3 V
export const BUZZER_HZ = 2300;
export const TLC555_VOH = 2.7; // output high at 3 V, light load

type NetFn = (pin: string) => string;

/** Union-find over breadboard strips + wires + switch contacts. */
export interface NetOptions {
  /** Stripboard track cuts, e.g. ["S:E5"]. */
  cuts?: readonly string[];
  /** Refs whose stripboard joints are not soldered yet (their pins connect to nothing). */
  unsoldered?: readonly string[];
}

/** Breadboard strip, stripboard copper segment, or rail a pin belongs to. */
export function netOfPin(pin: string, opts: NetOptions = {}): string {
  return pin.startsWith("S:") ? stripNetOf(pin, opts.cuts ?? []) : netOf(pin);
}

export function solveNets(parts: LessonComponent[], pressed: readonly string[] = [], opts: NetOptions = {}): NetFn {
  const isolated = new Set<string>();
  for (const c of parts) if (opts.unsoldered?.includes(c.ref)) for (const p of Object.values(c.pins)) if (p.startsWith("S:")) isolated.add(p);
  const base = (pin: string) => (isolated.has(pin) ? `open:${pin}` : netOfPin(pin, opts));
  const parent = new Map<string, string>();
  const find = (n: string): string => {
    const p = parent.get(n) ?? n;
    if (p === n) return n;
    const root = find(p);
    parent.set(n, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(base(a)), rb = find(base(b));
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const c of parts) {
    const p = c.pins;
    if (c.kind === "wire" && p["a"] && p["b"]) union(p["a"], p["b"]);
    if (c.kind === "pushbutton" && p["a1"] && p["a2"] && p["b1"] && p["b2"]) {
      union(p["a1"], p["a2"]);
      union(p["b1"], p["b2"]);
      if (pressed.includes(c.ref)) union(p["a1"], p["b1"]);
    }
  }
  return (pin) => find(base(pin));
}

export type CircuitStatus = "incomplete" | "open" | "short" | "bypass" | "reversed" | "overcurrent" | "lit" | "buzzing";

export interface CircuitResult {
  status: CircuitStatus;
  /** Loop current in mA. */
  currentMa: number;
}

export function ledCurrentMa(ohms: number): number {
  return ((SUPPLY_V - LED_VF) / (ohms + BATTERY_RINT)) * 1000;
}

const pin = (c: LessonComponent, name: string) => {
  const p = c.pins[name];
  if (!p) throw new Error(`${c.ref} has no pin ${name}`);
  return p;
};

/** Single-loop DC analysis: battery, LEDs, buzzers, resistors, wires, switches. */
export function evaluateCircuit(parts: LessonComponent[], pressed: readonly string[] = [], opts: NetOptions = {}): CircuitResult {
  const net = solveNets(parts, pressed, opts);
  const battery = parts.find((c) => c.kind === "battery");
  const hasLoad = parts.some((c) => c.kind === "led" || c.kind === "buzzer");
  if (!battery || !hasLoad) return { status: "incomplete", currentMa: 0 };

  const P = net(pin(battery, "pos"));
  const N = net(pin(battery, "neg"));
  if (P === N) return { status: "short", currentMa: 0 };

  type Edge = { from: string; to: string; load: "led" | "buzzer" | null; forward: boolean; ohms: number };
  const edges: Edge[] = [];
  for (const c of parts) {
    if (c.kind === "led" || c.kind === "buzzer") {
      const a = net(pin(c, c.kind === "led" ? "anode" : "pos"));
      const k = net(pin(c, c.kind === "led" ? "cathode" : "neg"));
      edges.push({ from: a, to: k, load: c.kind, forward: true, ohms: 0 });
      edges.push({ from: k, to: a, load: c.kind, forward: false, ohms: 0 });
    } else if (c.kind === "resistor") {
      const a = net(pin(c, "a")), b = net(pin(c, "b"));
      const ohms = c.ohms ?? 0;
      edges.push({ from: a, to: b, load: null, forward: true, ohms });
      edges.push({ from: b, to: a, load: null, forward: true, ohms });
    }
  }

  const paths: Edge[][] = [];
  const walk = (node: string, seen: Set<string>, path: Edge[]) => {
    if (node === N) { paths.push(path); return; }
    for (const e of edges) {
      if (e.from !== node || e.from === e.to || seen.has(e.to)) continue;
      walk(e.to, new Set([...seen, e.to]), [...path, e]);
    }
  };
  walk(P, new Set([P]), []);

  if (paths.some((p) => !p.some((e) => e.load))) return { status: "bypass", currentMa: 0 };
  const good = paths.find((p) => p.every((e) => !e.load || e.forward));
  if (good) {
    if (good.some((e) => e.load === "buzzer")) return { status: "buzzing", currentMa: BUZZER_MA };
    const ohms = good.reduce((s, e) => s + e.ohms, 0);
    if (ohms === 0) return { status: "overcurrent", currentMa: ledCurrentMa(0) };
    return { status: "lit", currentMa: ledCurrentMa(ohms) };
  }
  if (paths.length > 0) return { status: "reversed", currentMa: 0 };
  return { status: "open", currentMa: 0 };
}

/** 555 astable timing: t_high = 0.693(R1+R2)C, t_low = 0.693·R2·C, f = 1/(t_high+t_low) ≈ 1.44/((R1+2R2)C). */
export function astableTiming(r1: number, r2: number, c: number) {
  const tHigh = 0.693 * (r1 + r2) * c;
  const tLow = 0.693 * r2 * c;
  const period = tHigh + tLow;
  return { tHigh, tLow, period, f: 1 / period, duty: tHigh / period };
}

export interface AstableResult {
  ok: boolean;
  fault?: string;
  f: number;
  duty: number;
  tHigh: number;
  tLow: number;
  ledMa: number;
  r1: number;
  r2: number;
  c1: number;
}

/** 555 astable: checks the nets, then computes timing from R1, R2, C1. */
export function evaluateAstable(parts: LessonComponent[], overrides: { r2?: number } = {}): AstableResult {
  const by = (ref: string) => parts.find((c) => c.ref === ref);
  const bat = parts.find((c) => c.kind === "battery");
  const u1 = parts.find((c) => c.kind === "ic_dip8");
  const [r1, r2, r3, c1, c2, d1] = ["R1", "R2", "R3", "C1", "C2", "D1"].map(by);
  const base = { f: 0, duty: 0, tHigh: 0, tLow: 0, ledMa: 0, r1: 0, r2: 0, c1: 0 };
  if (!bat || !u1 || !r1 || !r2 || !r3 || !c1 || !c2 || !d1) return { ok: false, fault: "Incomplete: place all parts.", ...base };

  const net = solveNets(parts);
  const VCC = net(pin(bat, "pos")), GND = net(pin(bat, "neg"));
  const u = (n: number) => net(pin(u1, String(n)));
  const between = (c: LessonComponent, x: string, y: string, a = "a", b = "b") => {
    const na = net(pin(c, a)), nb = net(pin(c, b));
    return (na === x && nb === y) || (na === y && nb === x);
  };
  const ledPath =
    (net(pin(r3, "a")) === u(3) && net(pin(r3, "b")) === net(pin(d1, "anode"))) ||
    (net(pin(r3, "b")) === u(3) && net(pin(r3, "a")) === net(pin(d1, "anode")));
  const checks: [boolean, string][] = [
    [u(8) === VCC, "U1 pin 8 (VCC) is not connected to +."],
    [u(1) === GND, "U1 pin 1 (GND) is not connected to −."],
    [u(4) === VCC, "U1 pin 4 (RESET) must be tied to +, otherwise the output stays low."],
    [u(2) === u(6), "Pins 2 (TRIG) and 6 (THRESH) must be connected together."],
    [between(r1, VCC, u(7)), "R1 must connect + to pin 7 (DISCH)."],
    [between(r2, u(7), u(6)), "R2 must connect pin 7 to pin 6."],
    [net(pin(c1, "pos")) === u(6) && net(pin(c1, "neg")) === GND, "C1 + must be on the pin 2/6 node and C1 − on GND."],
    [between(c2, u(5), GND), "C2 must decouple pin 5 (CTRL) to GND."],
    [ledPath && net(pin(d1, "cathode")) === GND, "D1 must go from R3 (pin 3 output) to GND, anode first."],
  ];
  const failed = checks.find(([ok]) => !ok);
  if (failed) return { ok: false, fault: failed[1], ...base };

  const R1 = r1.ohms ?? 0, R2 = overrides.r2 ?? r2.ohms ?? 0, C = c1.farads ?? 0;
  const { tHigh, tLow, f, duty } = astableTiming(R1, R2, C);
  return {
    ok: true, tHigh, tLow, f, duty,
    ledMa: ((TLC555_VOH - LED_VF) / (r3.ohms ?? 1)) * 1000, r1: R1, r2: R2, c1: C,
  };
}

export function statusMessage(r: CircuitResult): { title: string; text: string; tone: "neutral" | "ok" | "warn" | "error" } {
  switch (r.status) {
    case "incomplete":
      return { title: "Incomplete", text: "Place the load and the battery holder to start.", tone: "neutral" };
    case "open":
      return { title: "Open circuit", text: "There is no closed path from + to −. A breadboard column only links holes a–e (or f–j) in that same column. I = 0 mA.", tone: "neutral" };
    case "short":
      return { title: "Short circuit", text: "+ and − are connected directly. Remove the wire that links the two rails.", tone: "error" };
    case "bypass":
      return { title: "Load bypassed", text: "Current can reach − without passing through the LED or buzzer.", tone: "warn" };
    case "reversed":
      return { title: "Reverse-biased", text: "The + leg (LED anode or buzzer +) must face the + side. Reversed, the part blocks current: I = 0 mA.", tone: "warn" };
    case "overcurrent":
      return { title: "LED overcurrent", text: "No current-limiting resistor. Estimated current far above 20 mA rating; LED damaged.", tone: "error" };
    case "buzzing":
      return { title: "BZ1 on", text: `BZ1 on, ≈ ${BUZZER_MA} mA. Built-in oscillator ≈ ${(BUZZER_HZ / 1000).toFixed(1)} kHz.`, tone: "ok" };
    case "lit":
      return {
        title: "Circuit closed",
        text: `I = (${SUPPLY_V.toFixed(1)} V − ${LED_VF.toFixed(1)} V) / ${R1_OHMS} Ω ≈ ${r.currentMa.toFixed(1)} mA, within the ${LED_MAX_MA} mA LED rating.`,
        tone: "ok",
      };
  }
}
