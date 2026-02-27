"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
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
const ROOM_H = 4;

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
  const skinColor = useMemo(() => SKIN_COLORS[normalizeSkinId(bot.skin)] ?? SKIN_COLORS.default, [bot.skin]);

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

    const px = s.cx;
    const pz = s.cz;
    s.cx += (s.tx - s.cx) * LERP_SPEED;
    s.cz += (s.tz - s.cz) * LERP_SPEED;

    const dx = s.cx - px;
    const dz = s.cz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const vel = dist / Math.max(dt, 0.001);

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

    const walking = vel > 0.08 && !bot.locked;
    const tAmp = walking ? Math.min(1, vel * 1.8) : 0;
    s.walkAmp += (tAmp - s.walkAmp) * 0.1;
    if (dist > 0.0001) s.walkPhase += dist * WALK_PHASE_MULT;

    const p = s.walkPhase;
    const a = s.walkAmp;

    const bob = a > 0.01 ? Math.abs(Math.sin(p * 2)) * BOB_AMP * a : 0;
    rootRef.current.position.set(s.cx, 0, s.cz);
    rootRef.current.rotation.y = s.facing;
    bodyRef.current.position.y = bob;

    const lHip = Math.sin(p) * LEG_AMP * a;
    const rHip = Math.sin(p + Math.PI) * LEG_AMP * a;
    lLegRef.current.rotation.x = lHip;
    rLegRef.current.rotation.x = rHip;
    const lKnee = Math.max(0, Math.sin(p - 0.7)) * KNEE_AMP * a;
    const rKnee = Math.max(0, Math.sin(p + Math.PI - 0.7)) * KNEE_AMP * a;
    lShinRef.current.rotation.x = lKnee;
    rShinRef.current.rotation.x = rKnee;

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
    <group ref={rootRef} scale={[1.25, 1.25, 1.25]}>
      <group ref={bodyRef}>
        {/* Head */}
        <group ref={headRef} position={[0, 1.55, 0]}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 12]} />
            <meshStandardMaterial color={SKIN_TONE} roughness={0.6} />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.06, -0.02]}>
            <sphereGeometry args={[0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={HAIR_CLR} roughness={0.9} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.048, 0.02, 0.13]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.3} />
          </mesh>
          <mesh position={[0.048, 0.02, 0.13]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.2} metalness={0.3} />
          </mesh>
          {/* Eye whites */}
          <mesh position={[-0.048, 0.02, 0.122]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color="#e8e8f0" />
          </mesh>
          <mesh position={[0.048, 0.02, 0.122]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color="#e8e8f0" />
          </mesh>
        </group>

        {/* Torso */}
        <mesh
          position={[0, 1.18, 0]}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <boxGeometry args={[0.36, 0.50, 0.20]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        {/* Collar / skin detail */}
        <mesh position={[0, 1.44, 0.06]}>
          <boxGeometry args={[0.18, 0.04, 0.08]} />
          <meshStandardMaterial color={SKIN_TONE} roughness={0.6} />
        </mesh>

        {/* Left arm */}
        <group ref={lArmRef} position={[-0.24, 1.38, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.10, 0.26, 0.10]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <group ref={lForeRef} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <boxGeometry args={[0.09, 0.22, 0.09]} />
              <meshStandardMaterial color={SKIN_TONE} roughness={0.6} />
            </mesh>
          </group>
        </group>

        {/* Right arm */}
        <group ref={rArmRef} position={[0.24, 1.38, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.10, 0.26, 0.10]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
          <group ref={rForeRef} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <boxGeometry args={[0.09, 0.22, 0.09]} />
              <meshStandardMaterial color={SKIN_TONE} roughness={0.6} />
            </mesh>
          </group>
        </group>

        {/* Left leg */}
        <group ref={lLegRef} position={[-0.10, 0.92, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.13, 0.30, 0.13]} />
            <meshStandardMaterial color={PANTS_CLR} roughness={0.7} />
          </mesh>
          <group ref={lShinRef} position={[0, -0.30, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.12]} />
              <meshStandardMaterial color={PANTS_CLR} roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.27, 0.025]}>
              <boxGeometry args={[0.13, 0.06, 0.17]} />
              <meshStandardMaterial color={SHOE_CLR} roughness={0.4} metalness={0.2} />
            </mesh>
          </group>
        </group>

        {/* Right leg */}
        <group ref={rLegRef} position={[0.10, 0.92, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <boxGeometry args={[0.13, 0.30, 0.13]} />
            <meshStandardMaterial color={PANTS_CLR} roughness={0.7} />
          </mesh>
          <group ref={rShinRef} position={[0, -0.30, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.12]} />
              <meshStandardMaterial color={PANTS_CLR} roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.27, 0.025]}>
              <boxGeometry args={[0.13, 0.06, 0.17]} />
              <meshStandardMaterial color={SHOE_CLR} roughness={0.4} metalness={0.2} />
            </mesh>
          </group>
        </group>

        {/* Bot skin glow ring on floor — always visible */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.22, 0.36, 32]} />
          <meshBasicMaterial color={skinColor} transparent opacity={0.25} />
        </mesh>

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.38, 0.52, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        )}

        {/* Locked indicator */}
        {bot.locked && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
            <ringGeometry args={[0.30, 0.37, 32]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.55} />
          </mesh>
        )}

        {/* Head point-light for rim visibility */}
        <pointLight position={[0, 1.8, 0.3]} color={skinColor} intensity={0.6} distance={2.5} decay={2} />
      </group>

      {/* Label */}
      <Html position={[0, 2.05, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div
          className="bot-3d-label"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <span className="bot-3d-name" style={isSelected ? { color: "#fff", textShadow: "0 0 8px rgba(255,255,255,.8)" } : undefined}>
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

/* ── Furniture ───────────────────────────────────────────────── */

function BarStool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 16]} />
        <meshStandardMaterial color="#222" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.7, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function RoundTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 24]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.72, 8]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Candle / table lamp */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
        <meshStandardMaterial color="#ddccaa" />
      </mesh>
      <pointLight position={[0, 0.95, 0]} color="#ffcc66" intensity={0.8} distance={3} decay={2} />
    </group>
  );
}

function Sofa({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[1.6, 0.22, 0.7]} />
        <meshStandardMaterial color="#3a1a40" roughness={0.8} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.58, -0.3]}>
        <boxGeometry args={[1.6, 0.42, 0.12]} />
        <meshStandardMaterial color="#3a1a40" roughness={0.8} />
      </mesh>
      {/* Armrest left */}
      <mesh position={[-0.75, 0.42, 0]}>
        <boxGeometry args={[0.12, 0.32, 0.7]} />
        <meshStandardMaterial color="#3a1a40" roughness={0.8} />
      </mesh>
      {/* Armrest right */}
      <mesh position={[0.75, 0.42, 0]}>
        <boxGeometry args={[0.12, 0.32, 0.7]} />
        <meshStandardMaterial color="#3a1a40" roughness={0.8} />
      </mesh>
      {/* Cushion accent */}
      <mesh position={[-0.35, 0.44, -0.18]}>
        <boxGeometry args={[0.28, 0.22, 0.08]} />
        <meshStandardMaterial color="#7b3fa0" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 0.44, -0.18]}>
        <boxGeometry args={[0.28, 0.22, 0.08]} />
        <meshStandardMaterial color="#5544aa" roughness={0.9} />
      </mesh>
    </group>
  );
}

function DJBooth({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Desk */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.4, 0.08, 0.9]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, 0.45, 0.38]}>
        <boxGeometry args={[2.4, 0.88, 0.06]} />
        <meshStandardMaterial color="#12102a" roughness={0.5} />
      </mesh>
      {/* LED strip on front */}
      <mesh position={[0, 0.78, 0.42]}>
        <boxGeometry args={[2.2, 0.06, 0.02]} />
        <meshStandardMaterial color="#ff44aa" emissive="#ff44aa" emissiveIntensity={4} />
      </mesh>
      <mesh position={[0, 0.45, 0.42]}>
        <boxGeometry args={[2.2, 0.04, 0.02]} />
        <meshStandardMaterial color="#44aaff" emissive="#44aaff" emissiveIntensity={3} />
      </mesh>
      {/* Turntables */}
      <mesh position={[-0.55, 0.96, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 24]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0.55, 0.96, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 24]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Mixer center */}
      <mesh position={[0, 0.96, -0.1]}>
        <boxGeometry args={[0.4, 0.04, 0.3]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Laptop screen */}
      <mesh position={[0, 1.18, -0.3]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#1144aa" emissive="#1144aa" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function Speaker({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Cabinet */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.7, 1.2, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      {/* Woofer */}
      <mesh position={[0, 0.45, 0.26]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Tweeter */}
      <mesh position={[0, 0.82, 0.26]}>
        <cylinderGeometry args={[0.1, 0.1, 0.04, 12]} />
        <meshStandardMaterial color="#222" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Glow */}
      <mesh position={[0, 0.45, 0.30]}>
        <ringGeometry args={[0.18, 0.24, 16]} />
        <meshBasicMaterial color="#9b59b6" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function DrinkGlass({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.10, 8]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.5} roughness={0.1} metalness={0.1} />
      </mesh>
      {/* Liquid */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.025, 0.022, 0.06, 8]} />
        <meshStandardMaterial color="#ff6644" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function BottleRow({ position }: { position: [number, number, number] }) {
  const colors = ["#44aa55", "#aa3333", "#ddaa22", "#3355aa", "#cc55aa"];
  return (
    <group position={position}>
      {colors.map((c, i) => (
        <group key={i} position={[(i - 2) * 0.18, 0, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.28, 8]} />
            <meshStandardMaterial color={c} transparent opacity={0.7} roughness={0.15} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.31, 0]}>
            <cylinderGeometry args={[0.015, 0.025, 0.06, 6]} />
            <meshStandardMaterial color={c} transparent opacity={0.5} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PlantPot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.35, 8]} />
        <meshStandardMaterial color="#5a3a28" roughness={0.8} />
      </mesh>
      {/* Plant leaves - spheres */}
      <mesh position={[0, 0.50, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#2a6e2a" roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.62, 0.05]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#3a8a3a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.08, 0.60, -0.05]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#358a35" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* ── Animated effects ────────────────────────────────────────── */

function MovingSpotlight() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.3;
    ref.current.position.x = Math.sin(t) * 5;
    ref.current.position.z = Math.cos(t * 0.7) * 4;
  });
  return <pointLight ref={ref} position={[0, 3.4, 0]} color="#ff44aa" intensity={4} distance={12} decay={2} />;
}

function MovingSpotlight2() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.22 + 2;
    ref.current.position.x = Math.cos(t) * 6;
    ref.current.position.z = Math.sin(t * 0.6) * 3;
  });
  return <pointLight ref={ref} position={[0, 3.4, 0]} color="#44bbff" intensity={3} distance={12} decay={2} />;
}

function DiscoBall() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.4;
  });
  return (
    <group position={[0, ROOM_H - 0.3, 0]}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#ddd" metalness={0.98} roughness={0.02} envMapIntensity={2} />
        </mesh>
      </group>
      {/* String */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.35, 4]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      {/* Disco ball light projections */}
      <pointLight position={[0, -0.2, 0]} color="#ffffff" intensity={3} distance={14} decay={2} />
    </group>
  );
}

function FloatingParticles() {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * ROOM_W * 0.8,
        y: Math.random() * ROOM_H * 0.85 + 0.2,
        z: (Math.random() - 0.5) * ROOM_D * 0.8,
        speed: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        scale: 0.015 + Math.random() * 0.025,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.4,
        p.y + Math.sin(t * p.speed * 0.5 + p.phase) * 0.3,
        p.z + Math.cos(t * p.speed * 0.7 + p.phase) * 0.3,
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#bb88ff" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* ── Dance floor tiles ───────────────────────────────────────── */

function DanceFloorTiles() {
  const tilesRef = useRef<THREE.Group>(null!);
  const cols = 6;
  const rows = 4;
  const size = 1.2;
  const gap = 0.06;
  const palette = ["#9b59b6", "#1abc9c", "#ff44aa", "#4488ff", "#ff8844", "#44ddaa"];

  // We use a ref to track color cycling
  const matRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    matRefs.current.forEach((mat, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const phase = (row + col) * 0.8 + t * 1.2;
      const brightness = 0.3 + Math.sin(phase) * 0.3;
      const colorIdx = (row + col) % palette.length;
      const c = new THREE.Color(palette[colorIdx]);
      mat.emissive.copy(c);
      mat.emissiveIntensity = brightness;
    });
  });

  return (
    <group ref={tilesRef} position={[0, 0.005, 1]}>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = (col - (cols - 1) / 2) * (size + gap);
        const z = (row - (rows - 1) / 2) * (size + gap);
        const colorIdx = (row + col) % palette.length;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial
              ref={(ref) => { if (ref) matRefs.current[i] = ref; }}
              color="#0e0a1a"
              emissive={palette[colorIdx]}
              emissiveIntensity={0.3}
              roughness={0.15}
              metalness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Neon sign text (simple box-based) ───────────────────────── */

function NeonSign({ position, color, text }: { position: [number, number, number]; color: string; text: string }) {
  return (
    <group position={position}>
      {/* Background plate */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[text.length * 0.28 + 0.3, 0.5, 0.02]} />
        <meshStandardMaterial color="#0a0a15" roughness={0.9} />
      </mesh>
      <Html center>
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
          fontWeight: 900,
          color: color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
        }}>
          {text}
        </div>
      </Html>
    </group>
  );
}

/* ── ClubEnvironment ─────────────────────────────────────────── */

function ClubEnvironment() {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;

  return (
    <group>
      {/* Floor — dark reflective */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#1a1525" roughness={0.18} metalness={0.25} />
      </mesh>

      {/* Dance floor tiles */}
      <DanceFloorTiles />

      {/* Walls — lighter to catch light better */}
      <mesh position={[0, ROOM_H / 2, -halfD]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#1a1535" roughness={0.7} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, halfD]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial color="#1a1535" roughness={0.7} />
      </mesh>
      <mesh position={[-halfW, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#1c1738" roughness={0.7} />
      </mesh>
      <mesh position={[halfW, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial color="#1c1738" roughness={0.7} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#0d0a18" />
      </mesh>

      {/* ── Bar counter (back wall) ────── */}
      <group position={[0, 0, -halfD + 1]}>
        {/* Counter top */}
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[8, 0.08, 0.8]} />
          <meshStandardMaterial color="#4a3020" roughness={0.3} metalness={0.15} />
        </mesh>
        {/* Counter body */}
        <mesh position={[0, 0.53, 0.15]}>
          <boxGeometry args={[8, 1.04, 0.5]} />
          <meshStandardMaterial color="#2e1e14" roughness={0.6} />
        </mesh>
        {/* LED strip under counter */}
        <mesh position={[0, 0.02, 0.42]}>
          <boxGeometry args={[7.8, 0.03, 0.02]} />
          <meshStandardMaterial color="#9b59b6" emissive="#9b59b6" emissiveIntensity={5} />
        </mesh>
        {/* Back shelf */}
        <mesh position={[0, 1.8, -0.15]}>
          <boxGeometry args={[8, 0.06, 0.5]} />
          <meshStandardMaterial color="#4a3020" roughness={0.35} />
        </mesh>
        {/* Bottles on shelf */}
        <BottleRow position={[-2.5, 1.84, -0.15]} />
        <BottleRow position={[0, 1.84, -0.15]} />
        <BottleRow position={[2.5, 1.84, -0.15]} />
        {/* Drinks on counter */}
        <DrinkGlass position={[-2, 1.15, 0.1]} />
        <DrinkGlass position={[-0.5, 1.15, 0.15]} />
        <DrinkGlass position={[1.5, 1.15, 0.05]} />
        {/* Stools */}
        <BarStool position={[-2.5, 0, 0.8]} />
        <BarStool position={[-1, 0, 0.8]} />
        <BarStool position={[0.5, 0, 0.8]} />
        <BarStool position={[2, 0, 0.8]} />
      </group>

      {/* ── DJ Booth (front-right) ─────── */}
      <DJBooth position={[6, 0, -halfD + 1.2]} />

      {/* ── Speakers ───────────────────── */}
      <Speaker position={[-halfW + 0.6, 0, -halfD + 0.5]} scale={1.1} />
      <Speaker position={[halfW - 0.6, 0, -halfD + 0.5]} scale={1.1} />
      <Speaker position={[-halfW + 0.6, 0, halfD - 0.5]} scale={0.8} />
      <Speaker position={[halfW - 0.6, 0, halfD - 0.5]} scale={0.8} />

      {/* ── Tables ─────────────────────── */}
      <RoundTable position={[-5.5, 0, -2.5]} />
      <RoundTable position={[5.5, 0, -2.5]} />
      <RoundTable position={[-5.5, 0, 3.5]} />
      <RoundTable position={[5.5, 0, 3.5]} />

      {/* ── Sofas ──────────────────────── */}
      <Sofa position={[-8.2, 0, -4.5]} rotY={Math.PI * 0.15} />
      <Sofa position={[8.2, 0, -4.5]} rotY={-Math.PI * 0.15} />
      <Sofa position={[-8.2, 0, 4.5]} rotY={Math.PI * 0.85} />
      <Sofa position={[8.2, 0, 4.5]} rotY={-Math.PI * 0.85} />

      {/* ── Plants ─────────────────────── */}
      <PlantPot position={[-halfW + 0.7, 0, 0]} />
      <PlantPot position={[halfW - 0.7, 0, 0]} />
      <PlantPot position={[-halfW + 0.7, 0, halfD - 1]} />
      <PlantPot position={[halfW - 0.7, 0, halfD - 1]} />

      {/* ── Disco ball ─────────────────── */}
      <DiscoBall />

      {/* ── Neon decorations ───────────── */}
      {/* Back wall main strip */}
      <mesh position={[0, 2.8, -halfD + 0.06]}>
        <boxGeometry args={[14, 0.08, 0.04]} />
        <meshStandardMaterial color="#9b59b6" emissive="#9b59b6" emissiveIntensity={5} />
      </mesh>
      {/* Second back wall strip */}
      <mesh position={[0, 1.5, -halfD + 0.06]}>
        <boxGeometry args={[14, 0.05, 0.04]} />
        <meshStandardMaterial color="#ff44aa" emissive="#ff44aa" emissiveIntensity={3} />
      </mesh>
      {/* Side wall neons */}
      <mesh position={[-halfW + 0.06, 2.5, 0]}>
        <boxGeometry args={[0.04, 0.08, 12]} />
        <meshStandardMaterial color="#1abc9c" emissive="#1abc9c" emissiveIntensity={4} />
      </mesh>
      <mesh position={[halfW - 0.06, 2.5, 0]}>
        <boxGeometry args={[0.04, 0.08, 12]} />
        <meshStandardMaterial color="#1abc9c" emissive="#1abc9c" emissiveIntensity={4} />
      </mesh>
      {/* Vertical corner accents */}
      <mesh position={[-halfW + 0.06, ROOM_H / 2, -halfD + 0.06]}>
        <boxGeometry args={[0.04, ROOM_H, 0.04]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={3} />
      </mesh>
      <mesh position={[halfW - 0.06, ROOM_H / 2, -halfD + 0.06]}>
        <boxGeometry args={[0.04, ROOM_H, 0.04]} />
        <meshStandardMaterial color="#ff8844" emissive="#ff8844" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-halfW + 0.06, ROOM_H / 2, halfD - 0.06]}>
        <boxGeometry args={[0.04, ROOM_H, 0.04]} />
        <meshStandardMaterial color="#4488ff" emissive="#4488ff" emissiveIntensity={3} />
      </mesh>
      <mesh position={[halfW - 0.06, ROOM_H / 2, halfD - 0.06]}>
        <boxGeometry args={[0.04, ROOM_H, 0.04]} />
        <meshStandardMaterial color="#4488ff" emissive="#4488ff" emissiveIntensity={3} />
      </mesh>

      {/* ── Neon signs ─────────────────── */}
      <NeonSign position={[-3.5, 3.0, -halfD + 0.12]} color="#ff44aa" text="CLAW CLUB" />
      <NeonSign position={[4, 3.0, -halfD + 0.12]} color="#44ddff" text="LIVE" />

      {/* ── Floating particles ─────────── */}
      <FloatingParticles />

      {/* ── LIGHTING ═══════════════════════════════════════════════ */}

      {/* Bright ambient — key change for visibility */}
      <ambientLight intensity={0.45} color="#b8b0dd" />

      {/* Hemisphere light for natural fill */}
      <hemisphereLight color="#c8c0ff" groundColor="#2a1530" intensity={0.35} />

      {/* Main overhead */}
      <pointLight position={[0, 3.5, 0]} color="#ffffff" intensity={4} distance={16} decay={2} />

      {/* Bar area — warm and bright */}
      <pointLight position={[0, 2.5, -halfD + 1.5]} color="#ffaa55" intensity={6} distance={7} decay={2} />
      <pointLight position={[-3, 2.5, -halfD + 0.8]} color="#ff9944" intensity={3} distance={5} decay={2} />
      <pointLight position={[3, 2.5, -halfD + 0.8]} color="#ff9944" intensity={3} distance={5} decay={2} />

      {/* Purple back wall wash */}
      <pointLight position={[0, 3.0, -halfD + 0.6]} color="#bb66dd" intensity={4} distance={10} decay={2} />

      {/* Front corners — colored fill */}
      <pointLight position={[-6, 3.2, 4]} color="#ff8844" intensity={4} distance={10} decay={2} />
      <pointLight position={[6, 3.2, 4]} color="#aa66ff" intensity={4} distance={10} decay={2} />

      {/* Mid-room fill for bots */}
      <pointLight position={[-3, 2.5, 0]} color="#ddccff" intensity={2.5} distance={8} decay={2} />
      <pointLight position={[3, 2.5, 0]} color="#ddccff" intensity={2.5} distance={8} decay={2} />
      <pointLight position={[0, 2.0, 2]} color="#ffffff" intensity={2} distance={8} decay={2} />

      {/* Floor-level teal from side neons */}
      <pointLight position={[-halfW + 0.5, 0.4, 0]} color="#1abc9c" intensity={2} distance={6} decay={2} />
      <pointLight position={[halfW - 0.5, 0.4, 0]} color="#1abc9c" intensity={2} distance={6} decay={2} />

      {/* Colored back corners */}
      <pointLight position={[-6, 3.2, -4]} color="#ff6688" intensity={3} distance={8} decay={2} />
      <pointLight position={[6, 3.2, -4]} color="#6688ff" intensity={3} distance={8} decay={2} />

      {/* Moving spotlights */}
      <MovingSpotlight />
      <MovingSpotlight2 />
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
        style={{ width: "100%", height: "100%", minHeight: 420, background: "#0d0a18", borderRadius: 12 }}
      />
    );
  }

  return (
    <div className="club-world-3d-shell">
      <Canvas
        camera={{ position: [0, 7, 13], fov: 52, near: 0.1, far: 100 }}
        style={{ background: "#0d0a18" }}
        onPointerMissed={() => {}}
        shadows
      >
        <fog attach="fog" args={["#0d0a18", 16, 35]} />

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
