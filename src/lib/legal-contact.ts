export const DEFAULT_OPERATOR_NAME = "POKA 관리자";
export const DEFAULT_CONTACT_EMAIL = "POKA4444444@gmail.com";
export const LEGACY_CONTACT_EMAIL = "contact@pokerwiki.co.kr";

export function privacyOfficerName() {
  return process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || DEFAULT_OPERATOR_NAME;
}

function usableEmail(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_CONTACT_EMAIL) return null;
  return trimmed;
}

export function publicContactEmail(fallback?: string | null) {
  return usableEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? usableEmail(fallback) ?? DEFAULT_CONTACT_EMAIL;
}
