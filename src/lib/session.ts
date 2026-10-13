import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  // SESSION_SECRET이 없던 예전 배포 호환(운영에는 Vercel 환경변수 SESSION_SECRET을 꼭 넣습니다)
  const fallback = process.env.DATABASE_URL?.trim();
  if (fallback) return fallback;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET 환경변수가 없습니다.");
  return "poka-dev-session-secret";
}

/** 로그인 유지 기간(쿠키와 같음) */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 로그인 쿠키: 회원 id · 쿠키 버전 · 발급 시각을 서명합니다.
 * 닉네임이 아니라 id라서 닉네임을 바꾸거나 같은 닉네임이 새로 생겨도 다른 계정으로 이어지지 않고,
 * 버전을 올리면(모든 기기 로그아웃 · 탈퇴) 예전 쿠키가 전부 풀립니다.
 */
export function makeSessionToken(userId: string, version: number, now = Date.now()) {
  return signSessionValue(`u2.${userId}.${version}.${now}`);
}

export function parseSessionToken(raw: string | undefined | null, now = Date.now()): { userId: string; version: number } | null {
  const value = readSessionValue(raw);
  if (!value) return null;
  const [tag, userId, version, issued] = value.split(".");
  if (tag !== "u2" || !userId || !/^\d+$/.test(version ?? "") || !/^\d+$/.test(issued ?? "")) return null;
  const issuedAt = Number(issued);
  // 발급 시각이 미래이거나 30일이 지났으면 무효
  if (issuedAt > now + 60_000 || now - issuedAt > SESSION_MAX_AGE_MS) return null;
  return { userId, version: Number(version) };
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
