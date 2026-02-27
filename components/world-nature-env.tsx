"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ROOM_W = 22;
const ROOM_D = 16;

/* ── Trees ────────────────────────────────────────────────────── */

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leafColors = ["#2d8a4e", "#3a9d5e", "#4aad6e", "#228b3a"];
  const color = leafColors[Math.floor(position[0] * 7 + position[2] * 3) % leafColors.length];
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.14, 1.4, 8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      {/* Canopy layers */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.2, 2.2, 0.1]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[-0.15, 2.3, -0.1]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ── Rock ─────────────────────────────────────────────────────── */

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale * 0.6, scale]}>
      <mesh position={[0, 0.15, 0]}>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#7a7a72" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ── Flower patch ─────────────────────────────────────────────── */

function FlowerPatch({ position }: { position: [number, number, number] }) {
  const colors = ["#ff6b8a", "#ffaa44", "#cc66ff", "#ff5577", "#ffdd44"];
  return (
    <group position={position}>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const r = 0.15 + (i % 3) * 0.1;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            {/* Stem */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.2, 4]} />
              <meshStandardMaterial color="#4a8a3a" />
            </mesh>
            {/* Flower head */}
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.04, 6, 6]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── Log bench ────────────────────────────────────────────────── */

function LogBench({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.18, 1.6, 10]} />
        <meshStandardMaterial color="#5a3a1e" roughness={0.9} />
      </mesh>
      {/* Bark rings */}
      <mesh position={[0.7, 0.2, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 10]} />
        <meshStandardMaterial color="#4a2a12" roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 10]} />
        <meshStandardMaterial color="#4a2a12" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Pond ─────────────────────────────────────────────────────── */

function Pond({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const m = ref.current.material as THREE.MeshStandardMaterial;
    m.opacity = 0.55 + Math.sin(clock.getElapsedTime() * 0.8) * 0.08;
  });
  return (
    <group position={position}>
      {/* Water surface */}
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshStandardMaterial color="#3a8abf" transparent opacity={0.55} roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Shore ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.7, 2.1, 32]} />
        <meshStandardMaterial color="#9a8a6a" roughness={0.9} />
      </mesh>
      {/* Lily pads */}
      {[[-0.5, 0.4], [0.6, -0.3], [-0.2, -0.7]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 1.2]} position={[x, 0.03, z]}>
          <circleGeometry args={[0.18, 8]} />
          <meshStandardMaterial color="#3a8a3a" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Mushroom ─────────────────────────────────────────────────── */

function Mushroom({ position, color = "#cc4444" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.16, 6]} />
        <meshStandardMaterial color="#e8ddb5" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.07, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ── Fireflies ────────────────────────────────────────────────── */

function Fireflies() {
  const count = 50;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * ROOM_W * 0.8,
        y: 0.3 + Math.random() * 3,
        z: (Math.random() - 0.5) * ROOM_D * 0.8,
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        scale: 0.015 + Math.random() * 0.02,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const brightness = 0.5 + Math.sin(t * p.speed * 3 + p.phase) * 0.5;
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.6,
        p.y + Math.sin(t * p.speed * 0.4 + p.phase) * 0.4,
        p.z + Math.cos(t * p.speed * 0.6 + p.phase) * 0.5,
      );
      dummy.scale.setScalar(p.scale * (0.5 + brightness * 0.5));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#aaff44" transparent opacity={0.7} />
    </instancedMesh>
  );
}

/* ── Butterfly (animated) ─────────────────────────────────────── */

function Butterfly({ startPos, color }: { startPos: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null!);
  const lWingRef = useRef<THREE.Mesh>(null!);
  const rWingRef = useRef<THREE.Mesh>(null!);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phaseRef.current;
    ref.current.position.set(
      startPos[0] + Math.sin(t * 0.3) * 3,
      startPos[1] + Math.sin(t * 0.5) * 0.5 + 0.3,
      startPos[2] + Math.cos(t * 0.25) * 2,
    );
    ref.current.rotation.y = t * 0.3;
    const wing = Math.sin(t * 8) * 0.7;
    lWingRef.current.rotation.y = wing;
    rWingRef.current.rotation.y = -wing;
  });

  return (
    <group ref={ref}>
      {/* Left wing */}
      <mesh ref={lWingRef} position={[-0.02, 0, 0]}>
        <planeGeometry args={[0.08, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Right wing */}
      <mesh ref={rWingRef} position={[0.02, 0, 0]}>
        <planeGeometry args={[0.08, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Main environment export ──────────────────────────────────── */

export default function NatureEnvironment() {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group>
      {/* Ground — grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#3a7a3a" roughness={0.9} />
      </mesh>

      {/* Dirt path across middle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[2.5, ROOM_D * 0.9]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, Math.PI / 4, 0]} position={[2, 0.005, 1]}>
        <planeGeometry args={[1.8, 6]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.95} />
      </mesh>

      {/* Pond */}
      <Pond position={[-5, 0, 3]} />

      {/* Trees around perimeter */}
      <Tree position={[-halfW + 1.5, 0, -halfD + 1.5]} scale={1.1} />
      <Tree position={[halfW - 1.5, 0, -halfD + 1.5]} scale={0.9} />
      <Tree position={[-halfW + 1.5, 0, halfD - 1.5]} scale={1.0} />
      <Tree position={[halfW - 1.5, 0, halfD - 1.5]} scale={1.2} />
      <Tree position={[-halfW + 2, 0, 0]} scale={0.8} />
      <Tree position={[halfW - 2, 0, 0]} scale={1.0} />
      <Tree position={[-3, 0, -halfD + 1]} scale={0.7} />
      <Tree position={[4, 0, -halfD + 1.2]} scale={0.9} />
      <Tree position={[7, 0, 2]} scale={1.1} />
      <Tree position={[-8, 0, -2]} scale={0.85} />

      {/* Background tree ring (further away, larger) */}
      <Tree position={[-halfW + 0.3, 0, -3]} scale={1.4} />
      <Tree position={[halfW - 0.3, 0, 3]} scale={1.3} />

      {/* Rocks */}
      <Rock position={[-2, 0, -4]} scale={1.2} />
      <Rock position={[3, 0, 5]} scale={0.8} />
      <Rock position={[7, 0, -3]} scale={1.0} />
      <Rock position={[-6, 0, -5]} scale={0.7} />
      <Rock position={[-3.5, 0, 4.5]} scale={0.5} />
      <Rock position={[8, 0, -6]} scale={0.6} />

      {/* Log benches */}
      <LogBench position={[-7, 0, -3.5]} rotY={0.3} />
      <LogBench position={[7, 0, 4]} rotY={-0.4} />
      <LogBench position={[3, 0, -5]} rotY={1.2} />
      <LogBench position={[-4, 0, 5.5]} rotY={0.8} />

      {/* Flower patches */}
      <FlowerPatch position={[-3, 0, -2]} />
      <FlowerPatch position={[5, 0, 1]} />
      <FlowerPatch position={[-1, 0, 4]} />
      <FlowerPatch position={[2, 0, -3.5]} />
      <FlowerPatch position={[-6, 0, 1.5]} />
      <FlowerPatch position={[8, 0, -1]} />
      <FlowerPatch position={[0, 0, 6]} />

      {/* Mushrooms */}
      <Mushroom position={[-8, 0, 1]} color="#cc4444" />
      <Mushroom position={[-8.2, 0, 1.2]} color="#dd6644" />
      <Mushroom position={[6, 0, -5]} color="#aa3366" />
      <Mushroom position={[9, 0, 0.5]} color="#cc4444" />
      <Mushroom position={[-4, 0, -6]} color="#dd6644" />

      {/* Fireflies */}
      <Fireflies />

      {/* Butterflies */}
      <Butterfly startPos={[2, 1.5, 0]} color="#ff88cc" />
      <Butterfly startPos={[-3, 1.2, 2]} color="#88ccff" />
      <Butterfly startPos={[5, 1.8, -2]} color="#ffaa44" />

      {/* ── LIGHTING ═══════════════════════════════════════════ */}

      {/* Warm sunlight from above-right */}
      <directionalLight position={[8, 12, 4]} color="#fff5e0" intensity={1.8} castShadow />

      {/* Sky ambient — bright and warm */}
      <ambientLight intensity={0.55} color="#c8e0ff" />

      {/* Hemisphere: blue sky + green ground bounce */}
      <hemisphereLight color="#88bbff" groundColor="#446633" intensity={0.5} />

      {/* Warm fill from the left */}
      <pointLight position={[-6, 4, 0]} color="#ffcc88" intensity={3} distance={14} decay={2} />

      {/* Cool fill from the right */}
      <pointLight position={[6, 4, 0]} color="#aaccff" intensity={2.5} distance={14} decay={2} />

      {/* Pond reflection light */}
      <pointLight position={[-5, 0.5, 3]} color="#66aadd" intensity={1.5} distance={5} decay={2} />

      {/* Ground-level warm spots near benches */}
      <pointLight position={[-7, 0.5, -3.5]} color="#ffaa55" intensity={1} distance={4} decay={2} />
      <pointLight position={[7, 0.5, 4]} color="#ffaa55" intensity={1} distance={4} decay={2} />

      {/* Center overhead */}
      <pointLight position={[0, 5, 0]} color="#ffffff" intensity={2} distance={16} decay={2} />

      {/* Back fill */}
      <pointLight position={[0, 3, -halfD + 1]} color="#ddccaa" intensity={2} distance={10} decay={2} />
      <pointLight position={[0, 3, halfD - 1]} color="#aaddaa" intensity={1.5} distance={10} decay={2} />
    </group>
  );
}
