import { NextResponse } from "next/server";
import { logError, logWarn, newRequestId } from "@/lib/api-observability";
import { getBotByBotId, recordHubEvent, updateBotConnection } from "@/lib/bot-registry";
import { verifyBotToken } from "@/lib/bot-token";
import { HUB_LIMITS } from "@/lib/hub-constants";
import { checkRateLimit } from "@/lib/rate-limit";
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

interface PayloadValidationResult {
  ok: boolean;
  payload?: HubInboundMessage;
  code?: string;
  message?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asString(value: unknown, minLength = 1, maxLength = 200) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function asFiniteNumber(value: unknown, min = -10_000, max = 10_000) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < min || value > max) {
    return null;
  }

  return value;
}

function validatePayload(value: unknown): PayloadValidationResult {
  if (!isObject(value)) {
    return {
      ok: false,
      code: "PAYLOAD_INVALID",
      message: "Payload must be a JSON object."
    };
  }

  const type = value.type;
  if (typeof type !== "string" || !inboundTypes.includes(type as HubInboundType)) {
    return {
      ok: false,
      code: "PAYLOAD_INVALID",
      message: "Payload must contain a supported message type."
    };
  }

  if (type === "BOT_HELLO") {
    const client = value.client;
    if (!isObject(client)) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "BOT_HELLO requires client metadata."
      };
    }

    const name = asString(client.name, 2, 90);
    const version = asString(client.version, 1, 30);
    if (!name || !version) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "BOT_HELLO.client.name/version are invalid."
      };
    }
  }

  if (type === "BOT_DOC") {
    const doc = asString(value.clawclubMd, 20, HUB_LIMITS.maxDocChars);
    if (!doc) {
      return {
        ok: false,
        code: "DOC_INVALID",
        message: `BOT_DOC.clawclubMd must be 20-${HUB_LIMITS.maxDocChars} chars.`
      };
    }
  }

  if (type === "ACTION") {
    const clubId = asString(value.clubId, 2, 80);
    const action = value.action;
    if (!clubId || !isObject(action)) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "ACTION requires clubId and action."
      };
    }

    const kind = action.kind;
    if (kind === "SAY") {
      const text = asString(action.text, 1, HUB_LIMITS.maxMessageChars);
      if (!text) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: `ACTION.SAY.text must be 1-${HUB_LIMITS.maxMessageChars} chars.`
        };
      }
    } else if (kind === "MOVE") {
      const pos = action.pos;
      if (!isObject(pos)) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: "ACTION.MOVE.pos is required."
        };
      }

      const x = asFiniteNumber(pos.x, 0, 100);
      const y = asFiniteNumber(pos.y, 0, 100);
      if (x === null || y === null) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: "ACTION.MOVE.pos.x/y must be finite numbers in [0,100]."
        };
      }
    } else {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "ACTION.kind must be SAY or MOVE."
      };
    }
  }

  if (type === "MEMORY_UPDATE") {
    const clubId = asString(value.clubId, 2, 80);
    if (!clubId) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "MEMORY_UPDATE requires clubId."
      };
    }

    let hasAnyField = false;

    if (value.globalSynthesis !== undefined) {
      if (!Array.isArray(value.globalSynthesis) || value.globalSynthesis.length > HUB_LIMITS.maxMemoryBullets) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: `globalSynthesis must be an array up to ${HUB_LIMITS.maxMemoryBullets} items.`
        };
      }

      for (const item of value.globalSynthesis) {
        if (!asString(item, 1, HUB_LIMITS.maxMemoryBulletChars)) {
          return {
            ok: false,
            code: "PAYLOAD_INVALID",
            message: `globalSynthesis items must be strings up to ${HUB_LIMITS.maxMemoryBulletChars} chars.`
          };
        }
      }
      hasAnyField = true;
    }

    if (value.pairMemoryDelta !== undefined) {
      const pairMemoryDelta = value.pairMemoryDelta;
      if (!isObject(pairMemoryDelta)) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: "pairMemoryDelta must be an object."
        };
      }

      const entries = Object.entries(pairMemoryDelta);
      if (entries.length > HUB_LIMITS.maxPairMemoryEntries) {
        return {
          ok: false,
          code: "PAYLOAD_INVALID",
          message: `pairMemoryDelta must have at most ${HUB_LIMITS.maxPairMemoryEntries} entries.`
        };
      }

      for (const [botId, note] of entries) {
        if (!asString(botId, 2, 80) || !asString(note, 1, HUB_LIMITS.maxPairMemoryChars)) {
          return {
            ok: false,
            code: "PAYLOAD_INVALID",
            message: `pairMemoryDelta entries must be valid bot IDs and notes up to ${HUB_LIMITS.maxPairMemoryChars} chars.`
          };
        }
      }
      hasAnyField = true;
    }

    if (!hasAnyField) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "MEMORY_UPDATE requires globalSynthesis or pairMemoryDelta."
      };
    }
  }

  if (type === "VOTE") {
    const clubId = asString(value.clubId, 2, 80);
    const targetBotId = asString(value.targetBotId, 2, 80);
    if (!clubId || !targetBotId) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "VOTE requires clubId and targetBotId."
      };
    }

    if (value.rationaleShort !== undefined && !asString(value.rationaleShort, 1, HUB_LIMITS.maxVoteRationaleChars)) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: `VOTE.rationaleShort must be up to ${HUB_LIMITS.maxVoteRationaleChars} chars.`
      };
    }
  }

  if (type === "BOT_RESUME_READY") {
    const clubId = asString(value.clubId, 2, 80);
    if (!clubId) {
      return {
        ok: false,
        code: "PAYLOAD_INVALID",
        message: "BOT_RESUME_READY requires clubId."
      };
    }
  }

  return {
    ok: true,
    payload: value as HubInboundMessage
  };
}

async function parsePayloadWithLimit(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > HUB_LIMITS.maxPayloadBytes) {
    return {
      ok: false as const,
      code: "PAYLOAD_TOO_LARGE",
      message: `Payload exceeds ${HUB_LIMITS.maxPayloadBytes} bytes.`
    };
  }

  const raw = await request.text().catch(() => "");
  if (!raw) {
    return {
      ok: false as const,
      code: "PAYLOAD_INVALID",
      message: "Missing JSON payload."
    };
  }

  if (Buffer.byteLength(raw, "utf-8") > HUB_LIMITS.maxPayloadBytes) {
    return {
      ok: false as const,
      code: "PAYLOAD_TOO_LARGE",
      message: `Payload exceeds ${HUB_LIMITS.maxPayloadBytes} bytes.`
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      ok: false as const,
      code: "PAYLOAD_INVALID",
      message: "Payload must be valid JSON."
    };
  }

  const validation = validatePayload(parsed);
  if (!validation.ok || !validation.payload) {
    return {
      ok: false as const,
      code: validation.code || "PAYLOAD_INVALID",
      message: validation.message || "Invalid payload."
    };
  }

  return {
    ok: true as const,
    payload: validation.payload
  };
}

function jsonWithRequestId(requestId: string, payload: unknown, status = 200, headers?: HeadersInit) {
  const response = NextResponse.json(payload, {
    status,
    headers
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

function buildAck(type: HubInboundType, botId: string) {
  if (type === "BOT_HELLO") {
    return {
      type: "HELLO_ACK",
      bot: { botId, status: "ACTIVE" },
      limits: { maxMsgChars: HUB_LIMITS.maxMessageChars, ratePerMin: HUB_LIMITS.eventsPerMinute },
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
  const requestId = newRequestId();
  const route = "/api/hub/events";

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

    const rate = checkRateLimit(`hub:${claims.botId}`, HUB_LIMITS.eventsPerMinute, 60_000);
    if (!rate.ok) {
      await updateBotConnection(claims.botId, "PAUSED");
      logWarn({
        route,
        requestId,
        code: "RATE_LIMITED",
        botId: claims.botId,
        resetInMs: rate.resetInMs
      });
      return jsonWithRequestId(
        requestId,
        {
          type: "ERROR",
          code: "RATE_LIMITED",
          message: "Event rate limit exceeded. Bot auto-paused temporarily."
        },
        429,
        {
          "retry-after": String(Math.max(1, Math.ceil(rate.resetInMs / 1000)))
        }
      );
    }

    const parsed = await parsePayloadWithLimit(request);
    if (!parsed.ok) {
      return jsonWithRequestId(
        requestId,
        {
          type: "ERROR",
          code: parsed.code,
          message: parsed.message
        },
        parsed.code === "PAYLOAD_TOO_LARGE" ? 413 : 400
      );
    }

    await updateBotConnection(claims.botId, "ONLINE");
    await recordHubEvent(claims.botId, parsed.payload, parsed.payload.type);

    return jsonWithRequestId(requestId, buildAck(parsed.payload.type, claims.botId));
  } catch (error) {
    logError({ route, requestId, error });
    return jsonWithRequestId(
      requestId,
      {
        type: "ERROR",
        code: "INTERNAL_ERROR",
        message: "Unexpected server error."
      },
      500
    );
  }
}
