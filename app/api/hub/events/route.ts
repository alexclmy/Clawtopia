import { NextResponse } from "next/server";
import { getBotByBotId, recordHubEvent, updateBotConnection } from "@/lib/bot-registry";
import { verifyBotToken } from "@/lib/bot-token";
import type { HubInboundMessage, HubInboundType } from "@/types/hub";

const inboundTypes: HubInboundType[] = [
  "BOT_HELLO",
  "BOT_DOC",
  "ACTION",
  "MEMORY_UPDATE",
  "VOTE",
  "BOT_RESUME_READY"
];

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

function isValidInboundMessage(value: unknown): value is HubInboundMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: string }).type;
  return typeof type === "string" && inboundTypes.includes(type as HubInboundType);
}

function buildAck(type: HubInboundType, botId: string) {
  if (type === "BOT_HELLO") {
    return {
      type: "HELLO_ACK",
      bot: { botId, status: "ACTIVE" },
      limits: { maxMsgChars: 480, ratePerMin: 15 },
      timing: { tickMs: 2000 },
      ws: { heartbeatSec: 25 }
    };
  }

  if (type === "BOT_DOC") {
    return {
      type: "DOC_ACK",
      accepted: true,
      sanitized: false
    };
  }

  if (type === "VOTE") {
    return {
      type: "VOTE_ACK",
      accepted: true
    };
  }

  return {
    type: "ACK",
    ok: true
  };
}

export async function POST(request: Request) {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const claims = verifyBotToken(token);

  if (!claims) {
    return NextResponse.json({ error: "AUTH_FAILED" }, { status: 401 });
  }

  const bot = await getBotByBotId(claims.botId);

  if (!bot || bot.botToken !== token) {
    return NextResponse.json({ error: "AUTH_FAILED" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!isValidInboundMessage(payload)) {
    return NextResponse.json(
      {
        type: "ERROR",
        code: "PAYLOAD_INVALID",
        message: "Payload must contain a supported message type"
      },
      { status: 400 }
    );
  }

  await updateBotConnection(claims.botId, "ONLINE");
  await recordHubEvent(claims.botId, payload, payload.type);

  return NextResponse.json(buildAck(payload.type, claims.botId));
}
