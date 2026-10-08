export const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/gewUD9jc";
export const KAKAO_INQUIRY_ID = "POKA1";
export const KAKAO_INQUIRY_URL = `kakaotalk://addfriend?id=${KAKAO_INQUIRY_ID}`;

export function kakaoInquiryHref(stored?: string | null) {
  const value = stored?.trim();
  if (!value || value === KAKAO_OPEN_CHAT_URL) return KAKAO_INQUIRY_URL;
  return value;
}
