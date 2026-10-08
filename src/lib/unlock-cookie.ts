import { readSessionValue, signSessionValue } from "@/lib/session";

export const UNLOCK_COOKIE = "poka_unlocks";
const TTL_MS = 2 * 60 * 60 * 1000;

export const UNLOCK_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 2,
};

export function packUnlocks(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 40);
  return signSessionValue(`${Date.now()}.${unique.join(",")}`);
}

export function parseUnlocks(raw: string | undefined | null): string[] {
  const value = readSessionValue(raw);
  if (!value || !value.includes(".")) return [];
  const dot = value.indexOf(".");
  const issued = Number(value.slice(0, dot));
  if (!Number.isFinite(issued) || Date.now() - issued > TTL_MS) return [];
  return value
    .slice(dot + 1)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function hasUnlock(raw: string | undefined | null, postId: string) {
  return parseUnlocks(raw).includes(postId);
}
