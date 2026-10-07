import { hashPassword, verifyPassword } from "@/lib/password";

export function packVerifySecret(token: string, code: string) {
  return `${hashPassword(token)}|${hashPassword(code)}`;
}

export function matchVerifySecret(raw: string, packed: string | null | undefined) {
  const value = raw.trim();
  if (!value || !packed) return false;
  if (verifyPassword(value, packed)) return true;
  return packed.split("|").some((part) => part.includes(":") && verifyPassword(value, part));
}
