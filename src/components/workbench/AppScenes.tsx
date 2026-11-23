import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Car, City, Palm, Road, Sky } from "./CarScene";

/** Road-work beacon flashing with the 555 timing. */
function BeaconSceneBody({ tHigh, tLow }: { tHigh: number; tLow: number }) {
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f59e0b", emissive: "#ffae2b", roughness: 0.2, transparent: true, opacity: 0.9 }), []);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const on = clock.elapsedTime % (tHigh + tLow) < tHigh;
    lens.emissiveIntensity = on ? 4 : 0.05;
    if (light.current) light.current.intensity = on ? 30 : 0;
  });
  return (
    <>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.12, 1, 0.12]} /><meshStandardMaterial color="#d9dde0" /></mesh>
          <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.5, 0.06, 0.8]} /><meshStandardMaterial color="#333" /></mesh>
        </group>
      ))}
      {[0.75, 0.4].map((y) => (
        <group key={y} position={[0, y, 0.07]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[-1.375 + i * 0.55, 0, 0]}><boxGeometry args={[0.55, 0.22, 0.04]} /><meshStandardMaterial color={i % 2 ? "#f4f4f4" : "#d43c2c"} /></mesh>
          ))}
        </group>
      ))}
      <group position={[1.6, 1.05, 0]}>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.18, 0.2, 0.12, 20]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh material={lens} position={[0, 0.25, 0]}><sphereGeometry args={[0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh material={lens} position={[0, 0.17, 0]}><cylinderGeometry args={[0.18, 0.18, 0.12, 24]} /></mesh>
        <pointLight ref={light} position={[0, 0.3, 0]} color="#ffae2b" distance={8} decay={1.5} />
      </group>
      <mesh position={[-1.6, 1.1, 0]} castShadow><coneGeometry args={[0.2, 0.5, 16]} /><meshStandardMaterial color="#f07a1a" /></mesh>
    </>
  );
}

/** Sunset street: the car crashed into a palm, hazard lights and a beacon flashing at the 555 timing. */
function CrashBody({ tHigh, tLow }: { tHigh: number; tLow: number }) {
  const amber = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a4a00", emissive: "#ffa020" }), []);
  const glow = useRef<THREE.PointLight[]>([]);
  useFrame(({ clock }) => {
    const on = clock.elapsedTime % (tHigh + tLow) < tHigh;
    amber.emissiveIntensity = on ? 5 : 0.05;
    glow.current.forEach((l) => { if (l) l.intensity = on ? 6 : 0; });
  });
  const lamps: [number, number, number][] = [[2.1, 0.62, -0.75], [2.1, 0.62, 0.75], [-2.12, 0.62, -0.75], [-2.12, 0.62, 0.75]];
  return (
    <>
      <Road />
      <City />
      <Palm x={3.9} z={-1.6} h={6} />
      <group position={[0.6, 0, -0.9]} rotation={[0, 0.55, 0.04]}>
        <Car level={0.25} />
        {lamps.map((p, i) => (
          <group key={i} position={p}>
            <mesh material={amber}><boxGeometry args={[0.08, 0.1, 0.22]} /></mesh>
            <pointLight ref={(l) => { if (l) glow.current[i] = l; }} color="#ffa020" distance={4} decay={1.5} />
          </group>
        ))}
        <mesh position={[1.75, 1.08, 0]} rotation-z={0.35}><boxGeometry args={[0.7, 0.06, 1.5]} /><meshStandardMaterial color="#ff2d8a" metalness={0.6} roughness={0.4} /></mesh>
      </group>
      {([[0, 2.6], [-2.5, 2.2]] as const).map(([x, z]) => (
        <mesh key={x} position={[x, 0.25, z]} castShadow><coneGeometry args={[0.2, 0.5, 16]} /><meshStandardMaterial color="#f07a1a" emissive="#f07a1a" emissiveIntensity={0.3} /></mesh>
      ))}
      <group position={[-3.2, 0, 0.6]} rotation-y={0.6} scale={0.8}><BeaconSceneBody tHigh={tHigh} tLow={tLow} /></group>
    </>
  );
}

export function BeaconScene({ tHigh, tLow }: { tHigh: number; tLow: number }) {
  return (
    <div className="h-full w-full touch-none bg-hero">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-6, 4, 10], fov: 40 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <color attach="background" args={["#2a0f3d"]} />
        <fog attach="fog" args={["#3a1450", 16, 45]} />
        <ambientLight intensity={0.6} color="#ffb3d9" />
        <directionalLight position={[-12, 4, -10]} intensity={1.4} color="#ff8a4c" castShadow />
        <Environment resolution={64}>
          <Lightformer intensity={0.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#ff9ad5" />
        </Environment>
        <Sky />
        <CrashBody tHigh={tHigh} tLow={tLow} />
        <OrbitControls enableDamping enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.1} target={[0, 0.8, 0]} autoRotate autoRotateSpeed={0.3} />
      </Canvas>
    </div>
  );
}

/** Driver's-seat view of a dark, crashed car at night; holding the button lights the roof LED and its wire. */
function InteriorBody({ on }: { on: boolean }) {
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ddd", emissive: "#fff1c8" }), []);
  const wire = useMemo(() => new THREE.MeshStandardMaterial({ color: "#331a33", emissive: "#22e3ff" }), []);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    lamp.emissiveIntensity = on ? 4 : 0.02;
    wire.emissiveIntensity = on ? 2.5 : 0.15;
    if (light.current) light.current.intensity = on ? 6 : 0;
  });
  const trim = <meshStandardMaterial color="#2a2230" roughness={0.9} />;
  return (
    <>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[1.8, 0.05, 2.4]} />{trim}</mesh>
      <mesh position={[0, 0, 0]}><boxGeometry args={[1.8, 0.05, 2.4]} />{trim}</mesh>
      {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.3, 0]}><boxGeometry args={[0.05, 0.6, 2.4]} />{trim}</mesh>)}
      <mesh position={[0, 0.9, -1.15]} rotation-x={-0.35}><planeGeometry args={[1.75, 0.8]} /><meshStandardMaterial color="#9ad" transparent opacity={0.08} /></mesh>
      <mesh position={[0, 0.45, -0.95]}><boxGeometry args={[1.8, 0.3, 0.5]} />{trim}</mesh>
      <mesh position={[-0.4, 0.62, -0.65]} rotation-x={-1.1}><torusGeometry args={[0.18, 0.025, 12, 32]} /><meshStandardMaterial color="#111" /></mesh>
      {[-0.4, 0.4].map((x) => (
        <group key={x} position={[x, 0, 0.35]}>
          <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.55, 0.12, 0.55]} /><meshStandardMaterial color="#3a1430" roughness={0.8} /></mesh>
          <mesh position={[0, 0.6, 0.27]} rotation-x={-0.15}><boxGeometry args={[0.55, 0.65, 0.1]} /><meshStandardMaterial color="#3a1430" roughness={0.8} /></mesh>
        </group>
      ))}
      <group position={[0, 1.22, -0.55]}>
        <RoundedBox args={[0.5, 0.04, 0.22]} radius={0.015}><meshStandardMaterial color="#141018" /></RoundedBox>
        <mesh position={[-0.12, on ? -0.025 : -0.04, 0]}><boxGeometry args={[0.1, 0.03, 0.08]} /><meshStandardMaterial color="#d9d9e0" emissive="#22e3ff" emissiveIntensity={on ? 1 : 0.3} /></mesh>
        <mesh material={wire} position={[0.03, -0.025, 0]}><boxGeometry args={[0.2, 0.006, 0.012]} /></mesh>
        <mesh material={lamp} position={[0.15, -0.03, 0]}><boxGeometry args={[0.12, 0.02, 0.12]} /></mesh>
        <pointLight ref={light} position={[0.15, -0.12, 0.1]} color="#fff1c8" distance={3} decay={1.2} />
      </group>
    </>
  );
}

export function InteriorScene({ on }: { on: boolean }) {
  return (
    <div className="h-full w-full touch-none bg-hero">
      <Canvas dpr={[1, 2]} camera={{ position: [-0.4, 0.95, 0.35], fov: 70 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <color attach="background" args={["#0a0614"]} />
        <ambientLight intensity={0.06} color="#7a5cff" />
        <Sky />
        <group position={[0, -1.2, -9]}><Road /><City /></group>
        <directionalLight position={[0, 3, -20]} intensity={0.8} color="#ff7ab0" />
        <InteriorBody on={on} />
        <OrbitControls enableZoom={false} enablePan={false} target={[-0.35, 0.95, -0.3]} rotateSpeed={-0.4} />
      </Canvas>
    </div>
  );
}

function StreetLight({ x }: { x: number }) {
  return (
    <group position={[x, 0, -3.2]}>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.06, 0.08, 4.4, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0.4, 4.35, 0]}><boxGeometry args={[0.9, 0.08, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0.75, 4.28, 0]}><boxGeometry args={[0.3, 0.05, 0.16]} /><meshStandardMaterial color="#fff" emissive="#ffd59a" emissiveIntensity={3} /></mesh>
      <pointLight position={[0.75, 4, 0.5]} color="#ffc27a" intensity={14} distance={9} decay={1.3} />
    </group>
  );
}

/** Hooded figure: walks to the driver door, then flees while the alarm sounds. */
function Intruder({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null);
  const x = useRef(-3.2);
  useFrame(({ clock }, d) => {
    const dt = Math.min(d, 0.05);
    const target = on ? -12 : -0.4;
    const v = on ? 4 : 0.7;
    const dx = target - x.current;
    const moving = Math.abs(dx) > 0.05;
    if (moving) x.current += Math.sign(dx) * Math.min(Math.abs(dx), v * dt);
    if (g.current) {
      g.current.position.set(x.current, moving ? Math.abs(Math.sin(clock.elapsedTime * (on ? 14 : 6))) * 0.06 : 0, 1.3);
      g.current.rotation.y = on ? -Math.PI / 2 : moving ? Math.PI / 2 : Math.PI;
    }
  });
  const cloth = <meshStandardMaterial color="#f2ff00" emissive="#f2ff00" emissiveIntensity={2.6} roughness={0.45} toneMapped={false} />;
  return (
    <group ref={g}>
      {[-0.1, 0.1].map((z) => <mesh key={z} position={[0, 0.45, z]}><boxGeometry args={[0.14, 0.9, 0.14]} />{cloth}</mesh>)}
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.3, 0.7, 0.45]} />{cloth}</mesh>
      <mesh position={[0, 1.78, 0]}><sphereGeometry args={[0.17, 16, 12]} />{cloth}</mesh>
      <mesh position={[0.12, 1.76, 0]}><boxGeometry args={[0.05, 0.08, 0.2]} /><meshStandardMaterial color="#12100a" roughness={0.6} /></mesh>
      <pointLight position={[0, 1.2, 0]} color="#f2ff00" intensity={6} distance={4.5} decay={1.6} />
    </group>
  );
}

function AlarmBody({ on }: { on: boolean }) {
  const amber = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7a4a00", emissive: "#ffa020" }), []);
  const red = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const f = on && Math.floor(clock.elapsedTime * 4) % 2 === 0;
    amber.emissiveIntensity = f ? 5 : 0.05;
    if (red.current) red.current.intensity = f ? 20 : 0;
  });
  const lamps: [number, number, number][] = [[2.1, 0.62, -0.75], [2.1, 0.62, 0.75], [-2.12, 0.62, -0.75], [-2.12, 0.62, 0.75]];
  return (
    <>
      <Road />
      <City />
      {[-8, 0, 8].map((x) => <StreetLight key={x} x={x} />)}
      <Car level={0} />
      {lamps.map((p, n) => <mesh key={n} material={amber} position={p}><boxGeometry args={[0.08, 0.1, 0.22]} /></mesh>)}
      <pointLight ref={red} position={[0, 2, 0]} color="#ffa020" distance={10} decay={1.3} />
      <Intruder on={on} />
    </>
  );
}

export function AlarmScene({ on }: { on: boolean }) {
  return (
    <div className="h-full w-full touch-none bg-hero">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-3, 3.5, 10], fov: 42 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}>
        <color attach="background" args={["#14082a"]} />
        <fog attach="fog" args={["#24103a", 14, 40]} />
        <ambientLight intensity={0.35} color="#9a7aff" />
        <directionalLight position={[-12, 4, -10]} intensity={0.6} color="#ff7ab0" />
        <Environment resolution={64}>
          <Lightformer intensity={0.3} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#ff9ad5" />
        </Environment>
        <Sky />
        <AlarmBody on={on} />
        <OrbitControls enableDamping enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.1} target={[-1, 1, 0]} />
      </Canvas>
    </div>
  );
}
