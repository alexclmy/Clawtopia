import { NextResponse } from "next/server";
import { logError, logWarn, newRequestId } from "@/lib/api-observability";
import { getBotByBotId, updateBotConnection } from "@/lib/bot-registry";
import { verifyBotToken } from "@/lib/bot-token";
import { HUB_LIMITS } from "@/lib/hub-constants";
import { checkRateLimit } from "@/lib/rate-limit";
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

function jsonWithRequestId(requestId: string, payload: unknown, status = 200, headers?: HeadersInit) {
  const response = NextResponse.json(payload, {
    status,
    headers
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  const route = "/api/bots/heartbeat";

  try {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      logWarn({ route, requestId, code: "AUTH_FAILED", message: "Missing bearer token." });
      return jsonWithRequestId(requestId, { error: "AUTH_FAILED" }, 401);
    }

    const claims = verifyBotToken(token);
    if (!claims) {
      logWarn({ route, requestId, code: "AUTH_FAILED", message: "Token verification failed." });
      return jsonWithRequestId(requestId, { error: "AUTH_FAILED" }, 401);
    }

    const bot = await getBotByBotId(claims.botId);
    if (!bot || bot.botToken !== token) {
      logWarn({ route, requestId, code: "AUTH_FAILED", botId: claims.botId, message: "Bot token mismatch." });
      return jsonWithRequestId(requestId, { error: "AUTH_FAILED" }, 401);
    }

    const rate = checkRateLimit(`heartbeat:${claims.botId}`, HUB_LIMITS.heartbeatsPerMinute, 60_000);
    if (!rate.ok) {
      await updateBotConnection(claims.botId, "PAUSED");
      return jsonWithRequestId(
        requestId,
        {
          error: "RATE_LIMITED",
          message: "Heartbeat rate limit exceeded. Bot auto-paused temporarily."
        },
        429,
        {
          "retry-after": String(Math.max(1, Math.ceil(rate.resetInMs / 1000)))
        }
      );
    }

    const body = await request.json().catch(() => null);
    const status = getConnectionStatus(body);
    const updated = await updateBotConnection(claims.botId, status);

    return jsonWithRequestId(requestId, {
      ok: true,
      status: updated?.wsStatus ?? status,
      lastSeenAt: updated?.lastSeenAt ?? new Date().toISOString()
    });
  } catch (error) {
    logError({ route, requestId, error });
    return jsonWithRequestId(
      requestId,
      {
        error: "INTERNAL_ERROR"
      },
      500
    );
  }
}
