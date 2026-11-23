import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  BOARD_D, BOARD_H, BOARD_W, COLS, RAIL_HOLES, RAIL_IDS, RAIL_Z, ROWS,
  INSERT, colX, pinPos, railX, rowZ, tip, type V3,
} from "@/lessons/board";
import { resistorBands } from "@/lessons/parts";
import { FLIP_Y, Lead, LeadY, NICKEL, Nickel, OffboardMode, bentLegs, boardToWorld, frame, offboardEnd, useLeadY, useOffboard } from "./common";
import { Battery9v, Diode, Header, Ldr, Motor, Pot, Speaker, To220, To92, Usb5v } from "./parts2";
import { Stripboard } from "./stripboard";
import { BenchTools } from "./tools";
import type { LedDrive } from "@/lessons/models";
import { JOINT_H, PROTRUDE_LONG, PROTRUDE_TRIMMED, STRIP_T, copperOf, generateJoints, stripSegment } from "@/lessons/stripboard";
import type { LessonComponent } from "@/lessons/types";

export type { LedDrive };

export interface WorkbenchProps {
  /** Every component of the lesson, with pins as placed. */
  components: LessonComponent[];
  /** Refs on the board; the others wait in front of it. */
  placed: string[];
  focus?: string[] | undefined;
  leds?: Record<string, LedDrive> | undefined;
  pressed?: string[] | undefined;
  onPress?: ((ref: string, down: boolean) => void) | undefined;
  /** Conventional current path, animated when set. */
  flow?: string[] | null | undefined;
  targets?: { option: string; pins: string[] }[] | undefined;
  onTargetClick?: ((option: string) => void) | undefined;
  onPartClick?: ((ref: string) => void) | undefined;
  /** Stripboard instead of the breadboard. */
  stripboard?: { cols: number; rows: number; cuts: string[] } | undefined;
  /** Track cuts drilled (shown on the copper side). */
  cutsVisible?: boolean | undefined;
  /** Refs whose stripboard joints are soldered. */
  soldered?: string[] | undefined;
  /** Joints the iron visits in turn. */
  solderPins?: string[] | undefined;
  /** Show the copper side. */
  flipped?: boolean | undefined;
  tools?: boolean | undefined;
  meter?: { red: string; black: string; display: string } | null | undefined;
  /** Motor speed 0..1. */
  motor?: number | undefined;
  /** Speaker cone movement 0..1. */
  speaker?: number | undefined;
  /** Leads of soldered parts have been cut short. */
  trimmed?: boolean | undefined;
  /** Semi-transparent board showing copper strips / internal contacts. */
  xray?: boolean | undefined;
}

const TABLE_Y = -BOARD_H;
const ACCENT = "#1aa3a3";
const JUMP_H = 0.32;

// 2xAA holder: 58 x 31 x 15 mm
const HOLDER = { cx: -30.5, cz: -4, w: 22.8, d: 12.2, h: 5.9 };
const HOLDER_END = HOLDER.cx + HOLDER.w / 2;

function batteryLead(pin: string, which: "pos" | "neg", mode: { flipped: boolean; loose: boolean } = { flipped: false, loose: false }): V3[] {
  const start: V3[] = which === "pos" ? [[HOLDER_END, -1.2, -3.2], [HOLDER_END + 1.4, -0.6, -4.2]] : [[HOLDER_END, -1.2, -4.8], [HOLDER_END + 1.4, -0.4, -6.2]];
  if (mode.loose) return [...start, [HOLDER_END + 4, TABLE_Y + 0.22, which === "pos" ? -3 : -7]];
  const [px, , pz] = pinPos(pin);
  const [above, end] = offboardEnd(pin, mode.flipped);
  if (pin.startsWith("S:")) return [...start, [(start[1]![0] + px) / 2, Math.max(1.5, above![1]) + 1, (start[1]![2] + pz) / 2], above!, end!];
  return which === "pos"
    ? [...start, [px - 1.9, 1.2, pz + 0.9], [px, 0.9, pz], tip(pin)]
    : [...start, [px - 1.9, 1.6, pz + 0.1], [px, 1.1, pz], tip(pin)];
}

function centerOf(c: LessonComponent): V3 {
  if (c.kind === "battery") return [HOLDER.cx, 0, HOLDER.cz];
  const ps = Object.values(c.pins).map(pinPos);
  return [ps.reduce((s, p) => s + p[0], 0) / ps.length, 0, ps.reduce((s, p) => s + p[2], 0) / ps.length];
}

export function Workbench(props: WorkbenchProps) {
  const [ready, setReady] = useState(false);
  return (
    <div className="h-full w-full touch-none bg-scene" data-scene-ready={ready ? "" : undefined}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: props.stripboard ? [2, 46, 50] : [-8, 50, 50], fov: 36 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <color attach="background" args={["#e6efef"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 30, 14]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004} />
        <Environment resolution={128}>
          <Lightformer intensity={1.4} position={[0, 20, 0]} rotation-x={Math.PI / 2} scale={[60, 60, 1]} />
          <Lightformer intensity={0.6} position={[-30, 8, 10]} rotation-y={Math.PI / 2} scale={[40, 10, 1]} />
          <Lightformer intensity={0.6} position={[30, 8, -10]} rotation-y={-Math.PI / 2} scale={[40, 10, 1]} />
        </Environment>
        <Scene {...props} />
        <OrbitControls enableDamping minDistance={14} maxDistance={110} maxPolarAngle={Math.PI / 2.15} target={props.stripboard ? [3, -1, 5] : [-7, -2, 5]} />
      </Canvas>
    </div>
  );
}

/** World position the iron and probes touch: the side of the solder fillet on the copper. */
function jointWorld(pin: string, flipped: boolean): V3 {
  if (!pin.startsWith("S:")) { const [x, , z] = pinPos(pin); return [x, 0.05, z]; }
  const [x, y, z] = copperOf(pin);
  return boardToWorld([x, y - JOINT_H * 0.55, z], flipped);
}

const TRAY = { x0: -16, z0: 19, step: 5.5, perRow: 7, rowStep: 6 };

function Scene(props: WorkbenchProps) {
  const { components, placed, focus = [], leds = {}, pressed = [], onPress, flow, targets = [], onTargetClick, onPartClick } = props;
  const flipped = !!props.flipped;
  const strip = props.stripboard;
  const flip = useRef({ theta: 0, y: 0 });
  const unplaced = components.filter((c) => !placed.includes(c.ref) && !OFFBOARD.has(c.kind));
  const leadY = (c: LessonComponent) => {
    if (!strip) return -INSERT;
    const trimmed = !!props.trimmed && !!props.soldered?.includes(c.ref);
    return -(STRIP_T + (trimmed ? PROTRUDE_TRIMMED : PROTRUDE_LONG));
  };
  const offsetOf = (c: LessonComponent): V3 => {
    if (placed.includes(c.ref)) return [0, 0, 0];
    if (c.kind === "battery") return [-4, 0, 16];
    if (OFFBOARD.has(c.kind)) return [0, 0, 22];
    // Parts tray on the bench: lead tips rest on the tray floor.
    const i = unplaced.indexOf(c);
    const [cx, , cz] = centerOf(c);
    const sx = TRAY.x0 + 2 + (i % TRAY.perRow) * TRAY.step, sz = TRAY.z0 + 2.5 + Math.floor(i / TRAY.perRow) * TRAY.rowStep;
    return [sx - cx, TABLE_Y + 0.15 - leadY(c), sz - cz];
  };
  const placedSet = new Set(placed);
  const focusPins = components.filter((c) => focus.includes(c.ref) && placedSet.has(c.ref)).flatMap((c) => Object.values(c.pins));
  const [solderIdx, setSolderIdx] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const solderPins = props.solderPins ?? [];
  const solderKey = solderPins.join(",");
  useEffect(() => {
    setSolderIdx(0);
    setVisited(new Set(solderPins.slice(0, 1)));
    if (solderPins.length < 1) return;
    let k = 0;
    const id = setInterval(() => {
      k = (k + 1) % solderPins.length;
      setSolderIdx(k);
      setVisited((v) => (v.has(solderPins[k]!) ? v : new Set([...v, solderPins[k]!])));
    }, 2200);
    return () => clearInterval(id);
  }, [solderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeJoint = solderPins[solderIdx];
  // A joint exists once its part is placed and soldered; in the current soldering step only after the iron has visited it.
  const joints = strip
    ? generateJoints(components.filter((c) => placedSet.has(c.ref)), props.soldered ?? []).filter((j) => !solderPins.includes(j.pin) || visited.has(j.pin))
    : [];
  const meter = props.meter ? { red: jointWorld(props.meter.red, flipped), black: jointWorld(props.meter.black, flipped), display: props.meter.display } : null;
  if (meter && !flipped) { meter.red[1] = 0.1; meter.black[1] = 0.1; }
  const segments = strip ? [...new Map(focusPins.filter((p) => p.startsWith("S:")).map((p) => {
    const s = stripSegment(p, strip.cols, props.cutsVisible ? strip.cuts : []);
    return [`${s.row}:${s.from}`, s] as const;
  })).values()] : [];
  const xray = !!props.xray;
  return (
    <group>
      <Mat />
      <PartsTray show={unplaced.length > 0} rows={Math.ceil(unplaced.length / TRAY.perRow)} />
      <FlipGroup flipped={flipped} state={flip}>
        {strip ? (
          <Stripboard cols={strip.cols} rows={strip.rows} cuts={props.cutsVisible ? strip.cuts : []} joints={joints} segments={segments} xray={xray} />
        ) : (
          <Breadboard xray={xray} />
        )}
        {focusPins.map((p, i) => <HoleMarker key={`f-${p}-${i}`} pin={p} label under={flipped} />)}
        {targets.map((t) => t.pins.map((p) => <HoleMarker key={`${t.option}-${p}`} pin={p} onClick={() => onTargetClick?.(t.option)} />))}
        {flow && <CurrentFlow flow={flow} battery={components.find((c) => c.kind === "battery")} />}
      </FlipGroup>
      {components.map((c) => {
        const isPlaced = placedSet.has(c.ref);
        const off = OFFBOARD.has(c.kind);
        return (
          <Animated key={c.ref} id={c.ref} offset={offsetOf(c)} onClick={onPartClick} flip={isPlaced && !off ? flip : null}>
            <OffboardMode.Provider value={{ flipped, loose: !isPlaced }}>
              <LeadY.Provider value={leadY(c)}>
                <Part c={c} led={leds[c.ref]} pressed={pressed.includes(c.ref)} onPress={onPress} motor={props.motor ?? 0} speaker={props.speaker ?? 0} />
              </LeadY.Provider>
            </OffboardMode.Provider>
          </Animated>
        );
      })}
      <BenchTools show={!!props.tools} joint={activeJoint ? jointWorld(activeJoint, flipped) : null} meter={meter} />
    </group>
  );
}

/** Shallow tray on the bench where parts wait until they are placed. */
function PartsTray({ show, rows }: { show: boolean; rows: number }) {
  if (!show) return null;
  const w = TRAY.perRow * TRAY.step + 1, d = Math.max(1, rows) * TRAY.rowStep + 0.5;
  const cx = TRAY.x0 + w / 2 - 0.25, cz = TRAY.z0 + d / 2;
  return (
    <group position={[cx, TABLE_Y, cz]}>
      <mesh position={[0, 0.07, 0]} receiveShadow><boxGeometry args={[w, 0.14, d]} /><meshStandardMaterial color="#d4d7dc" roughness={0.8} /></mesh>
      {[[0, -d / 2], [0, d / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.35, z!]}><boxGeometry args={[w, 0.7, 0.2]} /><meshStandardMaterial color="#c3c7cd" roughness={0.8} /></mesh>
      ))}
      {[[-w / 2, 0], [w / 2, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.35, z!]}><boxGeometry args={[0.2, 0.7, d]} /><meshStandardMaterial color="#c3c7cd" roughness={0.8} /></mesh>
      ))}
    </group>
  );
}

const OFFBOARD = new Set<LessonComponent["kind"]>(["battery", "battery9v", "usb5v", "motor", "speaker"]);

type FlipState = { theta: number; y: number };

/** Turns the board over to show the copper side. Placed parts follow through the shared state. */
function FlipGroup({ flipped, state, children }: { flipped: boolean; state: { current: FlipState }; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-4 * Math.min(d, 0.05));
    state.current.theta += ((flipped ? Math.PI : 0) - state.current.theta) * k;
    state.current.y += ((flipped ? FLIP_Y : 0) - state.current.y) * k;
    g.rotation.x = state.current.theta;
    g.position.y = state.current.y;
  });
  return <group ref={ref}>{children}</group>;
}

function Part({ c, led, pressed, onPress, motor, speaker }: { c: LessonComponent; led: LedDrive | undefined; pressed: boolean; onPress: WorkbenchProps["onPress"]; motor: number; speaker: number }) {
  const p = c.pins;
  switch (c.kind) {
    case "battery": return <BatteryHolder pos={p["pos"]!} neg={p["neg"]!} />;
    case "wire": return p["a"]!.startsWith("S:")
      ? <Jumper a={p["a"]!} b={p["b"]!} color={c.color ?? "#c62828"} h={0.17} via={[]} r={0.15} />
      : <Jumper a={p["a"]!} b={p["b"]!} color={c.color ?? "#c62828"} h={c.height ?? JUMP_H} via={c.via ?? []} />;
    case "resistor": return <Resistor a={p["a"]!} b={p["b"]!} ohms={c.ohms ?? 220} />;
    case "led": return <Led anode={p["anode"]!} cathode={p["cathode"]!} drive={led ?? { mode: "off" }} size={c.size ?? 5} lift={c.lift ?? 0} />;
    case "capacitor_electrolytic": return <CapElectrolytic pos={p["pos"]!} neg={p["neg"]!} size={c.size ?? 5} bodyH={c.bodyH ?? 11} />;
    case "capacitor_ceramic": return <CapCeramic a={p["a"]!} b={p["b"]!} />;
    case "ic_dip8":
    case "ic_dip16": return <Dip pins={p} marking={c.marking ?? ""} />;
    case "pushbutton": return <PushButton c={c} pressed={pressed} onPress={onPress} />;
    case "buzzer": return <Buzzer pos={p["pos"]!} neg={p["neg"]!} />;
    case "ldr": return <Ldr a={p["a"]!} b={p["b"]!} />;
    case "npn": return <To92 first={p["c"]!} mid={p["b"]!} last={p["e"]!} marking={c.marking ?? ""} />;
    case "temp_sensor": return <To92 first={p["vs"]!} mid={p["out"]!} last={p["gnd"]!} marking={c.marking ?? ""} />;
    case "diode": return <Diode anode={p["anode"]!} cathode={p["cathode"]!} variant={c.variant ?? "1N4148"} />;
    case "pot": return <Pot a={p["a"]!} w={p["w"]!} b={p["b"]!} />;
    case "regulator": return <To220 first={p["in"]!} last={p["out"]!} marking={c.marking ?? ""} />;
    case "mosfet": return <To220 first={p["g"]!} last={p["s"]!} marking={c.marking ?? ""} />;
    case "motor": return <Motor pos={p["pos"]!} neg={p["neg"]!} at={c.at ?? [10, 18]} speed={motor} />;
    case "battery9v": return <Battery9v pos={p["pos"]!} neg={p["neg"]!} at={c.at ?? [-27, -2]} />;
    case "usb5v": return <Usb5v pos={p["pos"]!} neg={p["neg"]!} at={c.at ?? [-20, 2]} />;
    case "speaker": return <Speaker pos={p["pos"]!} neg={p["neg"]!} at={c.at ?? [17, 2]} level={speaker} />;
    case "header": return <Header sig={p["sig"]!} gnd={p["gnd"]!} />;
    default: return null;
  }
}

function Animated({ id, offset, children, onClick, flip }: { id: string; offset: V3; children: ReactNode; onClick?: ((id: string) => void) | undefined; flip: { current: FlipState } | null }) {
  const ref = useRef<THREE.Group>(null);
  const cur = useRef(new THREE.Vector3(...offset));
  const target = useRef(new THREE.Vector3());
  target.current.set(...offset);
  useFrame((_, d) => {
    const g = ref.current;
    if (!g) return;
    cur.current.lerp(target.current, 1 - Math.exp(-5 * Math.min(d, 0.05)));
    const lift = Math.min(cur.current.distanceTo(target.current), 8) * 0.8;
    g.position.set(cur.current.x, cur.current.y + lift + (flip ? flip.current.y : 0), cur.current.z);
    g.rotation.x = flip ? flip.current.theta : 0;
  });
  return (
    <group
      ref={ref}
      onClick={(e) => { if (!onClick) return; e.stopPropagation(); onClick(id); }}
      onPointerOver={() => { if (onClick) document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      {children}
    </group>
  );
}

// ---------- environment ----------

function Mat() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2f4a4d";
    g.fillRect(0, 0, 1024, 1024);
    g.lineWidth = 1;
    for (const [step, a] of [[64, 0.08], [256, 0.16]] as const) {
      g.strokeStyle = `rgba(255,255,255,${a})`;
      for (let i = 0; i <= 1024; i += step) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.moveTo(0, i); g.lineTo(1024, i); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 3);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[-10, TABLE_Y, 6]} receiveShadow>
      <planeGeometry args={[160, 120]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
}

function Breadboard({ xray }: { xray: boolean }) {
  const tex = useMemo(() => {
    const P = 64;
    const c = document.createElement("canvas");
    c.width = BOARD_W * P;
    c.height = Math.round(BOARD_D * P);
    const g = c.getContext("2d")!;
    const X = (x: number) => (x + BOARD_W / 2) * P;
    const Z = (z: number) => (z + BOARD_D / 2) * P;
    g.fillStyle = "#f3f2ee";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#d9d8d2";
    g.fillRect(0, Z(-0.45), c.width, 0.9 * P);
    g.fillStyle = "#c8c7c0";
    g.fillRect(0, Z(-0.08), c.width, 0.16 * P);
    const socket = (x: number, z: number) => {
      const s = 0.42 * P;
      g.fillStyle = "#bdbcb5";
      g.fillRect(X(x) - s / 2 - 2, Z(z) - s / 2 - 2, s + 4, s + 4);
      g.fillStyle = "#1a1b1d";
      g.fillRect(X(x) - s / 2, Z(z) - s / 2, s, s);
      g.fillStyle = "#3a3c40";
      g.fillRect(X(x) - s / 2, Z(z) + s / 6, s, s / 3);
    };
    for (let col = 1; col <= COLS; col++) for (const r of ROWS) socket(colX(col), rowZ(r));
    for (const id of RAIL_IDS) for (let i = 0; i < RAIL_HOLES; i++) socket(railX(i), RAIL_Z[id]);
    const stripe = (z: number, color: string) => { g.fillStyle = color; g.fillRect(X(-15), Z(z) - 0.05 * P, 29 * P, 0.1 * P); };
    stripe(RAIL_Z["top-"] - 0.75, "#2456b8");
    stripe(RAIL_Z["top+"] + 0.75, "#c62828");
    stripe(RAIL_Z["bot-"] - 0.75, "#2456b8");
    stripe(RAIL_Z["bot+"] + 0.75, "#c62828");
    g.textAlign = "center";
    g.textBaseline = "middle";
    const label = (t: string, x: number, z: number, color = "#4b4e55") => { g.fillStyle = color; g.fillText(t, X(x), Z(z)); };
    g.font = `600 ${0.62 * P}px "JetBrains Mono", monospace`;
    for (const x of [-15.6, 15.6]) {
      label("−", x, RAIL_Z["top-"], "#2456b8"); label("+", x, RAIL_Z["top+"], "#c62828");
      label("−", x, RAIL_Z["bot-"], "#2456b8"); label("+", x, RAIL_Z["bot+"], "#c62828");
    }
    g.font = `500 ${0.44 * P}px "JetBrains Mono", monospace`;
    for (let col = 1; col <= COLS; col++) {
      label(String(col), colX(col), rowZ("a") - 0.85);
      label(String(col), colX(col), rowZ("j") + 0.85);
    }
    g.font = `600 ${0.52 * P}px "JetBrains Mono", monospace`;
    for (const r of ROWS) { label(r, -15.6, rowZ(r)); label(r, 15.6, rowZ(r)); }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 16;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group>
      <mesh position={[0, -BOARD_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_W, BOARD_H, BOARD_D]} />
        <meshStandardMaterial key={xray ? "x" : "o"} color="#efeee9" roughness={0.55} transparent={xray} opacity={xray ? 0.25 : 1} depthWrite={!xray} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[BOARD_W, BOARD_D]} />
        <meshStandardMaterial key={xray ? "x" : "o"} map={tex} roughness={0.5} transparent={xray} opacity={xray ? 0.35 : 1} depthWrite={!xray} />
      </mesh>
      {xray && <BreadboardContacts />}
    </group>
  );
}

/** Short hole name for labels: "H6", "e10", "+8". */
export function holeName(pin: string): string {
  if (pin.startsWith("S:")) return pin.slice(2);
  const r = /^(top|bot)([+-]):(\d+)$/.exec(pin);
  return r ? `${r[2]}${r[3]}` : pin;
}

const labelCache = new Map<string, THREE.CanvasTexture>();
function labelTex(text: string) {
  let t = labelCache.get(text);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = ACCENT;
  g.beginPath(); g.roundRect(4, 8, 120, 48, 8); g.fill();
  g.fillStyle = "#ffffff"; g.font = `600 34px "JetBrains Mono", monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 33);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(text, t);
  return t;
}

/** Ring around a hole, optionally with a floating name; `under` puts it on the copper side (board turned over). */
/** Internal spring-clip strips, shown in X-ray: one per 5-hole column half and one per rail. */
function BreadboardContacts() {
  const cols = Array.from({ length: COLS }, (_, i) => i + 1);
  return (
    <group>
      {cols.flatMap((c) => [rowZ("c"), rowZ("h")].map((z) => (
        <mesh key={`${c}:${z}`} position={[colX(c), -0.9, z]}><boxGeometry args={[0.5, 0.9, 4.6]} /><Nickel /></mesh>
      )))}
      {RAIL_IDS.map((id) => (
        <mesh key={id} position={[(railX(0) + railX(RAIL_HOLES - 1)) / 2, -0.9, RAIL_Z[id]]}>
          <boxGeometry args={[railX(RAIL_HOLES - 1) - railX(0) + 0.6, 0.9, 0.5]} />
          <meshStandardMaterial color={id.endsWith("+") ? "#d9a0a0" : "#a0b4d9"} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function HoleMarker({ pin, onClick, label, under }: { pin: string; onClick?: () => void; label?: boolean; under?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, , z] = pinPos(pin);
  const strip = pin.startsWith("S:");
  const y = under && strip ? -STRIP_T - 0.02 : 0.02;
  const dir = under && strip ? -1 : 1;
  useFrame(({ clock }) => {
    const m = ref.current?.material;
    if (m instanceof THREE.MeshBasicMaterial) m.opacity = 0.55 + Math.sin(clock.elapsedTime * 5) * 0.35;
  });
  return (
    <group position={[x, y, z]}>
      <mesh ref={ref} rotation-x={-dir * Math.PI / 2} rotation-z={Math.PI / 4}>
        <ringGeometry args={[0.36, 0.5, strip ? 24 : 4]} />
        <meshBasicMaterial color={ACCENT} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {label && (
        <sprite position={[0.55, dir * 1.1, -0.55]} scale={[1.5, 0.75, 1]} renderOrder={10}>
          <spriteMaterial map={labelTex(holeName(pin))} depthTest={false} transparent />
        </sprite>
      )}
      {onClick && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ---------- parts ----------



function BatteryHolder({ pos, neg }: { pos: string; neg: string }) {
  const { cx, cz, w, d, h } = HOLDER;
  const y0 = TABLE_Y;
  const cellR = 2.85, cellL = 19.9; // AA: 14.5 x 50.5 mm
  const mode = useOffboard();
  const red = batteryLead(pos, "pos", mode), black = batteryLead(neg, "neg", mode);
  return (
    <group>
      <mesh position={[cx, y0 + 0.4, cz]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.8, d]} />
        <meshStandardMaterial color="#1d1f22" roughness={0.7} />
      </mesh>
      {[cz - d / 2 + 0.25, cz + d / 2 - 0.25].map((z) => (
        <mesh key={z} position={[cx, y0 + h / 2 - 0.6, z]} castShadow>
          <boxGeometry args={[w, h - 1.2, 0.5]} />
          <meshStandardMaterial color="#1d1f22" roughness={0.7} />
        </mesh>
      ))}
      {[cx - w / 2 + 0.4, cx + w / 2 - 0.4].map((x) => (
        <mesh key={x} position={[x, y0 + h / 2, cz]} castShadow>
          <boxGeometry args={[0.8, h, d]} />
          <meshStandardMaterial color="#1d1f22" roughness={0.7} />
        </mesh>
      ))}
      {[cz - 2.95, cz + 2.95].map((z) => (
        <group key={z} position={[cx, y0 + 0.8 + cellR, z]} rotation-z={Math.PI / 2}>
          <mesh castShadow>
            <cylinderGeometry args={[cellR, cellR, cellL - 1.2, 32]} />
            <meshStandardMaterial color="#2f6b4f" roughness={0.4} metalness={0.2} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, s * ((cellL - 1.2) / 2 + 0.3), 0]}>
              <cylinderGeometry args={[cellR * 0.97, cellR * 0.97, 0.6, 32]} />
              <Nickel />
            </mesh>
          ))}
        </group>
      ))}
      <Lead pts={red} r={0.22} smooth><meshStandardMaterial color="#c62828" roughness={0.45} /></Lead>
      <Lead pts={black} r={0.22} smooth><meshStandardMaterial color="#22252a" roughness={0.45} /></Lead>
      {!mode.loose && !pos.startsWith("S:") && [red, black].map((l, i) => {
        const end = l[l.length - 1]!;
        return (
          <mesh key={i} position={[end[0], end[1] + 0.45, end[2]]}>
            <cylinderGeometry args={[0.1, 0.1, 0.9, 8]} />
            <Nickel />
          </mesh>
        );
      })}
    </group>
  );
}


function Led({ anode, cathode, drive, size, lift }: { anode: string; cathode: string; drive: LedDrive; size: number; lift: number }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(anode, cathode);
  const k = size / 5; // 3 mm or 5 mm body
  const BASE = 1.6 + lift;
  const [la, lk] = bentLegs(half, 0.5 * k, 0.8, BASE, LY);
  const flange = useMemo(() => {
    const R = 1.14 * k, flatX = 0.95 * k; // flange, flat on the cathode side
    const th = Math.acos(flatX / R);
    const s = new THREE.Shape();
    s.absarc(0, 0, R, th, Math.PI * 2 - th, false);
    s.lineTo(flatX, R * Math.sin(th));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.4 * k, bevelEnabled: false, curveSegments: 32 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [k]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d0221b", emissive: "#ff2a14", roughness: 0.2, transparent: true, opacity: 0.88 }), []);
  const light = useRef<THREE.PointLight>(null);
  const halo = useRef<THREE.Mesh>(null);
  useEffect(() => { mat.color.set(drive.mode === "burned" ? "#3b2621" : "#d0221b"); }, [drive.mode, mat]);
  useFrame(({ clock }) => {
    let b = drive.mode === "on" ? drive.level ?? 1 : 0;
    if (drive.mode === "blink") b = clock.elapsedTime % (drive.tHigh + drive.tLow) < drive.tHigh ? 1 : 0;
    if (drive.mode === "level") b = drive.b;
    if (drive.mode === "decay") b = drive.b0 * Math.exp(-Math.max(0, performance.now() / 1000 - drive.since) / drive.tau);
    if (drive.mode === "chase") b = Math.floor(clock.elapsedTime * drive.hz) % drive.count === drive.index ? 1 : 0;
    mat.emissiveIntensity = 3 * b;
    if (light.current) light.current.intensity = 18 * b * k;
    if (halo.current) halo.current.visible = b > 0.05;
  });
  const r = 0.985 * k;
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={la} r={0.09 * k}><Nickel /></Lead>
      <Lead pts={lk} r={0.09 * k}><Nickel /></Lead>
      <group position={[0, BASE, 0]}>
        <mesh geometry={flange} material={mat} castShadow />
        <mesh position={[0, 0.4 * k + 1.0 * k, 0]} material={mat} castShadow><cylinderGeometry args={[r, r, 2.0 * k, 32]} /></mesh>
        <mesh position={[0, 2.4 * k, 0]} material={mat} castShadow><sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <pointLight ref={light} color="#ff3a20" intensity={0} distance={10} decay={2} position={[0, 2 * k, 0]} />
        <mesh ref={halo} position={[0, 2 * k, 0]} visible={false}>
          <sphereGeometry args={[1.8 * k, 24, 16]} />
          <meshBasicMaterial color="#ff4a30" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Resistor({ a, b, ohms }: { a: string; b: string; ohms: number }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(a, b);
  const Y = 0.75, r = 0.47, len = 2.5; // 6.3 x 2.4 mm body
  const bands = resistorBands(ohms);
  const offs = [-0.85, -0.5, -0.15, 0.8]; // first band nearest pin a
  if (half * 2 < len + 0.4) {
    // Standing (hairpin) mount: body above pin a, the other lead loops down to pin b.
    return (
      <group position={center} rotation-y={rotY}>
        <Lead pts={[[-half, LY, 0], [-half, 0.4, 0]]} r={0.08}><Nickel /></Lead>
        <Lead pts={[[-half, 0.4 + len, 0], [-half, 0.8 + len, 0], [half, 0.8 + len, 0], [half, LY, 0]]} r={0.08}><Nickel /></Lead>
        <group position={[-half, 0.4 + len / 2, 0]}>
          <mesh castShadow><cylinderGeometry args={[r * 0.88, r * 0.88, len - 0.6, 24]} /><meshStandardMaterial color="#d9c49b" roughness={0.6} /></mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * (len / 2 - 0.35), 0]} scale={[1, 0.8, 1]}><sphereGeometry args={[r, 24, 16]} /><meshStandardMaterial color="#d9c49b" roughness={0.6} /></mesh>
          ))}
          {bands.map((c, i) => (
            <mesh key={i} position={[0, -offs[i]!, 0]}>
              <cylinderGeometry args={[r * 0.92, r * 0.92, 0.18, 24]} />
              <meshStandardMaterial color={c} roughness={0.5} metalness={i === 3 ? 0.6 : 0} />
            </mesh>
          ))}
        </group>
      </group>
    );
  }
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={[[-half, LY, 0], [-half, Y, 0], [half, Y, 0], [half, LY, 0]]} r={0.08}><Nickel /></Lead>
      <group position={[0, Y, 0]} rotation-z={Math.PI / 2}>
        <mesh castShadow>
          <cylinderGeometry args={[r * 0.88, r * 0.88, len - 0.6, 24]} />
          <meshStandardMaterial color="#d9c49b" roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s * (len / 2 - 0.35), 0]} scale={[1, 0.8, 1]} castShadow>
            <sphereGeometry args={[r, 24, 16]} />
            <meshStandardMaterial color="#d9c49b" roughness={0.6} />
          </mesh>
        ))}
        {bands.map((c, i) => (
          // local +y is world −x after rotation-z, so negate to keep the order from pin a
          <mesh key={i} position={[0, -offs[i]!, 0]}>
            <cylinderGeometry args={[r * 0.92, r * 0.92, 0.18, 24]} />
            <meshStandardMaterial color={c} roughness={0.5} metalness={i === 3 ? 0.6 : 0} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Radial electrolytic, 5 x 11 mm, stripe on the − side. */
function CapElectrolytic({ pos, neg, size, bodyH }: { pos: string; neg: string; size: number; bodyH: number }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(pos, neg);
  const r = size / 2 / 2.54, h = bodyH / 2.54, base = 0.5;
  const [lp, ln] = bentLegs(half, 0.4, 0.3, base, LY);
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={lp} r={0.08}><Nickel /></Lead>
      <Lead pts={ln} r={0.08}><Nickel /></Lead>
      <mesh position={[0, base + h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 32]} />
        <meshStandardMaterial color="#1f3a6b" roughness={0.45} />
      </mesh>
      <mesh position={[0, base + h / 2, 0]}>
        <cylinderGeometry args={[r * 1.01, r * 1.01, h * 0.92, 24, 1, true, Math.PI / 2 - 0.45, 0.9]} />
        <meshStandardMaterial color="#c9ccd6" roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, base + h + 0.01, 0]}>
        <cylinderGeometry args={[r * 0.92, r * 0.92, 0.02, 32]} />
        <meshStandardMaterial color="#b9bdc4" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Ceramic disc, 5 mm diameter. */
function CapCeramic({ a, b }: { a: string; b: string }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(a, b);
  const [la, lb] = bentLegs(half, 0.5, 0.4, 1.2, LY);
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={la} r={0.07}><Nickel /></Lead>
      <Lead pts={lb} r={0.07}><Nickel /></Lead>
      <mesh position={[0, 1.95, 0]} rotation-x={Math.PI / 2} scale={[1, 1, 1]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.4, 28]} />
        <meshStandardMaterial color="#c27a2c" roughness={0.55} />
      </mesh>
    </group>
  );
}

/** DIP package (8 or 16 pins). Body axis runs from pin 1 to pin n/2; notch at the pin-1 end. */
function Dip({ pins, marking }: { pins: Record<string, string>; marking: string }) {
  const LY = useLeadY();
  const n = Object.keys(pins).length;
  const P = (k: number) => pinPos(pins[String(k)]!);
  const all = Array.from({ length: n }, (_, i) => P(i + 1));
  const cx = all.reduce((s, p) => s + p[0], 0) / n;
  const cz = all.reduce((s, p) => s + p[2], 0) / n;
  const p1 = P(1), pEnd = P(n / 2);
  const ax = new THREE.Vector3(pEnd[0] - p1[0], 0, pEnd[2] - p1[2]);
  const L = ax.length() + 0.86;
  ax.normalize();
  const rotY = -Math.atan2(ax.z, ax.x); // local +x = pin 1 → pin n/2
  const W = 2.5; // 6.35 mm body
  const y0 = 0.35, H = 1.3;
  const label = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#16171a"; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#b9bcc2"; g.font = `500 72px "JetBrains Mono", monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(marking, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [marking]);
  // Which side (local ±z) is pin 1 on?
  const local1 = new THREE.Vector3(p1[0] - cx, 0, p1[2] - cz).applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotY);
  const side1 = Math.sign(local1.z) || 1;
  return (
    <group>
      {all.map((p, i) => {
        const toward = new THREE.Vector3(cx - p[0], 0, cz - p[2]);
        const perp = toward.sub(ax.clone().multiplyScalar(toward.dot(ax))).normalize().multiplyScalar(0.3);
        return <Lead key={i} pts={[[p[0], LY, p[2]], [p[0], 0.75, p[2]], [p[0] + perp.x, 0.75, p[2] + perp.z]]} r={0.07}><Nickel /></Lead>;
      })}
      <group position={[cx, 0, cz]} rotation-y={rotY}>
        <mesh position={[0, y0 + H / 2, 0]} castShadow>
          <boxGeometry args={[L, H, W]} />
          <meshStandardMaterial color="#16171a" roughness={0.6} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, y0 + H + 0.002, 0]}>
          <planeGeometry args={[L * 0.7, W * 0.45]} />
          <meshStandardMaterial map={label} roughness={0.6} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} rotation-z={-Math.PI / 2} position={[-L / 2, y0 + H + 0.004, 0]}>
          <circleGeometry args={[0.32, 20, 0, Math.PI]} />
          <meshBasicMaterial color="#050506" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[-L / 2 + 0.6, y0 + H + 0.004, side1 * 0.75]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color="#3a3c40" />
        </mesh>
      </group>
    </group>
  );
}

function PushButton({ c, pressed, onPress }: { c: LessonComponent; pressed: boolean; onPress: WorkbenchProps["onPress"] }) {
  const LY = useLeadY();
  const legs = ["a1", "a2", "b1", "b2"].map((k) => pinPos(c.pins[k]!));
  const [cx, , cz] = centerOf(c);
  const S = 2.36, H = 1.38; // 6 x 6 x 3.5 mm
  const cap = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (!cap.current) return;
    const target = 1.38 + 0.45 - (pressed ? 0.35 : 0);
    cap.current.position.y += (target - cap.current.position.y) * (1 - Math.exp(-25 * Math.min(d, 0.05)));
  });
  return (
    <group>
      {legs.map((p, i) => {
        const iz = Math.sign(cz - p[2]);
        return <Lead key={i} pts={[[p[0], LY, p[2]], [p[0], 0.3, p[2]], [p[0], 0.3, cz - iz * (S / 2 - 0.1)]]} r={0.08}><Nickel /></Lead>;
      })}
      <mesh position={[cx, 0.15 + H / 2, cz]} castShadow>
        <boxGeometry args={[S, H - 0.3, S]} />
        <meshStandardMaterial color="#1c1d20" roughness={0.6} />
      </mesh>
      <mesh position={[cx, 0.15 + H - 0.12, cz]}>
        <boxGeometry args={[S * 0.98, 0.08, S * 0.98]} />
        <Nickel />
      </mesh>
      <mesh
        ref={cap}
        position={[cx, 1.83, cz]}
        castShadow
        onPointerDown={(e) => { e.stopPropagation(); onPress?.(c.ref, true); }}
        onPointerOver={() => { if (onPress) document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
      >
        <cylinderGeometry args={[0.69, 0.69, 0.9, 28]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** 12 mm active piezo buzzer, + marked on top. */
function Buzzer({ pos, neg }: { pos: string; neg: string }) {
  const LY = useLeadY();
  const { center, rotY, half } = frame(pos, neg);
  const R = 2.36, H = 3.7, base = 0.3;
  return (
    <group position={center} rotation-y={rotY}>
      <Lead pts={[[-half, LY, 0], [-half, base + 0.2, 0]]} r={0.08}><Nickel /></Lead>
      <Lead pts={[[half, LY, 0], [half, base + 0.2, 0]]} r={0.08}><Nickel /></Lead>
      <mesh position={[0, base + H / 2, 0]} castShadow>
        <cylinderGeometry args={[R, R, H, 40]} />
        <meshStandardMaterial color="#141517" roughness={0.75} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, base + H + 0.003, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <group position={[-1.3, base + H + 0.01, 0]}>
        <mesh><boxGeometry args={[0.6, 0.02, 0.12]} /><meshBasicMaterial color="#d8dade" /></mesh>
        <mesh><boxGeometry args={[0.12, 0.02, 0.6]} /><meshBasicMaterial color="#d8dade" /></mesh>
      </group>
    </group>
  );
}

/** Pre-cut jumper: bent 90° at both ends, lying close to the board (or along waypoints). */
function Jumper({ a, b, color, h, via, r = 0.24 }: { a: string; b: string; color: string; h: number; via: [number, number][]; r?: number }) {
  const LY = useLeadY();
  const pa = pinPos(a), pb = pinPos(b);
  const pts: V3[] = [[pa[0], h, pa[2]], ...via.map(([x, z]): V3 => [x, h, z]), [pb[0], h, pb[2]]];
  return (
    <group>
      <Lead pts={pts} r={r}><meshStandardMaterial color={color} roughness={0.5} /></Lead>
      {[pa, pb].map((p, i) => (
        <group key={i}>
          <mesh position={[p[0], (h + LY) / 2, p[2]]}>
            <cylinderGeometry args={[0.1, 0.1, h - LY, 10]} />
            <Nickel />
          </mesh>
          <mesh position={[p[0], h - 0.1, p[2]]}>
            <cylinderGeometry args={[r, r, Math.min(0.35, h + 0.1), 12]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CurrentFlow({ flow, battery }: { flow: string[]; battery: LessonComponent | undefined }) {
  const N = 70;
  const ref = useRef<THREE.InstancedMesh>(null);
  const key = flow.join(",");
  const { pts, cum, total } = useMemo(() => {
    const out: V3[] = [];
    for (const t of flow) {
      if ((t === "B+" || t === "B-") && battery) {
        const l = batteryLead(battery.pins[t === "B+" ? "pos" : "neg"]!, t === "B+" ? "pos" : "neg").slice(0, -1);
        out.push(...(t === "B+" ? l : l.reverse()));
        continue;
      }
      const up = t.endsWith("^");
      const [x, , z] = pinPos(up ? t.slice(0, -1) : t);
      // Stripboard: below the hole on the copper strip (lead → joint → strip); breadboard: inside the socket strip.
      out.push([x, up ? 0.8 : t.startsWith("S:") ? -STRIP_T - 0.12 : 0.12, z]);
    }
    const p = out.map((v) => new THREE.Vector3(...v));
    const c = [0];
    for (let i = 1; i < p.length; i++) c.push(c[i - 1]! + p[i]!.distanceTo(p[i - 1]!));
    return { pts: p, cum: c, total: c[c.length - 1]! };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, battery]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || total === 0) return;
    for (let k = 0; k < N; k++) {
      const d = (clock.elapsedTime * 4 + (k * total) / N) % total;
      let i = 1;
      while (i < cum.length - 1 && cum[i]! < d) i++;
      const a = pts[i - 1]!, b = pts[i]!;
      const seg = cum[i]! - cum[i - 1]!;
      tmp.position.lerpVectors(a, b, seg > 0 ? (d - cum[i - 1]!) / seg : 0);
      tmp.updateMatrix();
      m.setMatrixAt(k, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[0.16, 10, 8]} />
      <meshBasicMaterial color="#ffd23f" toneMapped={false} />
    </instancedMesh>
  );
}
