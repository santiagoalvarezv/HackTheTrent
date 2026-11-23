import { describe, expect, it } from "vitest";
import { pinPos, tip } from "./board";
import { solveNets } from "./circuit";
import { lessons } from "./data";
import { memberPin, netOptions } from "./models";
import { STRIP_T, copperOf, cutPos, generateJoints, onBoard, parseStrip, stripHole, stripNetOf, stripSegment, stripTip } from "./stripboard";

const OFFBOARD = new Set(["battery", "battery9v", "usb5v", "motor", "speaker"]);

describe("stripboard geometry", () => {
  it("puts holes on a 0.1 in grid and the copper point straight under the hole", () => {
    expect(stripHole(1, 1)[0] - stripHole(0, 1)[0]).toBe(1);
    expect(stripHole(0, 2)[2] - stripHole(0, 1)[2]).toBe(1);
    const [x, y, z] = copperOf("S:H6");
    expect([x, z]).toEqual([pinPos("S:H6")[0], pinPos("S:H6")[2]]);
    expect(y).toBeCloseTo(-STRIP_T, 6);
    expect(cutPos("S:E5")).toEqual(copperOf("S:E5"));
  });
  it("lets trimmed leads stick out about 1 mm under the copper", () => {
    expect((-STRIP_T - stripTip("S:A1", true)[1]) * 2.54).toBeCloseTo(1.0, 1);
    expect(stripTip("S:A1", false)[1]).toBeLessThan(stripTip("S:A1", true)[1]);
  });
  it("splits a strip at a track cut", () => {
    expect(stripNetOf("S:C5", ["S:E5"])).not.toBe(stripNetOf("S:G5", ["S:E5"]));
    expect(stripNetOf("S:C5", ["S:E5"])).toBe(stripNetOf("S:A5", ["S:E5"]));
    expect(stripSegment("S:G5", 10, ["S:E5"])).toEqual({ row: 5, from: 5, to: 9 });
  });
});

describe.each(lessons.map((l) => [l.code, l] as const))("%s pins and joints", (_code, lesson) => {
  const sb = lesson.stripboard;
  const pins = lesson.components.flatMap((c) => Object.entries(c.pins).map(([n, p]) => [c, n, p] as const));

  it("uses only valid hole ids", () => {
    for (const [c, n, p] of pins) {
      expect(() => pinPos(p), `${c.ref}.${n} ${p}`).not.toThrow();
      if (sb) expect(onBoard(p, sb.cols, sb.rows), `${c.ref}.${n} ${p} off the board`).toBe(true);
      else expect(p.startsWith("S:"), `${c.ref}.${n} ${p}`).toBe(false);
    }
  });

  it("ends every off-board lead in a hole on the board", () => {
    for (const [c, n, p] of pins) {
      if (!OFFBOARD.has(c.kind)) continue;
      if (sb) expect(onBoard(p, sb.cols, sb.rows), `${c.ref}.${n}`).toBe(true);
      const [x, , z] = tip(p);
      expect([x, z]).toEqual([pinPos(p)[0], pinPos(p)[2]]);
    }
  });

  it.runIf(!!sb)("generates one joint per soldered pin, exactly at the lead's copper-side tip", () => {
    const last = lesson.steps[lesson.steps.length - 1]!;
    const soldered = last.soldered ?? [];
    const joints = generateJoints(lesson.components, soldered);
    const expected = lesson.components.filter((c) => soldered.includes(c.ref)).flatMap((c) => Object.values(c.pins)).filter((p) => parseStrip(p));
    expect(joints.map((j) => j.pin).sort()).toEqual([...expected].sort());
    for (const j of joints) {
      const t = stripTip(j.pin);
      expect(Math.abs(j.pos[0] - t[0])).toBeLessThan(0.01);
      expect(Math.abs(j.pos[2] - t[2])).toBeLessThan(0.01);
      expect(Math.abs(j.pos[1] + STRIP_T)).toBeLessThan(0.01);
    }
  });

  it.runIf(!!sb)("solders every part by the last step, and every iron stop is a pin of a soldered part", () => {
    const last = lesson.steps[lesson.steps.length - 1]!;
    for (const c of lesson.components) expect(last.soldered ?? [], `${c.ref} never soldered`).toContain(c.ref);
    for (const s of lesson.steps) {
      const own = new Set(lesson.components.filter((c) => (s.soldered ?? []).includes(c.ref)).flatMap((c) => Object.values(c.pins)));
      for (const p of s.solder ?? []) expect(own.has(p), `${s.id}: iron at ${p} with no soldered lead`).toBe(true);
    }
  });

  it.runIf(!!lesson.nets)("keeps every named net separate (no supply short, polarised parts the right way)", () => {
    const net = solveNets(lesson.components, [], netOptions(lesson));
    const nets = lesson.nets!.filter((n) => !n.open);
    const ids = nets.map((n) => net(memberPin(lesson.components, n.pins[0]!)!));
    expect(new Set(ids).size, nets.map((n) => n.name).join(",")).toBe(nets.length);
    for (const n of nets) for (const m of n.pins) expect(net(memberPin(lesson.components, m)!), `${m} in ${n.name}`).toBe(ids[nets.indexOf(n)]);
  });
});
