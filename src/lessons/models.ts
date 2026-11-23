import { BUZZER_MA, LED_VF, solveNets, type NetOptions } from "./circuit";
import type { Lesson, LessonComponent } from "./types";

export type LedDrive =
  | { mode: "off" }
  | { mode: "on"; level?: number }
  | { mode: "burned" }
  | { mode: "blink"; tHigh: number; tLow: number }
  /** Constant brightness 0..1. */
  | { mode: "level"; b: number }
  /** Exponential fade from b0 with time constant tau, starting at `since` (performance.now()/1000). */
  | { mode: "decay"; b0: number; tau: number; since: number }
  /** One of `count` LEDs lit in turn at `hz` steps per second. */
  | { mode: "chase"; index: number; count: number; hz: number };

export interface ScopeChannel {
  label: string;
  tone: "warning" | "success";
  vmax: number;
  /** Voltage at time t (s). */
  v: (t: number) => number;
}

export interface Sim {
  ok: boolean;
  title: string;
  text: string;
  tone: "neutral" | "ok" | "warn" | "error";
  readout: string;
  leds: Record<string, LedDrive>;
  buzzer?: boolean;
  /** Audio test tone through the speaker, gain 0..1. */
  audio?: { hz: number; gain: number };
  /** Motor speed 0..1. */
  motor?: number;
  scope?: { span: number; channels: ScopeChannel[] };
  values: Record<string, number>;
}

/** "REF.pin" → board pin. */
export function memberPin(parts: LessonComponent[], member: string): string | null {
  const [ref, pin] = member.split(".");
  const c = parts.find((p) => p.ref === ref);
  return c?.pins[pin ?? ""] ?? null;
}

export function netOptions(lesson: Lesson): NetOptions {
  return { cuts: lesson.stripboard?.cuts ?? [] };
}

/** Checks that every intended net is joined and that distinct nets stay apart. Returns the first problem. */
export function verifyNets(lesson: Lesson, parts: LessonComponent[], opts: NetOptions = netOptions(lesson)): string | null {
  const specs = lesson.nets ?? [];
  const net = solveNets(parts, [], opts);
  const roots: string[] = [];
  for (const s of specs) {
    const pins = s.pins.map((m) => [m, memberPin(parts, m)] as const);
    const missing = pins.find(([, p]) => !p);
    if (missing) return `${missing[0].split(".")[0]} is not placed.`;
    const r = pins.map(([, p]) => net(p!));
    const odd = r.findIndex((x) => x !== r[0]);
    if (odd > 0) return `${pins[odd]![0]} is not connected to ${pins[0]![0]} (${s.name}).`;
    const clash = roots.indexOf(r[0]!);
    if (clash >= 0) return `${s.name} is shorted to ${specs[clash]!.name}.`;
    roots.push(r[0]!);
  }
  return null;
}

const fail = (text: string): Sim => ({ ok: false, title: "Check the wiring", text, tone: "warn", readout: "—", leds: {}, values: {} });

export interface SimInput {
  control: number;
  pressed: boolean;
  /** performance.now()/1000 when SW1 was released, or null. */
  releasedAt: number | null;
}

// ---------- formulas (exported for tests) ----------

export const nightlight = (rLdr: number) => {
  const VCC = 3, R1 = 10_000, R2 = 1_000, BETA = 200, VBE = 0.7, VCE_SAT = 0.2, R3 = 100;
  const vth = (VCC * rLdr) / (R1 + rLdr);
  const rth = (R1 * rLdr) / (R1 + rLdr);
  const ib = Math.max(0, (vth - VBE) / (rth + R2));
  const icSat = (VCC - LED_VF - VCE_SAT) / R3;
  const ic = Math.min(BETA * ib, icSat);
  const vx = ib > 0 ? VBE + ib * R2 : vth;
  return { vx, ib, ic, icSat, saturated: BETA * ib >= icSat };
};

export const rcfade = () => {
  const R2 = 1_000, C1 = 470e-6, VCC = 3;
  return { tau: R2 * C1, i0: (VCC - LED_VF) / R2, tauCharge: 100 * C1 };
};

export const regulator = () => {
  const VIN = 9, VOUT = 5, IQ = 0.005, R = 680;
  const iLed = (VOUT - LED_VF) / R;
  return { vin: VIN, vout: VOUT, iLed, power: (VIN - VOUT) * (iLed + IQ), dropout: 2, vinMin: VOUT + 2 };
};

export const pwm555 = (duty: number) => {
  const R1 = 1_000, RPOT = 100_000, C = 10e-9, VCC = 9;
  const ra = Math.min(RPOT, Math.max(0, duty * (R1 + RPOT) - R1));
  const rb = RPOT - ra;
  const tHigh = 0.693 * (R1 + ra) * C, tLow = 0.693 * rb * C;
  return { f: 1 / (tHigh + tLow), duty: tHigh / (tHigh + tLow), tHigh, tLow, vMotor: (VCC * tHigh) / (tHigh + tLow) };
};

export const lm386 = (volume: number) => {
  const GAIN = 20, VIN_PK = 0.05, RL = 8, VCC = 9;
  const vPk = Math.min(GAIN * VIN_PK * volume, VCC / 2 - 1);
  return { gain: GAIN, gainDb: 20 * Math.log10(GAIN), vPk, power: (vPk / Math.SQRT2) ** 2 / RL, fLow: 1 / (2 * Math.PI * RL * 250e-6) };
};

export const chaser = () => {
  const R1 = 1_000, R2 = 150_000, C = 1e-6;
  const tHigh = 0.693 * (R1 + R2) * C, tLow = 0.693 * R2 * C;
  return { f: 1 / (tHigh + tLow), tHigh, tLow, iLed: (9 - LED_VF) / 470 };
};

export const tempalarm = (tempC: number) => {
  const VREF = 0.3, VOH = 3.5;
  const vSensor = tempC * 0.01;
  const on = vSensor > VREF;
  return { vSensor, vref: VREF, on, ib: on ? (VOH - 0.7) / 1_000 : 0, iLed: on ? (5 - LED_VF - 0.2) / 330 : 0 };
};

// ---------- simulation per model ----------

export function simulate(lesson: Lesson, parts: LessonComponent[], input: SimInput): Sim {
  const problem = verifyNets(lesson, parts);
  if (problem) return fail(problem);
  const ma = (a: number) => `${(a * 1000).toFixed(1)} mA`;
  switch (lesson.model) {
    case "nightlight": {
      const r = nightlight(input.control);
      const b = r.ic / r.icSat;
      return {
        ok: true, tone: b > 0.05 ? "ok" : "neutral", title: b > 0.95 ? "Dark: Q1 saturated, D1 on" : b > 0.05 ? "Dusk: Q1 partly on" : "Light: Q1 off, D1 off",
        text: `R_LDR = ${fmtOhm(input.control)} · V_X = ${r.vx.toFixed(2)} V · I_B = ${(r.ib * 1e6).toFixed(0)} µA · I_LED = ${ma(r.ic)} (max (3.0 − 2.0 − 0.2) V / 100 Ω = ${ma(r.icSat)})`,
        readout: `I = ${ma(r.ic)}`, leds: { D1: { mode: "level", b } }, values: { vx: r.vx, ic: r.ic },
      };
    }
    case "rcfade": {
      const r = rcfade();
      const since = input.releasedAt;
      const leds: Record<string, LedDrive> = since === null
        ? { D1: { mode: input.pressed ? "on" : "off" } }
        : { D1: { mode: "decay", b0: 1, tau: r.tau, since } };
      return {
        ok: true, tone: "ok", title: input.pressed ? "SW1 held: C1 charged to 3.0 V" : since !== null ? "Released: C1 discharging" : "Press and release SW1",
        text: `τ = R2·C1 = 1 kΩ × 470 µF = ${r.tau.toFixed(2)} s · I_LED(0) ≈ (3.0 − 2.0) V / 1 kΩ = ${ma(r.i0)} · after 3τ ≈ ${(3 * r.tau).toFixed(1)} s the LED is dark.`,
        readout: `τ = ${r.tau.toFixed(2)} s`, leds,
        scope: { span: 5 * r.tau, channels: [{ label: "V_C1 above Vf", tone: "warning", vmax: 3, v: (t) => LED_VF + (3 - LED_VF) * Math.exp(-t / r.tau) }] },
        values: { tau: r.tau },
      };
    }
    case "regulator": {
      const r = regulator();
      return {
        ok: true, tone: "ok", title: "5.0 V output",
        text: `V_IN = 9.0 V, V_OUT = 5.0 V · I_LED = (5.0 − 2.0) V / 680 Ω = ${ma(r.iLed)} · P = (9 − 5) V × ${ma(r.iLed + 0.005)} ≈ ${(r.power * 1000).toFixed(0)} mW · dropout ≈ 2 V, so V_IN must stay above 7 V.`,
        readout: `V_OUT = 5.0 V`, leds: { D1: { mode: "on" } }, values: { iLed: r.iLed },
      };
    }
    case "pwm555": {
      const r = pwm555(input.control / 100);
      return {
        ok: true, tone: "ok", title: `Duty ${(r.duty * 100).toFixed(0)} %`,
        text: `f = 1 / (0.693·(1 kΩ + 100 kΩ)·10 nF) ≈ ${(r.f / 1000).toFixed(2)} kHz (diode drops ignored) · t_high ${(r.tHigh * 1e6).toFixed(0)} µs · t_low ${(r.tLow * 1e6).toFixed(0)} µs · average motor voltage ≈ ${r.vMotor.toFixed(1)} V`,
        readout: `f = ${(r.f / 1000).toFixed(2)} kHz`, leds: {}, motor: r.duty,
        scope: { span: 3 / r.f, channels: [
          { label: "V_OUT (pin 3)", tone: "success", vmax: 9, v: (t) => ((t * r.f) % 1 < r.duty ? 9 : 0) },
          { label: "V_DRAIN", tone: "warning", vmax: 9, v: (t) => ((t * r.f) % 1 < r.duty ? 0.1 : 9) },
        ] },
        values: { f: r.f, duty: r.duty },
      };
    }
    case "lm386": {
      const r = lm386(input.control / 100);
      return {
        ok: true, tone: "ok", title: "Amplifier on",
        text: `Gain 20 (${r.gainDb.toFixed(0)} dB, pins 1 and 8 open) · 50 mV test tone × ${(input.control).toFixed(0)} % volume → ${r.vPk.toFixed(2)} V peak · P ≈ ${(r.power * 1000).toFixed(0)} mW into 8 Ω · output cap low-frequency corner ≈ ${r.fLow.toFixed(0)} Hz`,
        readout: `P = ${(r.power * 1000).toFixed(0)} mW`, leds: {}, audio: { hz: 440, gain: input.control / 100 },
        scope: { span: 3 / 440, channels: [{ label: "V_SPK", tone: "success", vmax: 2, v: (t) => 1 + (r.vPk / 2) * Math.sin(2 * Math.PI * 440 * t) }] },
        values: { power: r.power },
      };
    }
    case "chaser": {
      const r = chaser();
      const leds: Record<string, LedDrive> = {};
      for (let i = 0; i < 10; i++) leds[`D${i + 1}`] = { mode: "chase", index: i, count: 10, hz: r.f };
      return {
        ok: true, tone: "ok", title: "Running",
        text: `f_clock = 1 / (0.693·(1 kΩ + 2 × 150 kΩ)·1 µF) ≈ ${r.f.toFixed(2)} Hz, so each LED is on for ${(1000 / r.f).toFixed(0)} ms · one LED at a time through the shared 470 Ω: I ≤ (9 − 2) V / 470 Ω ≈ ${ma(r.iLed)} (in practice limited by the CD4017 output drive)`,
        readout: `f = ${r.f.toFixed(2)} Hz`, leds, values: { f: r.f },
        scope: { span: 3 / r.f, channels: [{ label: "CLK (pin 14)", tone: "success", vmax: 9, v: (t) => ((t * r.f) % 1 < r.tHigh * r.f ? 8.5 : 0) }] },
      };
    }
    case "tempalarm": {
      const r = tempalarm(input.control);
      return {
        ok: true, tone: r.on ? "error" : "ok", title: r.on ? "Alarm: temperature above threshold" : "Below threshold",
        text: `V_LM35 = ${input.control.toFixed(0)} °C × 10 mV/°C = ${r.vSensor.toFixed(2)} V · V_REF = 0.30 V (30 °C) · ${r.on ? `output high, I_B ≈ ${ma(r.ib)}, BZ1 ≈ ${BUZZER_MA} mA, I_LED = (5 − 2 − 0.2) V / 330 Ω ≈ ${ma(r.iLed)}` : "output low, Q1 off"}`,
        readout: `V = ${r.vSensor.toFixed(2)} V`, leds: { D1: { mode: r.on ? "on" : "off" } }, buzzer: r.on,
        values: { v: r.vSensor },
      };
    }
    default:
      return fail("No model.");
  }
}

export function fmtOhm(r: number): string {
  return r >= 1e6 ? `${(r / 1e6).toFixed(2)} MΩ` : r >= 1e3 ? `${(r / 1e3).toFixed(1)} kΩ` : `${r.toFixed(0)} Ω`;
}
