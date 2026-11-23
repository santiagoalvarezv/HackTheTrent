import { createContext, useContext, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { BOARD_H, pinPos, tip, type V3 } from "@/lessons/board";

/** Lead end height for the part being drawn: breadboard socket depth, or below the stripboard copper. */
export const LeadY = createContext(-0.6);
export const useLeadY = () => useContext(LeadY);

export const NICKEL = { color: "#c8ccd2", metalness: 0.9, roughness: 0.3 } as const;
export const Nickel = () => <meshStandardMaterial {...NICKEL} />;

export /** Center and rotation for a two-pin part whose first pin maps to local −x. */
function frame(a: string, b: string) {
  const pa = pinPos(a), pb = pinPos(b);
  const dx = pb[0] - pa[0], dz = pb[2] - pa[2];
  return {
    center: [(pa[0] + pb[0]) / 2, 0, (pa[2] + pb[2]) / 2] as V3,
    rotY: -Math.atan2(dz, dx),
    half: Math.hypot(dx, dz) / 2,
  };
}

export /** Two legs from the holes at local ±half, bent in to ±inner at height bendY, up to topY. */
function bentLegs(half: number, inner: number, bendY: number, topY: number, y = -0.6): [V3[], V3[]] {
  if (half <= inner + 0.01) return [[[-half, y, 0], [-half, topY, 0]], [[half, y, 0], [half, topY, 0]]];
  return [
    [[-half, y, 0], [-half, bendY, 0], [-inner, bendY, 0], [-inner, topY, 0]],
    [[half, y, 0], [half, bendY, 0], [inner, bendY, 0], [inner, topY, 0]],
  ];
}

export /** Tube along straight segments (bent leads) or a smooth curve (stranded leads). */
function Lead({ pts, r, smooth, children }: { pts: V3[]; r: number; smooth?: boolean; children: ReactNode }) {
  const key = JSON.stringify(pts);
  const geo = useMemo(() => {
    const v = pts.map((p) => new THREE.Vector3(...p));
    if (smooth) return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v, false, "centripetal"), 80, r, 10, false);
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < v.length - 1; i++) path.add(new THREE.LineCurve3(v[i]!, v[i + 1]!));
    return new THREE.TubeGeometry(path, v.length * 12, r, 10, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, r, smooth]);
  return <mesh geometry={geo} castShadow>{children}</mesh>;
}

export const FLIP_Y = 9;
const TABLE_Y = -BOARD_H;

/** Board-local point to world, given whether the board is turned over (rotation π about x, raised by FLIP_Y). */
export function boardToWorld(p: V3, flipped: boolean): V3 {
  return flipped ? [p[0], FLIP_Y - p[1], -p[2]] : p;
}

/** Off-board parts: whether the board is turned over, and whether their leads are still loose on the bench. */
export const OffboardMode = createContext<{ flipped: boolean; loose: boolean }>({ flipped: false, loose: false });
export const useOffboard = () => useContext(OffboardMode);

/**
 * The last two points of an off-board lead: just above the hole on the component side, then through
 * the hole to its tip under the copper (soldered there). Mapped to world when the board is turned over.
 */
export function offboardEnd(pin: string, flipped: boolean): V3[] {
  const [px, , pz] = pinPos(pin);
  return [boardToWorld([px, 0.9, pz], flipped), boardToWorld(tip(pin), flipped)];
}

/** Stranded lead from an off-board body to a board hole (smooth curve), or lying loose on the bench. */
export function offboardLead(start: V3, pin: string, mode: { flipped: boolean; loose: boolean }, side = 1, dx = 1): V3[] {
  if (mode.loose) {
    return [start, [start[0] + 2 * dx, TABLE_Y + 0.6, start[2] + side * 0.6], [start[0] + 4.5 * dx, TABLE_Y + 0.22, start[2] + side * 1.4]];
  }
  const [a, b] = offboardEnd(pin, mode.flipped);
  // Approach the component side: from above normally, from underneath when the board is turned over.
  const mid: V3 = [(start[0] + a![0]) / 2, mode.flipped ? Math.min(start[1] + 1, a![1] - 1.5) : Math.max(start[1], a![1]) + 1.2, (start[2] + a![2]) / 2];
  return [start, mid, a!, b!];
}
