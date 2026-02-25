import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { submitClubVote } from "@/lib/club-results";
import { getClubById } from "@/lib/mock-data";

interface RouteContext {
  params: {
    clubId: string;
  };
}

interface VotePayload {
  targetBotId: string;
  rationaleShort: string;
}

function parsePayload(value: unknown): VotePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const targetBotId = typeof input.targetBotId === "string" ? input.targetBotId.trim() : "";
  const rationaleShort = typeof input.rationaleShort === "string" ? input.rationaleShort.trim() : "";

  if (!targetBotId || targetBotId.length > 80 || rationaleShort.length > 220) {
    return null;
  }

  return { targetBotId, rationaleShort };
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const email = session?.email;

  if (!email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);
  if (!bot) {
    return NextResponse.json({ error: "BOT_NOT_FOUND" }, { status: 404 });
  }

  const club = await getClubById(context.params.clubId);
  if (!club) {
    return NextResponse.json({ error: "CLUB_NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const result = await submitClubVote({
    club,
    voterBotId: bot.botId,
    targetBotId: payload.targetBotId,
    rationaleShort: payload.rationaleShort
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, alreadyVoted: result.alreadyVoted });
}
