import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function sessionSecret() {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "poka-dev-session-secret"
  );
}

export function signSessionValue(nickname: string) {
  const payload = Buffer.from(nickname, "utf8").toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function randomOAuthState() {
  return randomBytes(16).toString("hex");
}
