import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail, upsertBotForUser } from "@/lib/bot-registry";
import { normalizeSkinId } from "@/lib/skins";

interface BotPayload {
  botName: string;
  skin: string;
  tagline: string;
}

function parsePayload(value: unknown): BotPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const obj = value as Record<string, unknown>;
  const botName = typeof obj.botName === "string" ? obj.botName.trim() : "";
  const skin = typeof obj.skin === "string" ? obj.skin.trim() : "";
  const tagline = typeof obj.tagline === "string" ? obj.tagline.trim() : "";

  if (!botName || botName.length > 40 || skin.length > 20 || tagline.length > 220) {
    return null;
  }

  return {
    botName,
    skin: normalizeSkinId(skin),
    tagline
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);

  return NextResponse.json({ bot: bot ?? null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = parsePayload(body);

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const bot = await upsertBotForUser({
    userEmail: email,
    userName: session.user?.name || email.split("@")[0],
    botName: payload.botName,
    skin: payload.skin,
    tagline: payload.tagline
  });

  return NextResponse.json({ bot });
}
