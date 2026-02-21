interface RateLimitWindow {
  count: number;
  resetAtMs: number;
}

const windows = new Map<string, RateLimitWindow>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInMs: number;
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const nowMs = Date.now();
  const current = windows.get(key);

  if (!current || nowMs >= current.resetAtMs) {
    windows.set(key, {
      count: 1,
      resetAtMs: nowMs + windowMs
    });

    return {
      ok: true,
      remaining: Math.max(0, max - 1),
      resetInMs: windowMs
    };
  }

  current.count += 1;
  const remaining = Math.max(0, max - current.count);

  return {
    ok: current.count <= max,
    remaining,
    resetInMs: Math.max(0, current.resetAtMs - nowMs)
  };
}
