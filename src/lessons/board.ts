/**
 * Half-size breadboard geometry. 1 scene unit = 1 pitch (0.1 in / 2.54 mm).
 * Pure numbers only, shared by the 3D scene and the electrical model.
 */
import { stripPinPos, stripTip } from "./stripboard";
export type V3 = [number, number, number];

export const PITCH_MM = 2.54;
export const COLS = 30;
export const BOARD_W = 33; // 83.8 mm
export const BOARD_D = 21.6; // 54.9 mm
export const BOARD_H = 3.3; // 8.4 mm
export const INSERT = 0.6; // how far a lead goes into a socket
export const TOP_ROWS = ["a", "b", "c", "d", "e"] as const;
export const BOTTOM_ROWS = ["f", "g", "h", "i", "j"] as const;
export const ROWS = [...TOP_ROWS, ...BOTTOM_ROWS];
export type Row = (typeof ROWS)[number];

const ROW_Z: Record<Row, number> = {
  a: -5.5, b: -4.5, c: -3.5, d: -2.5, e: -1.5,
  // 0.3 in DIP channel between e and f
  f: 1.5, g: 2.5, h: 3.5, i: 4.5, j: 5.5,
};

export type RailId = "top+" | "top-" | "bot-" | "bot+";
export const RAIL_IDS: RailId[] = ["top-", "top+", "bot-", "bot+"];
export const RAIL_Z: Record<RailId, number> = { "top-": -8.5, "top+": -7.5, "bot-": 7.5, "bot+": 8.5 };
export const RAIL_HOLES = 25; // 5 groups of 5

export const colX = (col: number) => col - 15.5;
export const rowZ = (row: Row) => ROW_Z[row];
/** Rail holes come in groups of five with a one-pitch gap between groups. */
export const railX = (i: number) => -14.5 + i + Math.floor(i / 5);

export function hole(row: Row, col: number): V3 {
  if (col < 1 || col > COLS) throw new Error(`column ${col} out of range`);
  return [colX(col), 0, ROW_Z[row]];
}

export function rail(id: RailId, index: number): V3 {
  if (index < 0 || index >= RAIL_HOLES) throw new Error(`rail index ${index} out of range`);
  return [railX(index), 0, RAIL_Z[id]];
}

/** Pin ids: "e10" for terminal strips, "top+:8" for rails. */
export function pinPos(pin: string): V3 {
  if (pin.startsWith("S:")) return stripPinPos(pin);
  const r = /^(top\+|top-|bot\+|bot-):(\d+)$/.exec(pin);
  if (r) return rail(r[1] as RailId, Number(r[2]));
  const h = /^([a-j])(\d+)$/.exec(pin);
  if (h) return hole(h[1] as Row, Number(h[2]));
  throw new Error(`bad pin ${pin}`);
}

/** Lead end position: inside the socket, below the surface. */
export function tip(pin: string): V3 {
  if (pin.startsWith("S:")) return stripTip(pin, true);
  const [x, , z] = pinPos(pin);
  return [x, -INSERT, z];
}

/** Which internal metal strip a hole belongs to. */
export function netOf(pin: string): string {
  if (pin.startsWith("S:")) return `strip:${pin.slice(2).replace(/^[A-Z]/, "")}`;
  const r = /^(top\+|top-|bot\+|bot-):\d+$/.exec(pin);
  if (r) return `rail:${r[1]}`;
  const h = /^([a-j])(\d+)$/.exec(pin);
  if (!h) throw new Error(`bad pin ${pin}`);
  const top = (TOP_ROWS as readonly string[]).includes(h[1] ?? "");
  return `col${h[2]}:${top ? "a-e" : "f-j"}`;
}

// ---------------- Stripboard: see stripboard.ts ----------------
export {
  STRIP_T, STRIP_X0, STRIP_Z0, stripCol, parseStrip, stripHole, stripNetOf, copperPoint, stripTip,
} from "./stripboard";
