import crypto from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 120;

interface BotTokenClaims {
  sub: string;
  botId: string;
  email: string;
  iat: number;
  exp: number;
}

function getSecret() {
  const secret = process.env.BOT_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BOT_TOKEN_SECRET (or NEXTAUTH_SECRET) is required in production.");
    }

    return "dev-insecure-bot-secret";
  }

  return secret;
}

function encodeBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function signHmac(payload: string) {
  return encodeBase64Url(crypto.createHmac("sha256", getSecret()).update(payload).digest());
}

export function issueBotToken(botId: string, email: string) {
  const now = Math.floor(Date.now() / 1000);
  const claims: BotTokenClaims = {
    sub: botId,
    botId,
    email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify(claims));
  const signature = signHmac(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
}

export function verifyBotToken(token: string): BotTokenClaims | null {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    return null;
  }

  const expected = signHmac(`${header}.${payload}`);

  if (expected !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as BotTokenClaims;

    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
