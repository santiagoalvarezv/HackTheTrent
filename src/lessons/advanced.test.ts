import { describe, expect, it } from "vitest";
import { evaluateCircuit } from "./circuit";
import { getLesson } from "./data";
import { chaser, lm386, netOptions, nightlight, pwm555, rcfade, regulator, simulate, tempalarm, verifyNets } from "./models";

const within2 = (actual: number, expected: number) => expect(Math.abs(actual - expected) / expected).toBeLessThan(0.02);
const L = (id: string) => getLesson(id)!;

describe("levels and boards", () => {
  it("has four lessons per level", () => {
    for (const level of ["beginner", "intermediate", "advanced"] as const) {
      expect(["night-light", "rc-fade", "first-solder", "regulated-5v", "pwm-motor", "lm386-amp", "led-chaser", "temp-alarm", "first-led", "blinking-led", "push-button", "buzzer-alarm"]
        .map(L).filter((l) => l.level === level)).toHaveLength(4);
    }
  });
  it("new lessons have 6–10 steps", () => {
    for (const id of ["night-light", "rc-fade", "first-solder", "regulated-5v", "pwm-motor", "lm386-amp", "led-chaser", "temp-alarm"]) {
      expect(L(id).steps.length).toBeGreaterThanOrEqual(6);
      expect(L(id).steps.length).toBeLessThanOrEqual(10);
    }
  });
  it("every stripboard lesson starts with safety right after the parts list", () => {
    for (const id of ["first-solder", "regulated-5v", "lm386-amp", "temp-alarm"]) {
      const s = L(id).steps[1]!;
      expect(s.id).toBe("safety");
      expect(s.checklist?.length).toBeGreaterThanOrEqual(6);
      expect(L(id).board).toBe("stripboard");
    }
  });
});

describe("I-01 night light", () => {
  it("is off in a bright room (1 kΩ)", () => expect(nightlight(1_000).ic).toBe(0));
  it("saturates in the dark at ≈ 8 mA", () => {
    const r = nightlight(1_000_000);
    expect(r.saturated).toBe(true);
    within2(r.ic, 0.008);
  });
  it("needs V_X above ≈ 0.7 V to conduct", () => {
    const r = nightlight(3_000);
    expect(r.vx).toBeLessThan(0.7);
    expect(r.ic).toBe(0);
  });
});

describe("I-02 RC fade", () => {
  it("has τ = 0.47 s", () => within2(rcfade().tau, 0.47));
});

describe("I-03 first soldered circuit", () => {
  const l = L("first-solder");
  it("lights at ≈ 4.5 mA with the track cut", () => {
    const r = evaluateCircuit(l.components, [], netOptions(l));
    expect(r.status).toBe("lit");
    within2(r.currentMa, 4.5);
  });
  it("shorts R1 if the track at E5 is not cut", () => {
    const r = evaluateCircuit(l.components, [], { cuts: [] });
    expect(r.status).toBe("overcurrent");
  });
  it("does not conduct before the joints are soldered", () => {
    expect(evaluateCircuit(l.components, [], { ...netOptions(l), unsoldered: ["D1"] }).status).toBe("open");
  });
});

describe("I-04 regulator", () => {
  it("drives the power LED at ≈ 4.4 mA from 5 V", () => within2(regulator().iLed, 0.00441));
  it("needs at least 7 V in", () => expect(regulator().vinMin).toBe(7));
});

describe("A-01 PWM", () => {
  it("runs at ≈ 1.43 kHz independent of duty", () => {
    within2(pwm555(0.2).f, 1429);
    within2(pwm555(0.8).f, 1429);
  });
  it("sets the requested duty", () => {
    within2(pwm555(0.05).duty, 0.05);
    within2(pwm555(0.95).duty, 0.95);
  });
  it("puts the flyback diode cathode on +9 V and anode on the drain", () => {
    const l = L("pwm-motor");
    expect(verifyNets(l, l.components)).toBeNull();
    const swapped = l.components.map((c) => (c.ref === "D3" ? { ...c, pins: { anode: c.pins["cathode"]!, cathode: c.pins["anode"]! } } : c));
    expect(verifyNets(l, swapped)).not.toBeNull();
  });
});

describe("A-02 LM386", () => {
  it("has gain 20 (26 dB) with pins 1 and 8 open", () => {
    within2(lm386(1).gainDb, 26.02);
  });
  it("output cap corner ≈ 80 Hz", () => within2(lm386(1).fLow, 79.6));
  it("fails verification if a track cut under the chip is missing", () => {
    const l = L("lm386-amp");
    expect(verifyNets(l, l.components, { cuts: l.stripboard!.cuts.filter((c) => c !== "S:G6") })).not.toBeNull();
  });
});

describe("A-03 chaser", () => {
  it("clocks at ≈ 4.79 Hz", () => within2(chaser().f, 4.79));
  it("drives ten LEDs in turn", () => {
    const l = L("led-chaser");
    const s = simulate(l, l.components, { control: 0, pressed: false, releasedAt: null });
    expect(s.ok).toBe(true);
    expect(Object.keys(s.leds)).toHaveLength(10);
  });
});

describe("A-04 temperature alarm", () => {
  it("is quiet at 25 °C and sounds at 35 °C", () => {
    expect(tempalarm(25).on).toBe(false);
    expect(tempalarm(35).on).toBe(true);
  });
  it("LED current ≈ 8.5 mA when on", () => within2(tempalarm(40).iLed, 0.00848));
  it("passes the netlist check end to end", () => {
    const l = L("temp-alarm");
    expect(simulate(l, l.components, { control: 35, pressed: false, releasedAt: null }).buzzer).toBe(true);
  });
});
