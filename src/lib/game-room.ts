import { findProfanity } from "@/lib/profanity";

export const ROOM_TITLE_MAX = 20;

/** 방 제목 다듬기: 공백 정리 · 20자 · 욕설이면 오류 */
export function cleanRoomTitle(raw: unknown): { title: string } | { error: string } {
  const title = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, ROOM_TITLE_MAX) : "";
  if (title && findProfanity(title, { nickname: true })) return { error: "방 제목에 쓸 수 없는 말이 있어요." };
  return { title };
}

/** 보이는 방 제목(비면 「방장의 방」) */
export const roomTitle = (title: string | null | undefined, host: string) => (title?.trim() ? title.trim() : `${host}의 방`);
