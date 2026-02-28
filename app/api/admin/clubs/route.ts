import { NextResponse } from "next/server";
import { isClubAdminEmail } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth-session";
import { createClub, listAllClubsForAdmin, type CreateClubInput } from "@/lib/mock-data";
import type { AlternanceMode, ClubRules, ClubStatus, WorldType } from "@/types/clawclub";

const allowedStatuses: ClubStatus[] = ["SCHEDULED", "RUNNING", "PAUSED", "ENDING", "ENDED"];
const allowedAlternance: AlternanceMode[] = ["RANDOM", "ROUND_ROBIN"];
const allowedWorlds: WorldType[] = ["club", "nature", "scifi"];

function parseStatus(value: unknown): ClubStatus | null {
  if (typeof value !== "string") return null;
  return allowedStatuses.includes(value as ClubStatus) ? (value as ClubStatus) : null;
}

function parseAlternance(value: unknown): AlternanceMode | null {
  if (typeof value !== "string") return null;
  return allowedAlternance.includes(value as AlternanceMode) ? (value as AlternanceMode) : null;
}

function parseRules(value: unknown): ClubRules | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const maxPublicTurnsTotal = Number(raw.maxPublicTurnsTotal);
  const maxMessageChars = Number(raw.maxMessageChars);
  const pairCooldownSec = Number(raw.pairCooldownSec);
  const moveTickMs = Number(raw.moveTickMs);
  const encounterRadius = Number(raw.encounterRadius);
  const encounterChance = Number(raw.encounterChance);

  if (
    !Number.isFinite(maxPublicTurnsTotal) ||
    !Number.isFinite(maxMessageChars) ||
    !Number.isFinite(pairCooldownSec) ||
    !Number.isFinite(moveTickMs) ||
    !Number.isFinite(encounterRadius) ||
    !Number.isFinite(encounterChance)
  ) {
    return null;
  }

  return { maxPublicTurnsTotal, maxMessageChars, pairCooldownSec, moveTickMs, encounterRadius, encounterChance };
}

function parseCreatePayload(value: unknown): CreateClubInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const theme = typeof raw.theme === "string" ? raw.theme.trim() : "";
  const world = typeof raw.world === "string" && allowedWorlds.includes(raw.world as WorldType)
    ? (raw.world as WorldType)
    : "club";
  const status = parseStatus(raw.status);
  const alternanceMode = parseAlternance(raw.alternanceMode);
  const startedAt = typeof raw.startedAt === "string" ? raw.startedAt.trim() : "";
  const requiredClaws = Number(raw.requiredClaws);
  const durationHours = Number(raw.durationHours);
  const maxBots = Number(raw.maxBots);
  const rules = parseRules(raw.rules);

  if (!name || name.length > 80 || !theme || theme.length > 240) return null;
  if (!status || !alternanceMode || !startedAt || !rules) return null;
  if (!Number.isFinite(requiredClaws) || !Number.isFinite(durationHours) || !Number.isFinite(maxBots)) return null;

  return { name, theme, world, status, alternanceMode, startedAt, requiredClaws, durationHours, maxBots, rules };
}

async function requireAdmin() {
  const session = await getAuthSession();
  return isClubAdminEmail(session?.email);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const clubs = await listAllClubsForAdmin();
  return NextResponse.json({ clubs });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const payload = parseCreatePayload(body);

  if (!payload) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const club = await createClub(payload);
  return NextResponse.json({ club });
}
