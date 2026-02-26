"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { normalizeSkinId } from "@/lib/skins";
import type { BotStatus } from "@/types/clawclub";

/* ── Types ──────────────────────────────────────────────────── */

interface WorldBot {
  id: string;
  name: string;
  status: BotStatus;
  skin: string;
  x: number;
  y: number;
  locked?: boolean;
  lockedWith?: string | null;
}

interface ClubWorld3DProps {
  bots: WorldBot[];
  selectedBotId: string;
  onSelectBot: (botId: string) => void;
}

/* ── Constants ──────────────────────────────────────────────── */

const ROOM_W = 20;
const ROOM_D = 14;
const ROOM_H = 3.5;

const LERP_SPEED = 0.07;
const WALK_PHASE_MULT = 12;
const LEG_AMP = 0.5;
const KNEE_AMP = 0.55;
const ARM_AMP = 0.35;
const ELBOW_AMP = 0.3;
const BOB_AMP = 0.03;
const VELOCITY_MIN = 0.003;

const SKIN_COLORS: Record<string, string> = {
  default: "#ff7f63",
  mint: "#4ec7a6",
  solar: "#ffa03f",
  graphite: "#7a8399",
  sunset: "#ff7298",
  neon: "#4b6aff",
};

const SKIN_TONE = "#f0bb94";
const HAIR_CLR = "#3a2520";
const PANTS_CLR = "#2a3044";
const SHOE_CLR = "#1a1a1a";

/* ── Helpers ─────────────────────────────────────────────────── */

function mapToWorld(xPct: number, yPct: number): [number, number, number] {
  const mx = 1.5;
  const mz = 1.5;
  const x = mx + (xPct / 100) * (ROOM_W - mx * 2) - ROOM_W / 2;
  const z = mz + (yPct / 100) * (ROOM_D - mz * 2) - ROOM_D / 2;
  return [x, 0, z];
}

function bodyColor(skin: string, status: BotStatus): string {
  const base = new THREE.Color(SKIN_COLORS[normalizeSkinId(skin)] ?? SKIN_COLORS.default);
  if (status === "PAUSED") base.lerp(new THREE.Color(0x777788), 0.45);
  else if (status === "OFFLINE") base.lerp(new THREE.Color(0x444455), 0.7);
  return "#" + base.getHexString();
}

/* ── HumanoidBot ─────────────────────────────────────────────── */

function HumanoidBot({
  bot,
  allBots,
  isSelected,
  onClick,
}: {
  bot: WorldBot;
  allBots: WorldBot[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const rootRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const lArmRef = useRef<THREE.Group>(null!);
  const rArmRef = useRef<THREE.Group>(null!);
  const lForeRef = useRef<THREE.Group>(null!);
  const rForeRef = useRef<THREE.Group>(null!);
  const lLegRef = useRef<THREE.Group>(null!);
  const rLegRef = useRef<THREE.Group>(null!);
  const lShinRef = useRef<THREE.Group>(null!);
  const rShinRef = useRef<THREE.Group>(null!);

  const color = useMemo(() => bodyColor(bot.skin, bot.status), [bot.skin, bot.status]);

  const st = useRef({
    cx: 0, cz: 0, tx: 0, tz: 0,
    facing: 0, walkPhase: 0, walkAmp: 0,
    ready: false,
  });

  useEffect(() => {
    const [tx, , tz] = mapToWorld(bot.x, bot.y);
    const s = st.current;
    s.tx = tx;
    s.tz = tz;
    if (!s.ready) { s.cx = tx; s.cz = tz; s.ready = true; }
  }, [bot.x, bot.y]);

  useFrame((_, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 0.05);

    // lerp position
    const px = s.cx;
    const pz = s.cz;
    s.cx += (s.tx - s.cx) * LERP_SPEED;
    s.cz += (s.tz - s.cz) * LERP_SPEED;

    const dx = s.cx - px;
    const dz = s.cz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const vel = dist / Math.max(dt, 0.001);

    // facing
    if (bot.locked && bot.lockedWith) {
      const partner = allBots.find((b) => b.id === bot.lockedWith);
      if (partner) {
        const [px2, , pz2] = mapToWorld(partner.x, partner.y);
        const target = Math.atan2(px2 - s.cx, pz2 - s.cz);
        let diff = target - s.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.facing += diff * 0.06;
      }
    } else if (dist > VELOCITY_MIN * 0.3) {
      const target = Math.atan2(dx, dz);
      let diff = target - s.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.facing += diff * Math.min(1, 8 * dt);
    }

    // walk animation
    const walking = vel > 0.08 && !bot.locked;
    const tAmp = walking ? Math.min(1, vel * 1.8) : 0;
    s.walkAmp += (tAmp - s.walkAmp) * 0.1;
    if (dist > 0.0001) s.walkPhase += dist * WALK_PHASE_MULT;

    const p = s.walkPhase;
    const a = s.walkAmp;

    // apply root transform
    const bob = a > 0.01 ? Math.abs(Math.sin(p * 2)) * BOB_AMP * a : 0;
    rootRef.current.position.set(s.cx, 0, s.cz);
    rootRef.current.rotation.y = s.facing;
    bodyRef.current.position.y = bob;

    // legs
    const lHip = Math.sin(p) * LEG_AMP * a;
    const rHip = Math.sin(p + Math.PI) * LEG_AMP * a;
    lLegRef.current.rotation.x = lHip;
    rLegRef.current.rotation.x = rHip;
    const lKnee = Math.max(0, Math.sin(p - 0.7)) * KNEE_AMP * a;
    const rKnee = Math.max(0, Math.sin(p + Math.PI - 0.7)) * KNEE_AMP * a;
    lShinRef.current.rotation.x = lKnee;
    rShinRef.current.rotation.x = rKnee;

    // arms
    if (bot.locked && a < 0.15) {
      const t = Date.now() / 700;
      lArmRef.current.rotation.x = Math.sin(t) * 0.18 - 0.08;
      rArmRef.current.rotation.x = Math.sin(t + 1.3) * 0.22 - 0.08;
      lForeRef.current.rotation.x = -Math.abs(Math.sin(t * 0.8)) * 0.35 - 0.15;
      rForeRef.current.rotation.x = -Math.abs(Math.sin(t * 0.8 + 1)) * 0.4 - 0.15;
    } else {
      lArmRef.current.rotation.x = Math.sin(p + Math.PI) * ARM_AMP * a;
      rArmRef.current.rotation.x = Math.sin(p) * ARM_AMP * a;
      lForeRef.current.rotation.x = -Math.abs(Math.sin(p + Math.PI)) * ELBOW_AMP * a;
      rForeRef.current.rotation.x = -Math.abs(Math.sin(p)) * ELBOW_AMP * a;
    }

    // idle
    if (a < 0.05) {
      const breathe = Math.sin(Date.now() / 1100) * 0.008;
      bodyRef.current.scale.y = 1 + breathe;
      headRef.current.rotation.y = Math.sin(Date.now() / 2800) * 0.06;
      headRef.current.rotation.x = Math.sin(Date.now() / 2200) * 0.03;
    } else {
      bodyRef.current.scale.y = 1;
      headRef.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        {/* Head */}
        <group ref={headRef} position={[0, 1.55, 0]}>
          <mesh>
            <sphereGeometry args={[0.14, 16, 12]} />
            <meshStandardMaterial color={SKIN_TONE} />
          </mesh>
          <mesh position={[0, 0.06, -0.02]}>
            <sphereGeometry args={[0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={HAIR_CLR} />
          </mesh>
          <mesh position={[-0.045, 0.02, 0.12]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          <mesh position={[0.045, 0.02, 0.12]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
        </group>

        {/* Torso */}
        <mesh
          position={[0, 1.18, 0]}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <boxGeometry args={[0.34, 0.48, 0.18]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Left arm */}
        <group ref={lArmRef} position={[-0.22, 1.38, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.09, 0.26, 0.09]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <group ref={lForeRef} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <boxGeometry args={[0.08, 0.22, 0.08]} />
              <meshStandardMaterial color={SKIN_TONE} />
            </mesh>
          </group>
        </group>

        {/* Right arm */}
        <group ref={rArmRef} position={[0.22, 1.38, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.09, 0.26, 0.09]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <group ref={rForeRef} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <boxGeometry args={[0.08, 0.22, 0.08]} />
              <meshStandardMaterial color={SKIN_TONE} />
            </mesh>
          </group>
        </group>

        {/* Left leg */}
        <group ref={lLegRef} position={[-0.10, 0.92, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.12, 0.30, 0.12]} />
            <meshStandardMaterial color={PANTS_CLR} />
          </mesh>
          <group ref={lShinRef} position={[0, -0.30, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.11, 0.26, 0.11]} />
              <meshStandardMaterial color={PANTS_CLR} />
            </mesh>
            <mesh position={[0, -0.27, 0.025]}>
              <boxGeometry args={[0.12, 0.06, 0.16]} />
              <meshStandardMaterial color={SHOE_CLR} />
            </mesh>
          </group>
        </group>

        {/* Right leg */}
        <group ref={rLegRef} position={[0.10, 0.92, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.12, 0.30, 0.12]} />
            <meshStandardMaterial color={PANTS_CLR} />
          </mesh>
          <group ref={rShinRef} position={[0, -0.30, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.11, 0.26, 0.11]} />
              <meshStandardMaterial color={PANTS_CLR} />
            </mesh>
            <mesh position={[0, -0.27, 0.025]}>
              <boxGeometry args={[0.12, 0.06, 0.16]} />
              <meshStandardMaterial color={SHOE_CLR} />
            </mesh>
          </group>
        </group>

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[0.35, 0.48, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
          </mesh>
        )}

        {/* Locked indicator */}
        {bot.locked && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.28, 0.34, 32]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.45} />
          </mesh>
        )}
      </group>

      {/* Label */}
      <Html position={[0, 1.9, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div
          className="bot-3d-label"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <span className="bot-3d-name" style={isSelected ? { color: "#fff", textShadow: "0 0 6px rgba(255,255,255,.6)" } : undefined}>
            {bot.name}
          </span>
          <span
            className="bot-3d-status"
            style={{
              color: bot.locked ? "#ffd700" : bot.status === "ACTIVE" ? "#7cff7c" : bot.status === "PAUSED" ? "#ffcc44" : "#ff6666",
            }}
          >
            {bot.locked ? "TALKING" : bot.status}
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ── ClubEnvironment ─────────────────────────────────────────── */

function BarStool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 8]} />
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function RoundTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 24]} />
        <meshStandardMaterial color="#2a2020" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.72, 8]} />
        <meshStandardMaterial color="#555" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
        <meshStandardMaterial color="#555" metalness={0.6} />
      </mesh>
    </group>
  );
}

function Sofa({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.6, 0.22, 0.7]} />
        <meshStandardMaterial color="#2a1530" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.58, -0.3]}>
        <boxGeometry args={[1.6, 0.42, 0.12]} />
        <meshStandardMaterial color="#2a1530" roughness={0.85} />
      </mesh>
      <mesh position={[-0.75, 0.42, 0]}>
        <boxGeometry args={[0.12, 0.32, 0.7]} />
        <meshStandardMaterial color="#2a1530" roughness={0.85} />
      </mesh>
      <mesh position={[0.75, 0.42, 0]}>
        <boxGeometry args={[0.12, 0.32, 0.7]} />
        <meshStandardMaterial color="#2a1530" roughness={0.85} />
      </mesh>
    </group>
  );
}

function MovingSpotlight() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.25;
    ref.current.position.x = Math.sin(t) * 5;
    ref.current.position.z = Math.cos(t * 0.7) * 4;
  });
  return <pointLight ref={ref} position={[0, 3.1, 0]} color="#ff44aa" intensity={2.5} distance={10} decay={2} />;
}

function ClubEnvironment() {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#1a1520" roughness={0.25} metalness={0.15} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, ROOM_H / 2, -halfD]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#151228" />
      </mesh>
      <mesh position={[0, ROOM_H / 2, halfD]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#151228" />
      </mesh>
      <mesh position={[-halfW, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#171330" />
      </mesh>
      <mesh position={[halfW, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#171330" />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#0a0815" />
      </mesh>

      {/* Bar counter (back wall) */}
      <group position={[0, 0, -halfD + 1]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[8, 0.08, 0.8]} />
          <meshStandardMaterial color="#3a2818" roughness={0.35} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.53, 0.15]}>
          <boxGeometry args={[8, 1.04, 0.5]} />
          <meshStandardMaterial color="#2a1a10" />
        </mesh>
        <mesh position={[0, 1.8, -0.15]}>
          <boxGeometry args={[8, 0.06, 0.5]} />
          <meshStandardMaterial color="#3a2818" />
        </mesh>
        <BarStool position={[-2.5, 0, 0.8]} />
        <BarStool position={[-1, 0, 0.8]} />
        <BarStool position={[0.5, 0, 0.8]} />
        <BarStool position={[2, 0, 0.8]} />
      </group>

      {/* Tables */}
      <RoundTable position={[-5.5, 0, -2.5]} />
      <RoundTable position={[5.5, 0, -2.5]} />
      <RoundTable position={[-5.5, 0, 3.5]} />
      <RoundTable position={[5.5, 0, 3.5]} />

      {/* Sofas */}
      <Sofa position={[-8.2, 0, -4.5]} rotY={Math.PI * 0.15} />
      <Sofa position={[8.2, 0, -4.5]} rotY={-Math.PI * 0.15} />
      <Sofa position={[-8.2, 0, 4.5]} rotY={Math.PI * 0.85} />
      <Sofa position={[8.2, 0, 4.5]} rotY={-Math.PI * 0.85} />

      {/* Disco ball */}
      <group position={[0, ROOM_H - 0.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#cccccc" metalness={0.95} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 4]} />
          <meshStandardMaterial color="#888888" metalness={0.8} />
        </mesh>
      </group>

      {/* Neon strips */}
      <mesh position={[0, 2.5, -halfD + 0.06]}>
        <boxGeometry args={[12, 0.06, 0.04]} />
        <meshStandardMaterial color="#9b59b6" emissive="#9b59b6" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-halfW + 0.06, 2.2, 0]}>
        <boxGeometry args={[0.04, 0.06, 10]} />
        <meshStandardMaterial color="#1abc9c" emissive="#1abc9c" emissiveIntensity={3} />
      </mesh>
      <mesh position={[halfW - 0.06, 2.2, 0]}>
        <boxGeometry args={[0.04, 0.06, 10]} />
        <meshStandardMaterial color="#1abc9c" emissive="#1abc9c" emissiveIntensity={3} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.12} color="#8888cc" />
      <pointLight position={[0, 2.5, -halfD + 0.6]} color="#9b59b6" intensity={2} distance={8} decay={2} />
      <pointLight position={[-4, 3.1, -3]} color="#ff8844" intensity={3} distance={8} decay={2} />
      <pointLight position={[4, 3.1, -3]} color="#ff8844" intensity={3} distance={8} decay={2} />
      <pointLight position={[-4, 3.1, 3]} color="#aa66ff" intensity={3} distance={8} decay={2} />
      <pointLight position={[4, 3.1, 3]} color="#aa66ff" intensity={3} distance={8} decay={2} />
      <pointLight position={[0, 3.1, 0]} color="#ffffff" intensity={2} distance={10} decay={2} />
      <pointLight position={[0, 2.5, -halfD + 1.5]} color="#ffaa55" intensity={4} distance={5} decay={2} />
      <pointLight position={[-halfW + 0.5, 0.15, 0]} color="#1abc9c" intensity={1.2} distance={4} decay={2} />
      <pointLight position={[halfW - 0.5, 0.15, 0]} color="#1abc9c" intensity={1.2} distance={4} decay={2} />

      <MovingSpotlight />
    </group>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export default function ClubWorld3D({ bots, selectedBotId, onSelectBot }: ClubWorld3DProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const normalizedBots = useMemo(
    () => bots.map((b) => ({ ...b, skin: normalizeSkinId(b.skin) })),
    [bots],
  );

  const handleSelect = useCallback(
    (id: string) => onSelectBot(id),
    [onSelectBot],
  );

  if (!mounted) {
    return (
      <div
        className="club-world-3d-shell"
        style={{ width: "100%", height: "100%", minHeight: 420, background: "#0a0815", borderRadius: 12 }}
      />
    );
  }

  return (
    <div className="club-world-3d-shell">
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 100 }}
        style={{ background: "#0a0815" }}
        onPointerMissed={() => {}}
      >
        <fog attach="fog" args={["#0a0815", 10, 28]} />

        <ClubEnvironment />

        {normalizedBots.map((bot) => (
          <HumanoidBot
            key={bot.id}
            bot={bot}
            allBots={normalizedBots}
            isSelected={selectedBotId === bot.id}
            onClick={() => handleSelect(bot.id)}
          />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={3}
          maxDistance={25}
          target={[0, 0.5, 0] as unknown as THREE.Vector3}
        />
      </Canvas>
    </div>
  );
}
