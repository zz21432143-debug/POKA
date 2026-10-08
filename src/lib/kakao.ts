export const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/gewUD9jc";
export const KAKAO_INQUIRY_ID = "POKA1";
export const KAKAO_INQUIRY_URL = `kakaotalk://addfriend?id=${KAKAO_INQUIRY_ID}`;

export function kakaoInquiryHref(stored?: string | null) {
  const value = stored?.trim();
  if (!value || value === KAKAO_OPEN_CHAT_URL) return KAKAO_INQUIRY_URL;
  if (value.startsWith("kakaotalk://") || value.startsWith("intent://") || value.startsWith("http")) return value;
  return KAKAO_INQUIRY_URL;
}
