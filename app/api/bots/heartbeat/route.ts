import { NextResponse } from "next/server";
import { getBotByBotId, updateBotConnection } from "@/lib/bot-registry";
import { verifyBotToken } from "@/lib/bot-token";
import type { BotConnectionStatus } from "@/types/hub";

function extractBearerToken(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function getConnectionStatus(input: unknown): BotConnectionStatus {
  if (!input || typeof input !== "object") {
    return "ONLINE";
  }

  const status = (input as { status?: string }).status;

  if (status === "ONLINE" || status === "PAUSED" || status === "OFFLINE") {
    return status;
  }

  return "ONLINE";
}

export async function POST(request: Request) {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const claims = verifyBotToken(token);

  if (!claims) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const bot = await getBotByBotId(claims.botId);

  if (!bot || bot.botToken !== token) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = getConnectionStatus(body);
  const updated = await updateBotConnection(claims.botId, status);

  return NextResponse.json({
    ok: true,
    status: updated?.wsStatus ?? status,
    lastSeenAt: updated?.lastSeenAt ?? new Date().toISOString()
  });
}
