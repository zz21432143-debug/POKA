/** 업로드 이미지 규칙. 브라우저에서 긴 변 1600px JPEG로 줄여 올리므로 보통 수백 KB입니다. */
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function imageUrl(id: string) {
  return `/api/images/${id}`;
}

/** "/api/images/{id}" → id. 다른 주소면 null. */
export function imageIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.trim().match(/^\/api\/images\/([a-z0-9]+)$/i);
  return m ? m[1] : null;
}
