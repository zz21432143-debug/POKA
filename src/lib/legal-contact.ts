export const DEFAULT_OPERATOR_NAME = "POKA 관리자";
export const DEFAULT_CONTACT_EMAIL = "contact@pokerwiki.co.kr";

export function privacyOfficerName() {
  return process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || DEFAULT_OPERATOR_NAME;
}

export function publicContactEmail(fallback?: string | null) {
  return (
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
    fallback?.trim() ||
    DEFAULT_CONTACT_EMAIL
  );
}
