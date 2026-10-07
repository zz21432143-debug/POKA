import { createHash, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "@/lib/password";

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function packVerifySecret(token: string, code?: string) {
  const parts = [`sha256:${sha256Hex(token)}`];
  if (code) parts.push(`sha256:${sha256Hex(code)}`);
  return parts.join("|");
}

export function matchVerifySecret(raw: string, packed: string | null | undefined) {
  const value = raw.trim();
  if (!value || !packed) return false;
  const digest = Buffer.from(sha256Hex(value), "hex");
  for (const part of packed.split("|")) {
    if (part.startsWith("sha256:")) {
      const stored = Buffer.from(part.slice(7), "hex");
      if (stored.length === digest.length && timingSafeEqual(stored, digest)) return true;
      continue;
    }
    if (part.includes(":") && verifyPassword(value, part)) return true;
  }
  return verifyPassword(value, packed);
}
