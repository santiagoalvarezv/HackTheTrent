import { describe, expect, it } from "vitest";
import { evaluateAstable, evaluateCircuit, solveNets } from "./circuit";
import { getLesson, lessons } from "./data";
import { resistorBandDigits } from "./parts";
import type { LessonComponent } from "./types";

const L = (id: string) => getLesson(id)!;
const comp = (parts: LessonComponent[], ref: string) => parts.find((c) => c.ref === ref)!;

describe("all lessons", () => {
  it("chain P-01 → P-02 → P-03 → P-04 → I-01 … → A-04 and end there", () => {
    expect(lessons.map((l) => l.nextLessonId)).toEqual([
      "blinking-led", "push-button", "buzzer-alarm", "night-light",
      "rc-fade", "first-solder", "regulated-5v", "pwm-motor",
      "lm386-amp", "led-chaser", "temp-alarm", undefined,
    ]);
  });
  it("beginner lessons have 5–8 steps and reference only their own parts", () => {
    for (const l of lessons.filter((x) => x.level === "beginner")) {
      expect(l.steps.length).toBeGreaterThanOrEqual(5);
      expect(l.steps.length).toBeLessThanOrEqual(8);
      const refs = new Set(l.components.map((c) => c.ref));
      for (const s of l.steps) for (const r of [...s.placed, ...s.focus]) expect(refs.has(r)).toBe(true);
    }
  });
});

describe("resistor colour code", () => {
  it("encodes 220 Ω, 10 kΩ and 68 kΩ", () => {
    expect(resistorBandDigits(220)).toEqual([2, 2, 1]);
    expect(resistorBandDigits(10_000)).toEqual([1, 0, 3]);
    expect(resistorBandDigits(68_000)).toEqual([6, 8, 3]);
  });
});

describe("P-02 blinking LED", () => {
  const parts = L("blinking-led").components;
  const net = solveNets(parts);
  const u1 = comp(parts, "U1").pins;
  const gnd = net("top-:0");
  const vcc = net("top+:0");
  it("puts pin 2 and pin 6 on the same net", () => expect(net(u1["2"]!)).toBe(net(u1["6"]!)));
  it("puts D1 cathode and C1 − on GND", () => {
    expect(net("h23")).toBe(gnd);
    expect(net("i15")).toBe(gnd);
  });
  it("ties pins 8 and 4 to VCC and pin 1 to GND", () => {
    expect(net(u1["8"]!)).toBe(vcc);
    expect(net(u1["4"]!)).toBe(vcc);
    expect(net(u1["1"]!)).toBe(gnd);
  });
  it("oscillates within 1 % of 0.99 Hz at ≈ 53 % duty", () => {
    const r = evaluateAstable(parts);
    expect(r.ok).toBe(true);
    expect(Math.abs(r.f - 0.99) / 0.99).toBeLessThan(0.01);
    expect(r.duty).toBeCloseTo(0.534, 2);
    expect(r.ledMa).toBeCloseTo(3.2, 1);
  });
  it("faults when the pin 2–6 jumper is missing", () => {
    expect(evaluateAstable(parts.filter((c) => c.ref !== "W8")).ok).toBe(false);
  });
});

describe("P-03 push-button light", () => {
  const parts = L("push-button").components;
  it("is open when released", () => expect(evaluateCircuit(parts).status).toBe("open"));
  it("lights at ≈ 4.5 mA only while pressed", () => {
    const r = evaluateCircuit(parts, ["SW1"]);
    expect(r.status).toBe("lit");
    expect(r.currentMa).toBeCloseTo(4.5, 1);
  });
});

describe("P-04 buzzer alarm", () => {
  const parts = L("buzzer-alarm").components;
  it("is silent when released", () => expect(evaluateCircuit(parts).status).toBe("open"));
  it("sounds at ≈ 15 mA while pressed", () => expect(evaluateCircuit(parts, ["SW1"])).toEqual({ status: "buzzing", currentMa: 15 }));
  it("stays silent when BZ1 is reversed", () => {
    const rev = parts.map((c) => (c.ref === "BZ1" ? { ...c, pins: { pos: "d15", neg: "d12" } } : c));
    expect(evaluateCircuit(rev, ["SW1"]).status).toBe("reversed");
  });
});
