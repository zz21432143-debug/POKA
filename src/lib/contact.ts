/**
 * 구인글 연락처 규칙: 전화번호만 받습니다(카카오톡 아이디·오픈채팅·영문 불가).
 * "010-1234-5678", "김포카 010 1234 5678", 여러 개는 쉼표로 구분합니다. 이름은 한글만 붙일 수 있습니다.
 */
export const KAKAO_CONTACT_MESSAGE = "카카오톡 아이디는 입력할 수 없습니다. 올바른 전화번호를 입력해 주세요.";
export const CONTACT_REQUIRED_MESSAGE = "연락처(전화번호)를 입력해 주세요.";

const PHONE_RE = /(0\d{1,3})[-.\s]?(\d{3,4})[-.\s]?(\d{4})/;
const MAX_CONTACTS = 5;

export type ContactCheck = { ok: true; value: string } | { ok: false; error: string };

/** 숫자만 받아 하이픈 형식으로: 01012345678 → 010-1234-5678, 0212345678 → 02-1234-5678 */
export function formatPhone(digits: string): string {
  if (digits.startsWith("02")) return `02-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  if (digits.length === 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
}

function validPhoneDigits(digits: string) {
  if (/^01[016789]\d{7,8}$/.test(digits)) return true; // 휴대폰
  if (/^02\d{7,8}$/.test(digits)) return true; // 서울
  if (/^0[3-6]\d\d{7,8}$/.test(digits)) return true; // 지역번호
  if (/^0(50\d|70)\d{7,8}$/.test(digits)) return true; // 0507 안심번호·070
  return false;
}

export function checkJobContact(raw: string | null | undefined): ContactCheck {
  const text = (raw ?? "").trim();
  if (!text) return { ok: false, error: CONTACT_REQUIRED_MESSAGE };
  // 영문·@·밑줄이나 카톡/오픈채팅 표기가 있으면 카카오톡 아이디로 봅니다.
  if (/[A-Za-z@_]|카톡|카카오|오픈\s*채팅|open\.kakao/i.test(text)) return { ok: false, error: KAKAO_CONTACT_MESSAGE };

  const parts = text.split(/[,\n/·]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > MAX_CONTACTS) return { ok: false, error: `연락처는 ${MAX_CONTACTS}개까지 넣을 수 있습니다.` };
  const out: string[] = [];
  for (const part of parts) {
    const m = part.match(PHONE_RE);
    if (!m) return { ok: false, error: KAKAO_CONTACT_MESSAGE };
    const digits = m[0].replace(/\D/g, "");
    if (!validPhoneDigits(digits)) return { ok: false, error: KAKAO_CONTACT_MESSAGE };
    // 번호 말고 남은 글자는 한글 이름(예: 김포카, 문의)만 허용합니다.
    const rest = part.replace(m[0], " ").replace(/[():：\-\s]+/g, " ").trim();
    if (rest && !/^[가-힣]{1,10}( [가-힣]{1,10})?$/.test(rest)) return { ok: false, error: KAKAO_CONTACT_MESSAGE };
    out.push(rest ? `${rest} ${formatPhone(digits)}` : formatPhone(digits));
  }
  return { ok: true, value: [...new Set(out)].join(", ") };
}
