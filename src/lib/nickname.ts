import { holdemOnlyViolation } from "@/lib/holdem-only";

const RESERVED_EXACT = new Set(
  [
    "관리자",
    "운영자",
    "익명",
    "anonymous",
    "poka",
    "admin",
    "master",
    "operator",
    "펠트딜러",
    "포카",
    "포카운영자",
    "포카마스터",
    "포카관리자",
    "poka운영자",
    "pokamaster",
    "pokaadmin",
  ].map((row) => row.toLowerCase()),
);

export function normalizeNickname(raw: string) {
  return raw.trim().replace(/\s+/g, "");
}

export function isReservedNickname(raw: string) {
  const nickname = normalizeNickname(raw);
  if (!nickname) return true;
  const lower = nickname.toLowerCase();
  if (RESERVED_EXACT.has(lower)) return true;
  if (nickname.startsWith("탈퇴_")) return true;
  if (/포카/.test(nickname)) return true;
  if (/^poka/i.test(nickname)) return true;
  if (/운영자|관리자/.test(nickname)) return true;
  if (/(^|_)(admin|master|operator)(_|$)/i.test(nickname)) return true;
  if (/^마스터$/.test(nickname) || /^master$/i.test(nickname)) return true;
  return false;
}

export function nicknameError(raw: string): string | null {
  const nickname = normalizeNickname(raw);
  if (nickname.length < 2 || nickname.length > 12) return "닉네임은 2~12자입니다.";
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) return "닉네임은 한글, 영문, 숫자, _ 만 됩니다.";
  if (isReservedNickname(nickname)) return "운영자·POKA 관련 닉네임은 쓸 수 없습니다.";
  if (holdemOnlyViolation(nickname)) return "이 닉네임은 등록할 수 없습니다.";
  return null;
}

export function passwordError(raw: string): string | null {
  if (raw.length < 8 || raw.length > 64) return "비밀번호는 8자 이상입니다.";
  return null;
}
