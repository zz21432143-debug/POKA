import { imageIdFromUrl } from "@/lib/uploads";

/** 사진을 올릴 수 있는 게시판(회원 게시판·공지). 구인·구직(JOBS)에는 사진을 받지 않습니다. */
export const PHOTO_BOARDS = ["FREE", "RULE_QA", "SKETCH", "SUGGESTION", "NOTICE"] as const;
export const MAX_POST_PHOTOS = 5;
/** 회원 1명이 1시간에 올릴 수 있는 사진 수(관리자 제외) */
export const MEMBER_UPLOADS_PER_HOUR = 40;

export function boardAllowsPhotos(boardType: string | null | undefined) {
  return (PHOTO_BOARDS as readonly string[]).includes(boardType ?? "");
}

/** 이 사이트에 올린 사진 주소(/api/images/…)만 남기고, 겹친 것을 빼고, 최대 5장으로 자릅니다. */
export function parsePostPhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const url = item.trim();
    if (!imageIdFromUrl(url) || out.includes(url)) continue;
    out.push(url);
    if (out.length >= MAX_POST_PHOTOS) break;
  }
  return out;
}
