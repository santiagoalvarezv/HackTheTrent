import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/** Night street with a car whose headlights follow `level` (0..1). */
export function CarScene({ level }: { level: number }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="h-full w-full touch-none bg-hero" data-scene-ready={ready ? "" : undefined}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [9, 4.5, 11], fov: 38 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; requestAnimationFrame(() => setReady(true)); }}>
        <color attach="background" args={["#2a0f3d"]} />
        <fog attach="fog" args={["#3a1450", 16, 45]} />
        <ambientLight intensity={0.6} color="#ffb3d9" />
        <directionalLight position={[-12, 4, -10]} intensity={1.4} color="#ff8a4c" castShadow />
        <Sky />
        <City />
        <Environment resolution={64}>
          <Lightformer intensity={0.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#8fc9c9" />
          <Lightformer intensity={0.4} position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
        </Environment>
        <Road />
        <Car level={level} />
        <OrbitControls enableDamping enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.1} target={[0.5, 0.7, 0]} autoRotate autoRotateSpeed={0.4} />
      </Canvas>
    </div>
  );
}

export function Road() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1c1426" roughness={0.25} metalness={0.4} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-14 + i * 4, 0.01, 2.6]}>
          <planeGeometry args={[2, 0.15]} />
          <meshStandardMaterial color="#d9d3b0" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.08, -3]} receiveShadow>
        <boxGeometry args={[80, 0.16, 1.5]} />
        <meshStandardMaterial color="#3a4447" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.36, z]} rotation-x={Math.PI / 2}>
      <mesh castShadow><cylinderGeometry args={[0.36, 0.36, 0.26, 24]} /><meshStandardMaterial color="#141516" roughness={0.8} /></mesh>
      <mesh position={[0, z > 0 ? 0.14 : -0.14, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 16]} /><meshStandardMaterial color="#b9bec4" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  );
}

export function Car({ level }: { level: number }) {
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f1e6", emissive: "#fff3cf", roughness: 0.1 }), []);
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff2c4", transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  const spots = useRef<THREE.SpotLight[]>([]);
  const cur = useRef(0);
  const targets = useMemo(() => [new THREE.Object3D(), new THREE.Object3D()], []);
  useEffect(() => { targets.forEach((t, i) => t.position.set(12, 0, i ? 0.55 : -0.55)); }, [targets]);
  useFrame((_, d) => {
    cur.current += (level - cur.current) * (1 - Math.exp(-6 * Math.min(d, 0.05)));
    const l = cur.current;
    lens.emissiveIntensity = 0.2 + 4 * l;
    beam.opacity = 0.18 * l;
    spots.current.forEach((s) => { if (s) s.intensity = 160 * l; });
  });
  const paint = "#ff2d8a";
  return (
    <group>
      <RoundedBox args={[4.2, 0.7, 1.8]} radius={0.2} position={[0, 0.7, 0]} castShadow>
        <meshPhysicalMaterial color={paint} metalness={0.6} roughness={0.35} clearcoat={1} />
      </RoundedBox>
      <RoundedBox args={[2.2, 0.65, 1.6]} radius={0.25} position={[-0.3, 1.3, 0]} castShadow>
        <meshPhysicalMaterial color={paint} metalness={0.6} roughness={0.35} clearcoat={1} />
      </RoundedBox>
      <mesh position={[-0.3, 1.33, 0]}>
        <boxGeometry args={[2.0, 0.45, 1.62]} />
        <meshStandardMaterial color="#132126" metalness={0.4} roughness={0.15} />
      </mesh>
      <mesh position={[0.78, 1.3, 0]} rotation-z={-0.5}>
        <boxGeometry args={[0.05, 0.6, 1.5]} />
        <meshStandardMaterial color="#132126" metalness={0.4} roughness={0.15} />
      </mesh>
      <mesh position={[2.12, 0.5, 0]}><boxGeometry args={[0.1, 0.25, 1.6]} /><meshStandardMaterial color="#2a2d30" roughness={0.6} /></mesh>
      <mesh position={[2.11, 0.78, 0]}><boxGeometry args={[0.04, 0.18, 0.7]} /><meshStandardMaterial color="#121314" /></mesh>
      {[-0.6, 0.6].map((z) => (
        <mesh key={`t${z}`} position={[-2.11, 0.82, z]}><boxGeometry args={[0.04, 0.14, 0.35]} /><meshStandardMaterial color="#7a0f0f" emissive="#ff2a14" emissiveIntensity={0.6} /></mesh>
      ))}
      {[-1.3, 1.35].flatMap((x) => [-0.85, 0.85].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} />))}
      {[-0.55, 0.55].map((z, i) => (
        <group key={z} position={[2.1, 0.85, z]}>
          <mesh material={lens} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.14, 0.14, 0.06, 20]} /></mesh>
          <mesh material={beam} position={[2.6, -0.2, 0]} rotation-z={Math.PI / 2}>
            <coneGeometry args={[1.1, 5, 24, 1, true]} />
          </mesh>
          <spotLight ref={(s) => { if (s) spots.current[i] = s; }} target={targets[i]!} angle={0.45} penumbra={0.6} distance={18} decay={1.6} color="#fff1c8" castShadow />
          <primitive object={targets[i]!} />
        </group>
      ))}
    </group>
  );
}

/** Sunset gradient backdrop with a striped sun. */
export function Sky() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 4; c.height = 256;
    const g = c.getContext("2d")!; const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#1b0b3a"); gr.addColorStop(0.45, "#7a1f6e"); gr.addColorStop(0.75, "#ff5e7a"); gr.addColorStop(1, "#ffb347");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group>
      <mesh><sphereGeometry args={[60, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} /></mesh>
      <group position={[-30, 6, -30]} rotation-y={Math.PI / 4}>
        <mesh><circleGeometry args={[7, 48]} /><meshBasicMaterial color="#ffcf5a" fog={false} /></mesh>
        {[-1.5, -3, -4.5].map((y, i) => (
          <mesh key={y} position={[0, y, 0.01]}><planeGeometry args={[15, 0.35 + i * 0.25]} /><meshBasicMaterial color="#ff5e7a" fog={false} /></mesh>
        ))}
      </group>
    </group>
  );
}

export function Palm({ x, z, h = 6 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} rotation-z={0.08} castShadow><cylinderGeometry args={[0.12, 0.22, h, 8]} /><meshStandardMaterial color="#3a2618" roughness={0.9} /></mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0.25, h, 0]} rotation={[0, (i / 7) * Math.PI * 2, -0.5]}>
          <boxGeometry args={[2.4, 0.04, 0.45]} />
          <meshStandardMaterial color="#1a3a2a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

const NEON = ["#ff2d8a", "#22e3ff", "#b26bff", "#ffcf5a"];

/** Pastel buildings with neon trim and palm trees along the boulevard. */
export function City() {
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => {
        const h = 3 + ((i * 37) % 5);
        const x = -16 + i * 4;
        const neon = NEON[i % NEON.length]!;
        return (
          <group key={i} position={[x, 0, -7]}>
            <mesh position={[0, h / 2, 0]} receiveShadow><boxGeometry args={[3.4, h, 3]} /><meshStandardMaterial color={i % 2 ? "#f2c6d8" : "#bfe6e8"} roughness={0.8} /></mesh>
            <mesh position={[0, h - 0.3, 1.52]}><boxGeometry args={[3.2, 0.12, 0.05]} /><meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={3} /></mesh>
            <mesh position={[0, 1.2, 1.52]}><boxGeometry args={[2.2, 0.08, 0.05]} /><meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={2} /></mesh>
          </group>
        );
      })}
      {[-12, -6, 0, 6, 12].map((x) => <Palm key={x} x={x} z={-4} h={5 + (Math.abs(x) % 3)} />)}
    </group>
  );
}
