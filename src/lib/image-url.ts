/** 이미지 주소 줄이기에 쓰는 폭(이 값들만 받아 캐시가 흩어지지 않게) */
export const IMAGE_WIDTHS = [240, 360, 480, 720, 960, 1280] as const;

/**
 * 올린 이미지(/api/images/…)를 화면 크기에 맞게 줄여 받습니다(WebP).
 * 다른 주소(기본 배너 등)는 그대로 둡니다.
 */
export function sizedImage(url: string | null | undefined, width: (typeof IMAGE_WIDTHS)[number]) {
  if (!url) return url ?? "";
  if (!url.startsWith("/api/images/") || url.includes("?")) return url;
  return `${url}?w=${width}`;
}
