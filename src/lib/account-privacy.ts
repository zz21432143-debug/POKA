import { createHash } from "node:crypto";

export const BAN_REJOIN_LOG_KIND = "BAN_REJOIN";
export const AUTHOR_IP_RETENTION_DAYS = 90;
export const BAN_REJOIN_RETENTION_DAYS = 365;

export function socialFingerprint(provider: string, providerId: string) {
  return `${provider}:${createHash("sha256").update(providerId).digest("hex")}`;
}

export function withdrawnDisplayName() {
  return "탈퇴한 회원";
}

export function isWithdrawnRecord(user: { withdrawnAt?: Date | string | null } | null | undefined) {
  return Boolean(user?.withdrawnAt);
}
