import { holdemOnlyViolation } from "@/lib/holdem-only";

const RESERVED = new Set(["관리자", "운영자", "익명", "anonymous", "poka", "admin", "펠트딜러"]);

export function normalizeNickname(raw: string) {
  return raw.trim().replace(/\s+/g, "");
}

export function nicknameError(raw: string): string | null {
  const nickname = normalizeNickname(raw);
  if (nickname.length < 2 || nickname.length > 12) return "닉네임은 2~12자입니다.";
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) return "닉네임은 한글, 영문, 숫자, _ 만 됩니다.";
  if (RESERVED.has(nickname.toLowerCase()) || RESERVED.has(nickname)) {
    return "사용할 수 없는 닉네임입니다.";
  }
  if (holdemOnlyViolation(nickname)) return "이 닉네임은 등록할 수 없습니다.";
  return null;
}

export function passwordError(raw: string): string | null {
  if (raw.length < 8 || raw.length > 64) return "비밀번호는 8자 이상입니다.";
  return null;
}
