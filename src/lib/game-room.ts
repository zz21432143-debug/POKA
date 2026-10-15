import { findProfanity } from "@/lib/profanity";

export const ROOM_TITLE_MAX = 20;

/** 방 제목 다듬기: 공백 정리 · 20자 · 욕설이면 오류 */
export async function cleanRoomTitle(raw: unknown): Promise<{ title: string } | { error: string }> {
  const title = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, ROOM_TITLE_MAX) : "";
  if (!title) return { title };
  // 닉네임과 같은 검사: 욕설 · 성적 표현(소리 우회 포함) · 사칭 · 관리자가 추가한 금지어
  const { findForbiddenInNickname, loadDisabledBaseWords, loadForbiddenWordsFresh } = await import("@/lib/forbidden-words");
  const [disabled, words] = await Promise.all([loadDisabledBaseWords().catch(() => undefined), loadForbiddenWordsFresh()]);
  if (findProfanity(title, { nickname: true, disabled }) || findForbiddenInNickname(title, words))
    return { error: "방 제목에 쓸 수 없는 말이 있어요." };
  return { title };
}

/** 보이는 방 제목(비면 「방장의 방」) */
export const roomTitle = (title: string | null | undefined, host: string) => (title?.trim() ? title.trim() : `${host}의 방`);
