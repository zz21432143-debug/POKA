/** 업로드 이미지 규칙. 브라우저에서 긴 변 1600px JPEG로 줄여 올리므로 보통 수백 KB입니다. */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * PDF 문서(TDA 룰 원본) 최대 크기.
 * Vercel 서버 함수는 요청·응답 본문이 4.5MB를 넘지 못해 4MB로 막습니다.
 */
export const PDF_MAX_BYTES = 4 * 1024 * 1024;

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
