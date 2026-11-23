import { describe, expect, it } from "vitest";
import { hole, netOf, rail } from "./board";
import { evaluateCircuit } from "./circuit";
import { FULL_BUILD, toComponents } from "./layout";

describe("breadboard nets", () => {
  it("connects a–e in one column", () => expect(netOf("a10")).toBe(netOf("e10")));
  it("does not connect across the center channel", () => expect(netOf("e10")).not.toBe(netOf("f10")));
  it("does not connect neighbouring columns", () => expect(netOf("e10")).not.toBe(netOf("e11")));
  it("connects a rail along its whole length", () => expect(netOf("top+:0")).toBe(netOf("top+:24")));
  it("uses a 0.1 in grid with a 3-pitch channel", () => {
    expect(hole("e", 11)[0] - hole("e", 10)[0]).toBe(1);
    expect(hole("f", 1)[2] - hole("e", 1)[2]).toBe(3);
    expect(rail("top+", 8)[0]).toBe(hole("a", 10)[0]);
  });
});

describe("evaluateCircuit", () => {
  it("lights at about 4.5 mA with the lesson netlist", () => {
    const r = evaluateCircuit(toComponents(FULL_BUILD));
    expect(r.status).toBe("lit");
    expect(r.currentMa).toBeGreaterThan(4.4);
    expect(r.currentMa).toBeLessThan(4.6);
  });
  it("blocks current when the LED is reversed", () => {
    const r = evaluateCircuit(toComponents({ ...FULL_BUILD, led: "rev" }));
    expect(r).toEqual({ status: "reversed", currentMa: 0 });
  });
  it("is an open circuit when the resistor is removed", () =>
    expect(evaluateCircuit(toComponents({ ...FULL_BUILD, resistor: false })).status).toBe("open"));
  it("overcurrents the LED when the black jumper skips the resistor", () => {
    const r = evaluateCircuit(toComponents({ ...FULL_BUILD, resistor: false, wireBlack: "a13" }));
    expect(r.status).toBe("overcurrent");
    expect(r.currentMa).toBeGreaterThan(20);
  });
  it("is open when a jumper is missing", () =>
    expect(evaluateCircuit(toComponents({ ...FULL_BUILD, wireRed: false })).status).toBe("open"));
});
