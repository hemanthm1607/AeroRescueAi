/**
 * Drone state backed by Upstash Redis REST API.
 *
 * Uses plain fetch — no SDK required, zero extra dependencies.
 * Works correctly on Vercel serverless because state lives in Redis,
 * not in the Node process memory.
 *
 * Required environment variables (server-side only):
 *   UPSTASH_REDIS_REST_URL   — e.g. https://us1-xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — your Upstash REST token
 *
 * Keys used in Redis:
 *   aerorescue:heartbeat   — Unix ms timestamp of last phone heartbeat (string)
 *   aerorescue:frame       — JSON: { imageBase64, mimeType, postedAt }
 */

const KEY_HEARTBEAT = "aerorescue:heartbeat";
const KEY_FRAME = "aerorescue:frame";

/** Phone considered alive if heartbeat within last 10 s */
const HEARTBEAT_TIMEOUT_MS = 10_000;

// ── Redis REST helper ───────────────────────────────────────────────────────

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisGet(key: string): Promise<string | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      // No caching — always read fresh state
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, exSeconds?: number): Promise<void> {
  const cfg = getRedisConfig();
  if (!cfg) return;
  try {
    // Use EX (expire) so stale frames auto-clean after 60 s
    const url = exSeconds
      ? `${cfg.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/${exSeconds}`
      : `${cfg.url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;
    await fetch(url, {
      method: "GET", // Upstash REST supports GET for set commands
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
  } catch {
    // swallow — best-effort
  }
}

async function redisDel(key: string): Promise<void> {
  const cfg = getRedisConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/del/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
  } catch {
    // swallow
  }
}

// ── Public API (same interface as before) ──────────────────────────────────

export async function recordHeartbeat(): Promise<void> {
  await redisSet(KEY_HEARTBEAT, String(Date.now()), 30);
}

export async function isDroneConnected(): Promise<boolean> {
  const val = await redisGet(KEY_HEARTBEAT);
  if (!val) return false;
  return Date.now() - Number(val) < HEARTBEAT_TIMEOUT_MS;
}

export async function postFrame(imageBase64: string, mimeType: string): Promise<void> {
  const payload = JSON.stringify({ imageBase64, mimeType, postedAt: Date.now() });
  // Expire the frame after 60 s so stale frames never block the laptop
  await Promise.all([
    redisSet(KEY_FRAME, payload, 60),
    redisSet(KEY_HEARTBEAT, String(Date.now()), 30),
  ]);
}

export async function consumeFrame(): Promise<{ imageBase64: string; mimeType: string } | null> {
  const val = await redisGet(KEY_FRAME);
  if (!val) return null;
  // Delete immediately so the same frame isn't consumed twice
  await redisDel(KEY_FRAME);
  try {
    const parsed = JSON.parse(val) as { imageBase64: string; mimeType: string };
    return { imageBase64: parsed.imageBase64, mimeType: parsed.mimeType };
  } catch {
    return null;
  }
}

export async function peekFrame(): Promise<{ imageBase64: string; mimeType: string; postedAt: number } | null> {
  const val = await redisGet(KEY_FRAME);
  if (!val) return null;
  try {
    return JSON.parse(val) as { imageBase64: string; mimeType: string; postedAt: number };
  } catch {
    return null;
  }
}
