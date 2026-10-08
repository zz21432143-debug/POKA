export const DEFAULT_OPERATOR_NAME = "POKA 관리자";
export const DEFAULT_CONTACT_EMAIL = "POKA4444444@gmail.com";
export const LEGACY_CONTACT_EMAIL = "contact@pokerwiki.co.kr";

export function privacyOfficerName() {
  return process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || DEFAULT_OPERATOR_NAME;
}

export function publicContactEmail(fallback?: string | null) {
  const fromEnv = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  const extra = fallback?.trim();
  if (extra && extra !== LEGACY_CONTACT_EMAIL) return extra;
  return DEFAULT_CONTACT_EMAIL;
}
