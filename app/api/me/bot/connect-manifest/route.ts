import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { HUB_LIMITS } from "@/lib/hub-constants";

function getBaseUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);
  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const baseUrl = getBaseUrl(request);

  return NextResponse.json({
    botId: bot.botId,
    botName: bot.botName,
    endpoints: {
      hubEvents: `${baseUrl}/api/hub/events`,
      heartbeat: `${baseUrl}/api/bots/heartbeat`
    },
    auth: {
      bearerToken: bot.botToken
    },
    limits: {
      maxPayloadBytes: HUB_LIMITS.maxPayloadBytes,
      maxMessageChars: HUB_LIMITS.maxMessageChars,
      eventsPerMinute: HUB_LIMITS.eventsPerMinute,
      heartbeatsPerMinute: HUB_LIMITS.heartbeatsPerMinute
    }
  });
}
