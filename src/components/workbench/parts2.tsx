import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BOARD_H, pinPos, tip, type V3 } from "@/lessons/board";
import { Lead, Nickel, frame, offboardLead as lead, useLeadY, useOffboard } from "./common";

const TABLE_Y = -BOARD_H;

function labelTexture(text: string, bg: string, fg: string, w = 512, h = 192, size = 64) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `500 ${size}px "JetBrains Mono", monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  text.split("\n").forEach((line, i, all) => g.fillText(line, w / 2, h / 2 + (i - (all.length - 1) / 2) * size * 1.1));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Ldr({ a, b }: { a: string; b: string }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(a, b);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e9e4d6"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#c2551f"; g.lineWidth = 14;
    g.beginPath();
    for (let i = 0; i < 7; i++) { const y = 40 + i * 28; g.moveTo(i % 2 ? 210 : 46, y); g.lineTo(i % 2 ? 46 : 210, y + 28); }
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={[[-half, LY, 0], [-half, 0.8, 0], [-0.33, 0.8, 0], [-0.33, 1.6, 0]]} r={0.07}><Nickel /></Lead>
      <Lead pts={[[half, LY, 0], [half, 0.8, 0], [0.33, 0.8, 0], [0.33, 1.6, 0]]} r={0.07}><Nickel /></Lead>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.98, 0.98, 0.45, 32]} />
        <meshStandardMaterial color="#d8d2c2" roughness={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 2.03, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial map={tex} roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  );
}

/** TO-92: flat face toward local +z; pins in order along local x (first pin at −x). */
export function To92({ first, mid, last, marking }: { first: string; mid: string; last: string; marking: string }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(first, last);
  const pm = pinPos(mid);
  void pm;
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const R = 0.9; // 4.5 mm wide
    s.absarc(0, 0, R, Math.PI * 0.18, Math.PI * 0.82, true);
    s.lineTo(R * Math.cos(Math.PI * 0.18), R * Math.sin(Math.PI * 0.18));
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false, curveSegments: 24 });
    g.rotateX(Math.PI / 2);
    g.translate(0, 1.8, -0.25);
    return g;
  }, []);
  const tex = useMemo(() => labelTexture(marking, "#18191b", "#b8bbc1", 256, 128, 48), [marking]);
  const top = 1.2;
  return (
    <group position={center} rotation-y={rotY}>
      {[-half, 0, half].map((x, i) => (
        <Lead key={i} pts={[[x, LY, 0], [x, 0.6, 0], [x * 0.55 / Math.max(half, 0.55), top, 0]]} r={0.07}><Nickel /></Lead>
      ))}
      <mesh geometry={geo} position={[0, top, 0]} castShadow>
        <meshStandardMaterial color="#18191b" roughness={0.6} />
      </mesh>
      <mesh position={[0, top + 0.9, 0.38]}>
        <planeGeometry args={[1.4, 0.7]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
}

const DIODE = {
  "1N4148": { len: 1.4, r: 0.36, body: "#d9822b", band: "#111111", glass: true },
  "1N4007": { len: 2.05, r: 0.53, body: "#1a1a1c", band: "#c9ccd2", glass: false },
} as const;

export function Diode({ anode, cathode, variant }: { anode: string; cathode: string; variant: "1N4148" | "1N4007" }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(anode, cathode);
  const d = DIODE[variant];
  const upright = half * 2 < d.len + 0.9;
  if (upright) {
    // Standing: body above the anode hole, cathode lead loops back down.
    return (
      <group position={center} rotation-y={rotY}>
        <Lead pts={[[-half, LY, 0], [-half, 0.4, 0]]} r={0.07}><Nickel /></Lead>
        <Lead pts={[[-half, 0.4 + d.len, 0], [-half, 0.8 + d.len, 0], [half, 0.8 + d.len, 0], [half, LY, 0]]} r={0.07}><Nickel /></Lead>
        <group position={[-half, 0.4 + d.len / 2, 0]}>
          <DiodeBody d={d} />
        </group>
      </group>
    );
  }
  const Y = d.r + 0.25;
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={[[-half, LY, 0], [-half, Y, 0], [half, Y, 0], [half, LY, 0]]} r={0.07}><Nickel /></Lead>
      <group position={[0, Y, 0]} rotation-z={-Math.PI / 2}>
        <DiodeBody d={d} />
      </group>
    </group>
  );
}

/** Body along local +y; cathode band at +y (towards the cathode lead). */
function DiodeBody({ d }: { d: (typeof DIODE)[keyof typeof DIODE] }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[d.r, d.r, d.len, 24]} />
        <meshStandardMaterial color={d.body} roughness={d.glass ? 0.1 : 0.5} transparent={d.glass} opacity={d.glass ? 0.85 : 1} />
      </mesh>
      <mesh position={[0, d.len / 2 - d.len * 0.12, 0]}>
        <cylinderGeometry args={[d.r * 1.02, d.r * 1.02, d.len * 0.14, 24]} />
        <meshStandardMaterial color={d.band} roughness={0.4} metalness={d.glass ? 0 : 0.5} />
      </mesh>
    </group>
  );
}

/** 6 mm square top-adjust trimmer. */
export function Pot({ a, w, b, setting = 0.5 }: { a: string; w: string; b: string; setting?: number }) {
  const LY = useLeadY();
  void w;
  const { center, rotY, half } = frame(a, b);
  return (
    <group position={center} rotation-y={rotY}>
      {[-half, 0, half].map((x, i) => (
        <Lead key={i} pts={[[x, LY, 0], [x, 0.4, 0]]} r={0.08}><Nickel /></Lead>
      ))}
      <mesh position={[0, 0.4 + 0.7, 0]} castShadow>
        <boxGeometry args={[2.6, 1.4, 2.6]} />
        <meshStandardMaterial color="#2a5aa8" roughness={0.5} />
      </mesh>
      <group position={[0, 1.82, 0]} rotation-y={(setting - 0.5) * Math.PI * 1.5}>
        <mesh>
          <cylinderGeometry args={[0.85, 0.85, 0.12, 24]} />
          <meshStandardMaterial color="#e9e6dc" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[1.3, 0.04, 0.16]} /><meshBasicMaterial color="#555" /></mesh>
        <mesh position={[0, 0.07, 0]}><boxGeometry args={[0.16, 0.04, 1.3]} /><meshBasicMaterial color="#555" /></mesh>
      </group>
    </group>
  );
}

/** TO-220 standing upright, printed face toward local +z, metal tab at the back. */
export function To220({ first, last, marking }: { first: string; last: string; marking: string }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(first, last);
  const W = 3.94, T = 1.77, H = 3.54, base = 1.4;
  const tex = useMemo(() => labelTexture(marking, "#141517", "#c3c6cc", 512, 160, 72), [marking]);
  return (
    <group position={center} rotation-y={rotY}>
      {[-half, 0, half].map((x, i) => (
        <Lead key={i} pts={[[x, LY, 0], [x, base, 0]]} r={0.1}><Nickel /></Lead>
      ))}
      <mesh position={[0, base + H / 2, 0]} castShadow>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial color="#141517" roughness={0.55} />
      </mesh>
      <mesh position={[0, base + H / 2, T / 2 + 0.003]}>
        <planeGeometry args={[W * 0.9, H * 0.35]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <mesh position={[0, base + H + 1.25, -T / 2 + 0.25]} castShadow>
        <boxGeometry args={[W, 2.6, 0.5]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, base + H + 1.5, -T / 2 + 0.25]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.6, 0.6, 0.52, 20]} />
        <meshStandardMaterial color="#1b1c1e" />
      </mesh>
      <mesh position={[0, base, -T / 2 + 0.25]}>
        <boxGeometry args={[W, 0.12, 0.5]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Header({ sig, gnd }: { sig: string; gnd: string }) {
  return (
    <group>
      {[sig, gnd].map((p) => {
        const [x, , z] = pinPos(p);
        return (
          <group key={p} position={[x, 0, z]}>
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.98, 1.0, 0.98]} /><meshStandardMaterial color="#1a1b1d" /></mesh>
            <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.25, 4.4, 0.25]} /><meshStandardMaterial color="#d6b04c" metalness={0.9} roughness={0.25} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** 130-size DC motor lying on the bench; rotor disc spins with `speed` (0..1). */
export function Motor({ pos, neg, at, speed }: { pos: string; neg: string; at: [number, number]; speed: number }) {
  const mode = useOffboard();
  const rotor = useRef<THREE.Group>(null);
  const R = 3.9, L = 9.8, y = TABLE_Y + R;
  const [x, z] = at;
  useFrame((_, d) => { if (rotor.current) rotor.current.rotation.x += Math.min(d, 0.05) * speed * 40; });
  return (
    <group>
      <group position={[x, y, z]} rotation-z={Math.PI / 2}>
        <mesh castShadow><cylinderGeometry args={[R, R, L, 32]} /><meshStandardMaterial color="#c9ccd2" metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0, L / 2 + 0.4, 0]}><cylinderGeometry args={[R * 0.9, R * 0.9, 0.8, 32]} /><meshStandardMaterial color="#e8e2d0" roughness={0.6} /></mesh>
        <mesh position={[0, -L / 2 - 1.2, 0]}><cylinderGeometry args={[0.16, 0.16, 2.4, 12]} /><Nickel /></mesh>
      </group>
      <group ref={rotor} position={[x - L / 2 - 2.2, y, z]}>
        <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[2.6, 2.6, 0.3, 32]} /><meshStandardMaterial color="#c62828" roughness={0.5} /></mesh>
        <mesh position={[-0.2, 1.6, 0]}><boxGeometry args={[0.2, 0.9, 0.9]} /><meshStandardMaterial color="#f2f2f2" /></mesh>
      </group>
      <Lead pts={lead([x + L / 2 + 0.8, y + 1.2, z - 1], pos, mode, -1)} r={0.2} smooth><meshStandardMaterial color="#c62828" roughness={0.45} /></Lead>
      <Lead pts={lead([x + L / 2 + 0.8, y - 1.2, z + 1], neg, mode, 1)} r={0.2} smooth><meshStandardMaterial color="#22252a" roughness={0.45} /></Lead>
    </group>
  );
}

/** PP3 9 V battery lying on its wide face, snap clip toward +x. */
export function Battery9v({ pos, neg, at }: { pos: string; neg: string; at: [number, number] }) {
  const mode = useOffboard();
  const [x, z] = at;
  const Lx = 19.1, Wz = 10.4, H = 6.9, y = TABLE_Y + H / 2;
  const tex = useMemo(() => labelTexture("9V  PP3\nALKALINE", "#1d1f24", "#d9b44a", 512, 256, 64), []);
  return (
    <group>
      <mesh position={[x, y, z]} castShadow>
        <boxGeometry args={[Lx, H, Wz]} />
        <meshStandardMaterial color="#1d1f24" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[x, y + H / 2 + 0.01, z]}>
        <planeGeometry args={[Lx * 0.8, Wz * 0.7]} />
        <meshStandardMaterial map={tex} roughness={0.45} />
      </mesh>
      <mesh position={[x + Lx / 2 + 0.7, y, z]} castShadow>
        <boxGeometry args={[1.4, H * 0.7, Wz * 0.75]} />
        <meshStandardMaterial color="#111214" roughness={0.6} />
      </mesh>
      <Lead pts={lead([x + Lx / 2 + 1.4, y + 0.6, z - 1.2], pos, mode, -1)} r={0.22} smooth><meshStandardMaterial color="#c62828" roughness={0.45} /></Lead>
      <Lead pts={lead([x + Lx / 2 + 1.4, y - 0.6, z + 1.2], neg, mode, 1)} r={0.22} smooth><meshStandardMaterial color="#22252a" roughness={0.45} /></Lead>
    </group>
  );
}

/** USB 5 V power module: small PCB with a USB connector and two leads. */
export function Usb5v({ pos, neg, at }: { pos: string; neg: string; at: [number, number] }) {
  const mode = useOffboard();
  const [x, z] = at;
  const y = TABLE_Y + 0.4;
  return (
    <group>
      <mesh position={[x, y, z]} castShadow><boxGeometry args={[7.9, 0.63, 5.9]} /><meshStandardMaterial color="#1f5f3f" roughness={0.6} /></mesh>
      <mesh position={[x - 3.2, y + 1.0, z]} castShadow><boxGeometry args={[2.4, 1.4, 3.2]} /><meshStandardMaterial color="#c9ccd2" metalness={0.85} roughness={0.3} /></mesh>
      <mesh position={[x + 1, y + 0.4, z - 1.5]}><boxGeometry args={[1.2, 0.3, 0.8]} /><meshStandardMaterial color="#c62828" emissive="#ff2a14" emissiveIntensity={0.8} /></mesh>
      <Lead pts={lead([x + 3.9, y + 0.4, z - 1.2], pos, mode, -1)} r={0.2} smooth><meshStandardMaterial color="#c62828" roughness={0.45} /></Lead>
      <Lead pts={lead([x + 3.9, y + 0.4, z + 1.2], neg, mode, 1)} r={0.2} smooth><meshStandardMaterial color="#22252a" roughness={0.45} /></Lead>
    </group>
  );
}

/** 40 mm 8 Ω speaker, face up on the bench beside the board. */
export function Speaker({ pos, neg, at, level = 0 }: { pos: string; neg: string; at: [number, number]; level?: number }) {
  const mode = useOffboard();
  const [x, z] = at;
  const R = 7.87, y = TABLE_Y; // 40 mm frame
  const cone = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (cone.current) cone.current.position.y = y + 1.9 + Math.sin(clock.elapsedTime * 60) * 0.05 * level; });
  return (
    <group>
      <mesh position={[x, y + 0.7, z]} castShadow><cylinderGeometry args={[2.3, 2.3, 1.4, 32]} /><meshStandardMaterial color="#5a5d63" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[x, y + 1.9, z]} castShadow><cylinderGeometry args={[R, R * 0.4, 1.0, 48, 1, true]} /><meshStandardMaterial color="#9ea2a8" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      <mesh ref={cone} position={[x, y + 1.9, z]}><cylinderGeometry args={[R * 0.92, R * 0.3, 0.9, 48, 1, true]} /><meshStandardMaterial color="#2a2b2e" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh position={[x, y + 1.7, z]}><sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1c1d20" roughness={0.6} /></mesh>
      <Lead pts={lead([x - R * 0.85, y + 1.6, z - 1], pos, mode, -1, -1)} r={0.2} smooth><meshStandardMaterial color="#c62828" roughness={0.45} /></Lead>
      <Lead pts={lead([x - R * 0.85, y + 1.6, z + 1], neg, mode, 1, -1)} r={0.2} smooth><meshStandardMaterial color="#22252a" roughness={0.45} /></Lead>
    </group>
  );
}
