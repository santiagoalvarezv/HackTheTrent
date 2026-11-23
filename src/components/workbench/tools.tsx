import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { BOARD_H, type V3 } from "@/lessons/board";
import { Lead } from "./common";

const T = -BOARD_H; // bench surface
const STEEL = { color: "#c3c7cd", metalness: 0.9, roughness: 0.3 } as const;

/** Slides its children in from the front of the bench when `show` is set. */
function SlideIn({ show, children }: { show: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    const g = ref.current;
    if (!g) return;
    const target = show ? 0 : 60;
    g.position.z += (target - g.position.z) * (1 - Math.exp(-4 * Math.min(d, 0.05)));
    g.visible = g.position.z < 58;
  });
  return <group ref={ref} position={[0, 0, 60]}>{children}</group>;
}

function screenTexture(text: string) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 200;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b7c4a8"; g.fillRect(0, 0, 512, 200);
  g.fillStyle = "#1b2016"; g.font = `600 120px "JetBrains Mono", monospace`;
  g.textAlign = "right"; g.textBaseline = "middle";
  g.fillText(text, 480, 108);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface ToolsProps {
  show: boolean;
  /** World position of the joint being soldered, or null when the iron is in its stand. */
  joint: V3 | null;
  meter: { red: V3; black: V3; display: string } | null;
}

const STAND: V3 = [27, T, 12];
const REEL: V3 = [32, T, 0];

export function BenchTools({ show, joint, meter }: ToolsProps) {
  return (
    <group>
      <SlideIn show={show}>
        <IronStand />
        <SolderReel />
        <FumeExtractor />
        <Glasses />
        <FluxPen />
        <HelpingHands />
        <SideCutters />
        <DesolderPump />
      </SlideIn>
      <SlideIn show={show}><Iron joint={show ? joint : null} /></SlideIn>
      <SlideIn show={show || !!meter}><Multimeter meter={meter} /></SlideIn>
    </group>
  );
}

function IronStand() {
  const helix = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = i * 0.35, y = i * 0.045;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.9, y, Math.sin(a) * 0.9));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.06, 6, false);
  }, []);
  const [x, y, z] = STAND;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[4.2, 4.6, 0.8, 40]} /><meshStandardMaterial color="#2a2c30" roughness={0.6} /></mesh>
      {/* sponge tray with damp sponge and brass wool */}
      <mesh position={[-1.6, 1.0, 1.4]}><boxGeometry args={[3.2, 0.4, 2.2]} /><meshStandardMaterial color="#1c1d20" /></mesh>
      <mesh position={[-1.6, 1.3, 1.4]}><boxGeometry args={[2.8, 0.4, 1.8]} /><meshStandardMaterial color="#d9b23a" roughness={0.95} /></mesh>
      <mesh position={[1.9, 1.5, 1.6]}><icosahedronGeometry args={[1.0, 1]} /><meshStandardMaterial color="#c9a34a" metalness={0.9} roughness={0.75} flatShading /></mesh>
      <group position={[0.8, 0.8, -1.4]} rotation-z={-0.75}>
        <mesh geometry={helix} castShadow><meshStandardMaterial {...STEEL} /></mesh>
      </group>
    </group>
  );
}

/** Soldering iron: rests in the stand, or moves to the joint with the solder wire. */
function Iron({ joint }: { joint: V3 | null }) {
  const iron = useRef<THREE.Group>(null);
  const wire = useRef<THREE.Mesh>(null);
  const rest = useMemo(() => new THREE.Vector3(STAND[0] + 2.4, STAND[1] + 4.6, STAND[2] - 3.2), []);
  const target = useRef(new THREE.Vector3());
  useFrame(({ clock }, d) => {
    const g = iron.current;
    if (!g) return;
    if (joint) target.current.set(joint[0], joint[1], joint[2]); // tip touches the joint exactly
    else target.current.copy(rest);
    g.position.lerp(target.current, 1 - Math.exp(-6 * Math.min(d, 0.05)));
    g.rotation.set(0, 0, joint ? 0.9 : 0.75);
    if (wire.current) {
      wire.current.visible = !!joint;
      // Solder is fed in for part of each 3 s cycle: heat 0–1.2 s, feed 1.2–2.2 s, withdraw.
      const ph = clock.elapsedTime % 3;
      const feed = ph > 1.2 && ph < 2.2 ? 1 : 0.6;
      if (joint) wire.current.position.set(joint[0] - 1.6 * feed, joint[1] + 1.2 * feed, joint[2] + 0.4);
    }
  });
  return (
    <group>
      <group ref={iron} position={rest.toArray() as V3}>
        {/* tip at the group origin; handle extends up and to the right */}
        <group rotation-z={0}>
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.08, 0.2, 2.2, 12]} /><meshStandardMaterial {...STEEL} /></mesh>
          <mesh position={[0, 3.2, 0]}><cylinderGeometry args={[0.32, 0.32, 2.0, 16]} /><meshStandardMaterial color="#9ea3aa" metalness={0.8} roughness={0.35} /></mesh>
          <mesh position={[0, 6.0, 0]} castShadow><cylinderGeometry args={[0.65, 0.55, 4.2, 20]} /><meshStandardMaterial color="#1f4f8a" roughness={0.55} /></mesh>
          <mesh position={[0, 8.6, 0]}><cylinderGeometry args={[0.25, 0.4, 1.2, 12]} /><meshStandardMaterial color="#1b1c1e" /></mesh>
        </group>
      </group>
      <mesh ref={wire} rotation-z={0.9} visible={false}>
        <cylinderGeometry args={[0.07, 0.07, 6, 8]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
    </group>
  );
}

function SolderReel() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e8e6df"; g.fillRect(0, 0, 512, 512);
    g.fillStyle = "#1b1c1e"; g.font = `600 52px "JetBrains Mono", monospace`; g.textAlign = "center";
    g.fillText("LEAD-FREE", 256, 200); g.fillText("Sn99.3Cu0.7", 256, 270); g.fillText("0.7 mm", 256, 340);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const [x, y, z] = REEL;
  return (
    <group position={[x, y + 2.2, z]} rotation-x={Math.PI / 2}>
      <mesh castShadow><cylinderGeometry args={[2.6, 2.6, 0.3, 32]} /><meshStandardMaterial color="#d23a2a" /></mesh>
      <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[2.6, 2.6, 0.3, 32]} /><meshStandardMaterial color="#d23a2a" /></mesh>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[1.9, 1.9, 1.6, 32]} /><meshStandardMaterial {...STEEL} roughness={0.5} /></mesh>
      <mesh position={[0, -0.16, 0]} rotation-x={Math.PI / 2}><circleGeometry args={[2.4, 32]} /><meshStandardMaterial map={tex} /></mesh>
    </group>
  );
}

/** Desk fume extractor with spinning fan and carbon filter, aimed at the work area. */
function FumeExtractor() {
  const fan = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (fan.current) fan.current.rotation.z += Math.min(d, 0.05) * 18; });
  return (
    <group position={[12, T, -15]} rotation-y={-0.5}>
      <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[6, 0.6, 4]} /><meshStandardMaterial color="#2a2c30" /></mesh>
      <group position={[0, 4.6, 0]} rotation-x={-0.25}>
        <mesh castShadow><boxGeometry args={[7.6, 7.6, 3]} /><meshStandardMaterial color="#3a3d43" roughness={0.6} /></mesh>
        {/* carbon filter on the intake face */}
        <mesh position={[0, 0, 1.52]}><planeGeometry args={[6.8, 6.8]} /><meshStandardMaterial color="#111214" roughness={1} /></mesh>
        <group ref={fan} position={[0, 0, 1.0]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} rotation-z={(i * Math.PI * 2) / 5} position={[0, 0, 0]}>
              <boxGeometry args={[0.9, 5.6, 0.08]} />
              <meshStandardMaterial color="#6b6f76" transparent opacity={0.75} />
            </mesh>
          ))}
        </group>
        {[1.2, 2.2, 3.1].map((r) => (
          <mesh key={r} position={[0, 0, 1.56]}><torusGeometry args={[r, 0.05, 6, 40]} /><meshStandardMaterial {...STEEL} /></mesh>
        ))}
      </group>
    </group>
  );
}

function Glasses() {
  return (
    <group position={[-12, T + 0.5, 18]} rotation-y={0.3}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} rotation-x={-0.2}>
          <boxGeometry args={[2.8, 1.8, 0.12]} />
          <meshPhysicalMaterial color="#cfe3f0" transparent opacity={0.35} roughness={0.05} />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 0]}><boxGeometry args={[6.2, 0.3, 0.3]} /><meshStandardMaterial color="#e3741c" /></mesh>
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, 0.5, -2.4]}><boxGeometry args={[0.2, 0.2, 5]} /><meshStandardMaterial color="#e3741c" /></mesh>
      ))}
    </group>
  );
}

function FluxPen() {
  return (
    <group position={[-4, T + 0.5, 21]} rotation-z={Math.PI / 2} rotation-y={0.4}>
      <mesh castShadow><cylinderGeometry args={[0.5, 0.5, 6, 16]} /><meshStandardMaterial color="#e8e6df" /></mesh>
      <mesh position={[0, 3.6, 0]}><cylinderGeometry args={[0.55, 0.55, 1.4, 16]} /><meshStandardMaterial color="#d9a400" /></mesh>
    </group>
  );
}

function HelpingHands() {
  return (
    <group position={[24, T, -6]}>
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[6, 1.2, 4]} /><meshStandardMaterial color="#1b1c1e" metalness={0.4} /></mesh>
      <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.18, 0.18, 6.8, 10]} /><meshStandardMaterial {...STEEL} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Lead pts={[[0, 6.5, 0], [s * 2, 7.4, 0.5], [s * 4, 6.2, 1.5]]} r={0.12}><meshStandardMaterial {...STEEL} /></Lead>
          <mesh position={[s * 4.4, 5.9, 1.7]} rotation-z={s * 0.6}><boxGeometry args={[0.5, 1.4, 0.4]} /><meshStandardMaterial color="#c9a34a" metalness={0.8} roughness={0.35} /></mesh>
        </group>
      ))}
      <mesh position={[0, 7.8, 1.2]} rotation-x={-0.5}><torusGeometry args={[2.2, 0.18, 10, 40]} /><meshStandardMaterial color="#1b1c1e" /></mesh>
      <mesh position={[0, 7.8, 1.2]} rotation-x={-0.5 + Math.PI / 2}><cylinderGeometry args={[2.1, 2.1, 0.1, 40]} /><meshPhysicalMaterial color="#dfeef6" transparent opacity={0.3} roughness={0.02} /></mesh>
    </group>
  );
}

function SideCutters() {
  return (
    <group position={[8, T + 0.35, 21]} rotation-y={0.5}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.7, 0, 1.6]} rotation-y={s * 0.15}><boxGeometry args={[0.7, 0.5, 5]} /><meshStandardMaterial color="#c62828" roughness={0.6} /></mesh>
      ))}
      <mesh position={[0, 0, -1.6]}><boxGeometry args={[1.4, 0.5, 2.2]} /><meshStandardMaterial {...STEEL} /></mesh>
    </group>
  );
}

function DesolderPump() {
  return (
    <group position={[17, T + 0.8, 22]} rotation-z={Math.PI / 2} rotation-x={0.2}>
      <mesh castShadow><cylinderGeometry args={[0.8, 0.8, 8, 20]} /><meshStandardMaterial color="#a9adb3" metalness={0.85} roughness={0.3} /></mesh>
      <mesh position={[0, -4.8, 0]}><cylinderGeometry args={[0.2, 0.5, 1.6, 16]} /><meshStandardMaterial color="#e8e6df" /></mesh>
      <mesh position={[0, 4.6, 0]}><cylinderGeometry args={[0.35, 0.35, 1.4, 12]} /><meshStandardMaterial color="#1b1c1e" /></mesh>
    </group>
  );
}

const METER_AT: V3 = [-22, T, 14];

/** Digital multimeter; probes go to the given points, display shows the reading. */
function Multimeter({ meter }: { meter: ToolsProps["meter"] }) {
  const tex = useMemo(() => screenTexture(meter?.display ?? "0.00"), [meter?.display]);
  useEffect(() => () => tex.dispose(), [tex]);
  const [x, y, z] = METER_AT;
  const jackRed: V3 = [x + 1.6, y + 1.1, z + 5.2];
  const jackBlack: V3 = [x - 1.6, y + 1.1, z + 5.2];
  const restRed: V3 = [x + 6, y + 0.6, z + 4];
  const restBlack: V3 = [x + 6.5, y + 0.6, z + 6];
  const red = meter?.red ?? restRed, black = meter?.black ?? restBlack;
  return (
    <group>
      <group position={[x, y + 0.8, z]} rotation-x={-0.08}>
        <mesh castShadow><boxGeometry args={[7, 1.6, 13]} /><meshStandardMaterial color="#e0b11e" roughness={0.6} /></mesh>
        <mesh position={[0, 0.82, 0]}><boxGeometry args={[6.2, 0.05, 12]} /><meshStandardMaterial color="#1f2124" /></mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.86, -3.6]}><planeGeometry args={[5.2, 2.2]} /><meshStandardMaterial map={tex} roughness={0.4} /></mesh>
        <mesh position={[0, 1.0, 0.8]}><cylinderGeometry args={[1.6, 1.6, 0.5, 32]} /><meshStandardMaterial color="#2c2e33" /></mesh>
        <mesh position={[0, 1.27, -0.4]}><boxGeometry args={[0.25, 0.05, 1.4]} /><meshStandardMaterial color="#e8e6df" /></mesh>
      </group>
      <Probe from={jackRed} to={red} color="#c62828" />
      <Probe from={jackBlack} to={black} color="#22252a" />
    </group>
  );
}

function Probe({ from, to, color }: { from: V3; to: V3; color: string }) {
  const handleTop: V3 = [to[0] + 1.2, to[1] + 5.2, to[2] + 1.2];
  const mid: V3 = [(from[0] + handleTop[0]) / 2, Math.max(from[1], handleTop[1]) + 2, (from[2] + handleTop[2]) / 2];
  const dir = new THREE.Vector3(handleTop[0] - to[0], handleTop[1] - to[1], handleTop[2] - to[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const center: V3 = [(to[0] + handleTop[0]) / 2, (to[1] + handleTop[1]) / 2, (to[2] + handleTop[2]) / 2];
  return (
    <group>
      <Lead pts={[from, mid, handleTop]} r={0.14} smooth><meshStandardMaterial color={color} roughness={0.5} /></Lead>
      <group position={center} quaternion={q}>
        <mesh position={[0, len * 0.1, 0]} castShadow><cylinderGeometry args={[0.35, 0.3, len * 0.8, 12]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
        <mesh position={[0, -len * 0.4, 0]}><cylinderGeometry args={[0.04, 0.08, len * 0.2, 8]} /><meshStandardMaterial {...STEEL} /></mesh>
      </group>
    </group>
  );
}
