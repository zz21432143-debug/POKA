/** 업로드 이미지 규칙. 포스터는 원본 그대로 올리고, 3MB를 넘을 때만 브라우저에서 줄입니다. */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * PDF 문서(TDA 룰 원본).
 * 서버 함수는 요청·응답 본문이 4.5MB를 넘지 못해, 3MB 조각으로 나눠 올리고 조각으로 내려받아 브라우저에서 합칩니다.
 */
export const PDF_MAX_BYTES = 30 * 1024 * 1024;
export const PDF_PART_BYTES = 3 * 1024 * 1024;
/** 조각을 다 받기 전(올리는 중) 상태 */
export const PDF_PENDING_MIME = "application/pdf+pending";

export function pdfPartCount(size: number) {
  return Math.max(1, Math.ceil(size / PDF_PART_BYTES));
}

export function imageUrl(id: string) {
  return `/api/images/${id}`;
}

export function fileUrl(id: string) {
  return `/api/files/${id}`;
}

/** "/api/images/{id}" → id. 다른 주소면 null. */
export function imageIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.trim().match(/^\/api\/images\/([a-z0-9]+)$/i);
  return m ? m[1] : null;
}

/** "/api/files/{id}" → id. 다른 주소면 null. */
export function fileIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.trim().match(/^\/api\/files\/([a-z0-9]+)$/i);
  return m ? m[1] : null;
}
