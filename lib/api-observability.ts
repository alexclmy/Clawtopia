import { randomUUID } from "crypto";

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  route: string;
  requestId: string;
  [key: string]: unknown;
}

function toSafeString(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function log(level: LogLevel, fields: LogFields) {
  const payload = {
    level,
    at: new Date().toISOString(),
    ...fields
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export function newRequestId() {
  return randomUUID();
}

export function logInfo(fields: LogFields) {
  log("info", fields);
}

export function logWarn(fields: LogFields) {
  log("warn", fields);
}

export function logError(fields: LogFields & { error: unknown }) {
  log("error", {
    ...fields,
    error: toSafeString(fields.error)
  });
}
