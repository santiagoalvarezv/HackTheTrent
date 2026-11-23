/**
 * Stripboard (Veroboard) geometry. Single source of truth for every stripboard
 * position: holes, copper-side points, track cuts, lead tips and solder joints.
 * 1 scene unit = 1 pitch (0.1 in). Component side (top) at y = 0, copper underneath.
 * Pin ids: "S:C5" = column C (letters, left to right), row 5 (numbers, back to front).
 * Copper strips run along rows.
 */
export type SV3 = [number, number, number];

export const STRIP_T = 0.63; // 1.6 mm board
export const STRIP_X0 = -6; // column A
export const STRIP_Z0 = -6; // row 1
/** Lead length sticking out under the copper: before and after trimming (≈ 4 mm / ≈ 1 mm). */
export const PROTRUDE_LONG = 1.6;
export const PROTRUDE_TRIMMED = 0.4;
/** Solder fillet: cone on the copper side. */
export const JOINT_R = 0.38;
export const JOINT_H = 0.34;

export const stripCol = (letter: string) => letter.charCodeAt(0) - 65;
export const colLetter = (col: number) => String.fromCharCode(65 + col);

export function parseStrip(pin: string): { col: number; row: number } | null {
  const m = /^S:([A-Z])(\d+)$/.exec(pin);
  return m ? { col: stripCol(m[1]!), row: Number(m[2]) } : null;
}

export const stripId = (col: number, row: number) => `S:${colLetter(col)}${row}`;

/** Top-side hole centre. */
export function stripHole(col: number, row: number): SV3 {
  return [STRIP_X0 + col, 0, STRIP_Z0 + row - 1];
}

/** Same hole on the copper side (the board's top point mirrored through its thickness). */
export function copperPoint(col: number, row: number): SV3 {
  const [x, , z] = stripHole(col, row);
  return [x, -STRIP_T, z];
}

/** Centre of a drilled track cut (on the copper side, at its hole). */
export function cutPos(pin: string): SV3 {
  const p = parseStrip(pin);
  if (!p) throw new Error(`bad strip pin ${pin}`);
  return copperPoint(p.col, p.row);
}

function must(pin: string) {
  const p = parseStrip(pin);
  if (!p) throw new Error(`bad strip pin ${pin}`);
  return p;
}

export const stripPinPos = (pin: string): SV3 => { const p = must(pin); return stripHole(p.col, p.row); };
export const copperOf = (pin: string): SV3 => { const p = must(pin); return copperPoint(p.col, p.row); };

/** Lead end: through the board, protruding under the copper. */
export function stripTip(pin: string, trimmed = true): SV3 {
  const [x, y, z] = copperOf(pin);
  return [x, y - (trimmed ? PROTRUDE_TRIMMED : PROTRUDE_LONG), z];
}

/** Is the pin a hole on a board of this size? */
export function onBoard(pin: string, cols: number, rows: number): boolean {
  const p = parseStrip(pin);
  return !!p && p.col >= 0 && p.col < cols && p.row >= 1 && p.row <= rows;
}

/**
 * Net of a stripboard hole. Each row strip is one conductor, broken at every drilled
 * track cut (a cut at "C5" isolates hole C5 and splits row 5 into left and right).
 */
export function stripNetOf(pin: string, cuts: readonly string[] = []): string {
  const p = must(pin);
  const rowCuts = cuts.map(parseStrip).filter((c): c is { col: number; row: number } => !!c && c.row === p.row);
  if (rowCuts.some((c) => c.col === p.col)) return `cut:${pin}`;
  const seg = rowCuts.filter((c) => c.col < p.col).length;
  return `strip${p.row}:${seg}`;
}

/** Copper segment (inclusive column range) a hole belongs to, between cuts / board edges. */
export function stripSegment(pin: string, cols: number, cuts: readonly string[] = []): { row: number; from: number; to: number } {
  const p = must(pin);
  const cs = cuts.map(parseStrip).filter((c): c is { col: number; row: number } => !!c && c.row === p.row).map((c) => c.col);
  const left = Math.max(-1, ...cs.filter((c) => c < p.col));
  const right = Math.min(cols, ...cs.filter((c) => c > p.col));
  return { row: p.row, from: left + 1, to: right - 1 };
}

export interface Joint {
  ref: string;
  pin: string;
  /** Copper-side point of the joint (same x/z as the lead tip). */
  pos: SV3;
}

/** One solder joint per stripboard pin of each soldered part. Never authored by hand. */
export function generateJoints(parts: { ref: string; pins: Record<string, string> }[], soldered: readonly string[], only?: ReadonlySet<string>): Joint[] {
  const out: Joint[] = [];
  for (const c of parts) {
    if (!soldered.includes(c.ref)) continue;
    for (const pin of Object.values(c.pins)) {
      if (!parseStrip(pin)) continue;
      if (only && !only.has(pin)) continue;
      out.push({ ref: c.ref, pin, pos: copperOf(pin) });
    }
  }
  return out;
}
