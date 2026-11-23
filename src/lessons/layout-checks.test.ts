import { describe, expect, it } from "vitest";
import { parseStrip } from "./board";
import { solveNets } from "./circuit";
import { lessons } from "./data";
import { memberPin, netOptions, verifyNets } from "./models";

/** Holes a stripboard wire link passes over (same column, rows strictly between). */
function linkSpan(a: string, b: string): string[] {
  const pa = parseStrip(a), pb = parseStrip(b);
  if (!pa || !pb || pa.col !== pb.col) return [];
  const [lo, hi] = [Math.min(pa.row, pb.row), Math.max(pa.row, pb.row)];
  const col = String.fromCharCode(65 + pa.col);
  return Array.from({ length: hi - lo - 1 }, (_, i) => `S:${col}${lo + 1 + i}`);
}

describe.each(lessons.map((l) => [l.code, l] as const))("%s layout", (_code, lesson) => {
  const pins = lesson.components.flatMap((c) => Object.values(c.pins).map((p) => [c.ref, p] as const));

  it("uses every hole at most once", () => {
    const seen = new Map<string, string>();
    for (const [ref, p] of pins) {
      expect(seen.get(p), `${p} used by ${seen.get(p)} and ${ref}`).toBeUndefined();
      seen.set(p, ref);
    }
  });

  it("keeps stripboard pins inside the board and off track cuts", () => {
    const sb = lesson.stripboard;
    for (const [ref, p] of pins) {
      const s = parseStrip(p);
      if (!s) continue;
      expect(sb, `${ref} uses a stripboard pin`).toBeDefined();
      expect(s.col, `${ref} ${p}`).toBeLessThan(sb!.cols);
      expect(s.row, `${ref} ${p}`).toBeLessThanOrEqual(sb!.rows);
      expect(sb!.cuts.includes(p), `${ref} ${p} is on a cut`).toBe(false);
    }
  });

  it("does not insert a part under a wire link", () => {
    const occupied = new Map(pins.map(([r, p]) => [p, r]));
    for (const c of lesson.components) {
      if (c.kind !== "wire") continue;
      for (const h of linkSpan(c.pins["a"]!, c.pins["b"]!)) expect(occupied.get(h), `${c.ref} passes over ${h}`).toBeUndefined();
    }
  });

  it("matches the intended netlist", () => {
    if (!lesson.nets) return;
    expect(verifyNets(lesson, lesson.components)).toBeNull();
  });

  it("leaves no pin floating except declared open pins", () => {
    if (!lesson.nets) return;
    const net = solveNets(lesson.components, [], netOptions(lesson));
    const declaredOpen = new Set(lesson.nets.filter((n) => n.open).flatMap((n) => n.pins));
    const count = new Map<string, number>();
    for (const c of lesson.components) for (const p of Object.values(c.pins)) count.set(net(p), (count.get(net(p)) ?? 0) + 1);
    for (const c of lesson.components) {
      if (c.kind === "wire") continue;
      for (const [name, p] of Object.entries(c.pins)) {
        if (declaredOpen.has(`${c.ref}.${name}`)) continue;
        expect(count.get(net(p)), `${c.ref}.${name} (${p}) is floating`).toBeGreaterThan(1);
      }
    }
  });

  it("lists every non-wire pin in the netlist", () => {
    if (!lesson.nets) return;
    const listed = new Set(lesson.nets.flatMap((n) => n.pins));
    for (const c of lesson.components) {
      if (c.kind === "wire") continue;
      for (const name of Object.keys(c.pins)) {
        if (c.kind === "pushbutton" && (name === "a2" || name === "b2")) continue;
        expect(listed.has(`${c.ref}.${name}`), `${c.ref}.${name} missing from nets`).toBe(true);
      }
    }
    for (const m of listed) expect(memberPin(lesson.components, m), m).not.toBeNull();
  });
});
