"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ROOM_W = 20;
const ROOM_D = 14;
const ROOM_H = 4.5;

/* ── Hologram display ─────────────────────────────────────────── */

function HoloDisplay({ position, rotY = 0, color = "#00ccff" }: { position: [number, number, number]; rotY?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 2 + Math.sin(clock.getElapsedTime() * 1.5 + position[0]) * 0.8;
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.03]} />
        <meshStandardMaterial color="#111118" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Screen */}
      <mesh ref={ref} position={[0, 1.4, 0.02]}>
        <planeGeometry args={[1.1, 0.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.7} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 1, 6]} />
        <meshStandardMaterial color="#444455" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 8]} />
        <meshStandardMaterial color="#333344" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ── Terminal console ─────────────────────────────────────────── */

function Terminal({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  const screenRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = screenRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 1.5 + Math.sin(clock.getElapsedTime() * 2 + position[2] * 3) * 0.5;
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Desk */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.25} metalness={0.5} />
      </mesh>
      {/* Desk base */}
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[1.3, 0.74, 0.6]} />
        <meshStandardMaterial color="#141422" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* LED strip on desk edge */}
      <mesh position={[0, 0.78, 0.33]}>
        <boxGeometry args={[1.3, 0.02, 0.01]} />
        <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={4} />
      </mesh>
      {/* Screen */}
      <mesh ref={screenRef} position={[0, 1.15, -0.15]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.02]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

/* ── Energy column ────────────────────────────────────────────── */

function EnergyColumn({ position, color = "#00ccff" }: { position: [number, number, number]; color?: string }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = coreRef.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 3 + Math.sin(clock.getElapsedTime() * 2 + position[0] * 2) * 1.5;
    coreRef.current.rotation.y = clock.getElapsedTime() * 0.5;
  });
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.16, 8]} />
        <meshStandardMaterial color="#222233" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Column tube */}
      <mesh position={[0, ROOM_H / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, ROOM_H - 0.3, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={0.4} />
      </mesh>
      {/* Spinning energy core */}
      <mesh ref={coreRef} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, ROOM_H - 0.08, 0]}>
        <cylinderGeometry args={[0.3, 0.25, 0.16, 8]} />
        <meshStandardMaterial color="#222233" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Light */}
      <pointLight position={[0, 1.5, 0]} color={color} intensity={1.5} distance={5} decay={2} />
    </group>
  );
}

/* ── Hover pod (seating) ──────────────────────────────────────── */

function HoverPod({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.8 + position[0]) * 0.04;
  });
  return (
    <group ref={ref} position={position} rotation={[0, rotY, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.4, 0.12, 0.7]} />
        <meshStandardMaterial color="#1a1a30" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.65, -0.28]}>
        <boxGeometry args={[1.4, 0.5, 0.08]} />
        <meshStandardMaterial color="#1a1a30" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Glow underside */}
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 0.6]} />
        <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={2} transparent opacity={0.3} />
      </mesh>
      <pointLight position={[0, 0.2, 0]} color="#00ffaa" intensity={0.5} distance={2} decay={2} />
    </group>
  );
}

/* ── Data stream particles ────────────────────────────────────── */

function DataStreams() {
  const count = 80;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * ROOM_W * 0.85,
        z: (Math.random() - 0.5) * ROOM_D * 0.85,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * ROOM_H,
        scale: 0.008 + Math.random() * 0.015,
        drift: (Math.random() - 0.5) * 0.3,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const y = (p.phase + t * p.speed) % ROOM_H;
      dummy.position.set(
        p.x + Math.sin(t * 0.5 + p.phase) * p.drift,
        y,
        p.z + Math.cos(t * 0.3 + p.phase) * p.drift,
      );
      dummy.scale.set(p.scale, p.scale * 3, p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* ── Grid floor ───────────────────────────────────────────────── */

function GridFloor() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    matRef.current.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 0.4) * 0.1;
  });
  return (
    <group>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial ref={matRef} color="#0a0a18" emissive="#001122" emissiveIntensity={0.3} roughness={0.12} metalness={0.4} />
      </mesh>
      {/* Grid lines X */}
      {Array.from({ length: 21 }).map((_, i) => {
        const x = (i - 10) * 1;
        return (
          <mesh key={`gx${i}`} position={[x, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.01, ROOM_D]} />
            <meshBasicMaterial color="#0044aa" transparent opacity={0.25} />
          </mesh>
        );
      })}
      {/* Grid lines Z */}
      {Array.from({ length: 15 }).map((_, i) => {
        const z = (i - 7) * 1;
        return (
          <mesh key={`gz${i}`} position={[0, 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[ROOM_W, 0.01]} />
            <meshBasicMaterial color="#0044aa" transparent opacity={0.25} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Rotating ring decoration ─────────────────────────────────── */

function SpinningRing({ position, color = "#00ccff", size = 0.8 }: { position: [number, number, number]; color?: string; size?: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.x = clock.getElapsedTime() * 0.3;
    ref.current.rotation.z = clock.getElapsedTime() * 0.2;
  });
  return (
    <mesh ref={ref} position={position}>
      <torusGeometry args={[size, 0.02, 8, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} />
    </mesh>
  );
}

/* ── Main environment export ──────────────────────────────────── */

export default function SciFiEnvironment() {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group>
      {/* Grid floor */}
      <GridFloor />

      {/* Walls — dark panels with metallic sheen */}
      <mesh position={[0, ROOM_H / 2, -halfD]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#0c0c1e" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, halfD]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#0c0c1e" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-halfW, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#0e0e22" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[halfW, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#0e0e22" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#060612" />
      </mesh>

      {/* ── Wall neon strips ───────────────────────────── */}
      {/* Back wall horizontal */}
      <mesh position={[0, 3.2, -halfD + 0.05]}>
        <boxGeometry args={[16, 0.06, 0.03]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[0, 1.0, -halfD + 0.05]}>
        <boxGeometry args={[16, 0.04, 0.03]} />
        <meshStandardMaterial color="#ff00aa" emissive="#ff00aa" emissiveIntensity={4} />
      </mesh>
      {/* Side wall horizontal */}
      <mesh position={[-halfW + 0.05, 2.8, 0]}>
        <boxGeometry args={[0.03, 0.06, 12]} />
        <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={4} />
      </mesh>
      <mesh position={[halfW - 0.05, 2.8, 0]}>
        <boxGeometry args={[0.03, 0.06, 12]} />
        <meshStandardMaterial color="#00ffaa" emissive="#00ffaa" emissiveIntensity={4} />
      </mesh>
      {/* Vertical corner neons */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`corner${i}`} position={[sx * (halfW - 0.05), ROOM_H / 2, sz * (halfD - 0.05)]}>
          <boxGeometry args={[0.04, ROOM_H, 0.04]} />
          <meshStandardMaterial
            color={i < 2 ? "#ff00aa" : "#00ccff"}
            emissive={i < 2 ? "#ff00aa" : "#00ccff"}
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      {/* ── Energy columns ─────────────────────────────── */}
      <EnergyColumn position={[-3, 0, -halfD + 0.8]} color="#00ccff" />
      <EnergyColumn position={[3, 0, -halfD + 0.8]} color="#ff00aa" />
      <EnergyColumn position={[-halfW + 0.8, 0, 0]} color="#00ffaa" />
      <EnergyColumn position={[halfW - 0.8, 0, 0]} color="#00ffaa" />

      {/* ── Terminals ──────────────────────────────────── */}
      <Terminal position={[-6, 0, -halfD + 1.5]} rotY={0} />
      <Terminal position={[6, 0, -halfD + 1.5]} rotY={0} />

      {/* ── Holo displays ──────────────────────────────── */}
      <HoloDisplay position={[-4, 0, -halfD + 0.3]} color="#00ccff" />
      <HoloDisplay position={[0, 0, -halfD + 0.3]} color="#ff00aa" />
      <HoloDisplay position={[4, 0, -halfD + 0.3]} color="#00ffaa" />

      {/* ── Hover pods (seating) ───────────────────────── */}
      <HoverPod position={[-7, 0, -4]} rotY={0.3} />
      <HoverPod position={[7, 0, -4]} rotY={-0.3} />
      <HoverPod position={[-7, 0, 4]} rotY={Math.PI - 0.3} />
      <HoverPod position={[7, 0, 4]} rotY={Math.PI + 0.3} />

      {/* ── Central platform ───────────────────────────── */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.5, 6]} />
        <meshStandardMaterial color="#111128" emissive="#0033aa" emissiveIntensity={1} roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.55, 32]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={3} />
      </mesh>

      {/* ── Spinning rings ─────────────────────────────── */}
      <SpinningRing position={[0, ROOM_H - 0.5, 0]} color="#00ccff" size={1.2} />
      <SpinningRing position={[0, ROOM_H - 0.5, 0]} color="#ff00aa" size={0.9} />

      {/* ── Data stream particles ──────────────────────── */}
      <DataStreams />

      {/* ── LIGHTING ═══════════════════════════════════════ */}

      {/* Ambient — cool tinted */}
      <ambientLight intensity={0.35} color="#8899cc" />

      {/* Hemisphere */}
      <hemisphereLight color="#4466aa" groundColor="#110022" intensity={0.3} />

      {/* Main overhead — white-blue */}
      <pointLight position={[0, ROOM_H - 0.3, 0]} color="#aaccff" intensity={4} distance={16} decay={2} />

      {/* Cyan accents */}
      <pointLight position={[-4, 3, -halfD + 1]} color="#00ccff" intensity={4} distance={10} decay={2} />
      <pointLight position={[4, 3, -halfD + 1]} color="#00ccff" intensity={4} distance={10} decay={2} />

      {/* Magenta accents */}
      <pointLight position={[-4, 3, halfD - 1]} color="#ff00aa" intensity={3} distance={10} decay={2} />
      <pointLight position={[4, 3, halfD - 1]} color="#ff00aa" intensity={3} distance={10} decay={2} />

      {/* Mid-room fill */}
      <pointLight position={[-3, 2.5, 0]} color="#ccddff" intensity={2.5} distance={8} decay={2} />
      <pointLight position={[3, 2.5, 0]} color="#ccddff" intensity={2.5} distance={8} decay={2} />
      <pointLight position={[0, 2, 2]} color="#ffffff" intensity={2} distance={8} decay={2} />

      {/* Floor glow from grid */}
      <pointLight position={[0, 0.3, 0]} color="#0044aa" intensity={1.5} distance={10} decay={2} />

      {/* Green side accents */}
      <pointLight position={[-halfW + 0.5, 1, 0]} color="#00ffaa" intensity={2} distance={6} decay={2} />
      <pointLight position={[halfW - 0.5, 1, 0]} color="#00ffaa" intensity={2} distance={6} decay={2} />
    </group>
  );
}
