import { useMemo } from "react";
import * as THREE from "three";
import { BOARD_H } from "@/lessons/board";
import { JOINT_H, JOINT_R, STRIP_T, STRIP_X0, STRIP_Z0, colLetter, parseStrip, stripHole, type Joint } from "@/lessons/stripboard";

const P = 48; // texture px per pitch
const ACCENT = "#1f7ae0";

/**
 * Veroboard drawn from stripboard.ts only. The board spans one pitch beyond the outer holes,
 * so texture pixel (u, v) of hole (col, row) is ((col + 1)·P, row·P) on both faces.
 */
export function Stripboard({ cols, rows, cuts, joints, segments = [], xray = false }: {
  cols: number; rows: number; cuts: string[]; joints: Joint[];
  segments?: { row: number; from: number; to: number }[]; xray?: boolean;
}) {
  const W = cols + 1, D = rows + 1;
  const cx = STRIP_X0 + (cols - 1) / 2, cz = STRIP_Z0 + (rows - 1) / 2;
  const X = (col: number) => (col + 1) * P;
  const Z = (row: number) => row * P;
  const top = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W * P; c.height = D * P;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c9a974"; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < cols; i++) for (let r = 1; r <= rows; r++) {
      g.beginPath(); g.arc(X(i), Z(r), 0.2 * P, 0, Math.PI * 2); g.fillStyle = "#1c150d"; g.fill();
      g.beginPath(); g.arc(X(i), Z(r) - 0.05 * P, 0.2 * P, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 3; g.stroke();
    }
    g.fillStyle = "#5b4630";
    g.font = `500 ${0.42 * P}px "JetBrains Mono", monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < cols; i++) g.fillText(colLetter(i), X(i), 0.5 * P);
    g.textAlign = "center";
    for (let r = 1; r <= rows; r++) g.fillText(String(r), 0.5 * P, Z(r));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, [cols, rows, W, D]); // eslint-disable-line react-hooks/exhaustive-deps
  const bottom = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W * P; c.height = D * P;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c9a974"; g.fillRect(0, 0, c.width, c.height);
    for (let r = 1; r <= rows; r++) {
      const x0 = X(0) - 0.48 * P, w = (cols - 1) * P + 0.96 * P;
      g.fillStyle = "#c8793f"; g.fillRect(x0, Z(r) - 0.4 * P, w, 0.8 * P);
      g.fillStyle = "rgba(255,220,180,0.35)"; g.fillRect(x0, Z(r) - 0.4 * P, w, 0.12 * P);
    }
    for (const cut of cuts) {
      const p = parseStrip(cut);
      if (!p) continue;
      // drilled with a 4 mm spot-face cutter: copper removed right across the strip at that hole
      g.fillStyle = "#b99a68"; g.beginPath(); g.arc(X(p.col), Z(p.row), 0.5 * P, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#7a5a32"; g.lineWidth = 3; g.stroke();
    }
    for (let i = 0; i < cols; i++) for (let r = 1; r <= rows; r++) {
      g.beginPath(); g.arc(X(i), Z(r), 0.18 * P, 0, Math.PI * 2); g.fillStyle = "#1c150d"; g.fill();
    }
    g.fillStyle = "#5b4630";
    g.font = `500 ${0.42 * P}px "JetBrains Mono", monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < cols; i++) g.fillText(colLetter(i), X(i), 0.5 * P);
    for (let r = 1; r <= rows; r++) g.fillText(String(r), 0.5 * P, Z(r));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.flipY = false; // canvas row 0 at −z, same as the top face
    return t;
  }, [cols, rows, cuts, W, D]); // eslint-disable-line react-hooks/exhaustive-deps
  const standY = (-BOARD_H - STRIP_T) / 2;
  return (
    <group>
      <mesh position={[cx, -STRIP_T / 2, cz]} castShadow={!xray} receiveShadow>
        <boxGeometry args={[W, STRIP_T, D]} />
        <meshStandardMaterial key={xray ? "x" : "o"} color="#b8955f" roughness={0.8} transparent={xray} opacity={xray ? 0.15 : 1} depthWrite={!xray} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.002, cz]} renderOrder={xray ? 2 : 0}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial key={xray ? "x" : "o"} map={top} roughness={0.75} transparent={xray} opacity={xray ? 0.3 : 1} depthWrite={!xray} />
      </mesh>
      {/* copper side, facing down; double-sided in X-ray so the strips show through from above */}
      <mesh rotation-x={Math.PI / 2} position={[cx, -STRIP_T - 0.002, cz]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial key={xray ? "x" : "o"} map={bottom} roughness={0.35} metalness={0.35} side={xray ? THREE.DoubleSide : THREE.FrontSide} />
      </mesh>
      {segments.map((s) => {
        const [x0, , z] = stripHole(s.from, s.row);
        const [x1] = stripHole(s.to, s.row);
        const len = x1 - x0 + 0.9;
        return (
          <group key={`${s.row}:${s.from}`}>
            <mesh rotation-x={Math.PI / 2} position={[(x0 + x1) / 2, -STRIP_T - 0.012, z]} renderOrder={3}>
              <planeGeometry args={[len, 0.85]} />
              <meshBasicMaterial color={ACCENT} transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[(x0 + x1) / 2, 0.006, z]} renderOrder={3}>
              <planeGeometry args={[len, 0.85]} />
              <meshBasicMaterial color={ACCENT} transparent opacity={0.16} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[cx + sx! * (W / 2 - 0.6), standY, cz + sz! * (D / 2 - 0.6)]}>
          <cylinderGeometry args={[0.35, 0.35, BOARD_H - STRIP_T, 12]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* solder fillets: generated from the soldered pins, centred on each lead at the copper */}
      {joints.map((j) => (
        <mesh key={j.pin} position={[j.pos[0], j.pos[1] - JOINT_H / 2, j.pos[2]]} rotation-x={Math.PI}>
          <coneGeometry args={[JOINT_R, JOINT_H, 20]} />
          <meshStandardMaterial color="#d7dade" metalness={0.95} roughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}
