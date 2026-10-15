import { prisma } from "@/lib/db";
import { nicknameError, normalizeNickname } from "@/lib/nickname";
import { findForbiddenWord, loadDisabledBaseWords, loadForbiddenWords } from "@/lib/forbidden-words";

export async function findNicknameOwner(nickname: string, exceptUserId?: string) {
  const next = normalizeNickname(nickname);
  if (!next) return null;
  return prisma.user.findFirst({
    where: {
      nickname: { equals: next, mode: "insensitive" },
      ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}),
    },
    select: { id: true, nickname: true },
  });
}

/** 닉네임 검사 전부: 글자 규칙 · 사칭 · 기본 욕설 · 오픈소스 욕설 목록 · 관리자가 추가한 금지어 */
export async function nicknameProblem(raw: string): Promise<string | null> {
  const next = normalizeNickname(raw);
  const invalid = nicknameError(next, await loadDisabledBaseWords().catch(() => undefined));
  if (invalid) return invalid;
  const words = await loadForbiddenWords().catch(() => [] as string[]);
  if (findForbiddenWord(next, words)) return "금지어가 들어간 닉네임은 쓸 수 없습니다.";
  return null;
}

export async function nicknameAvailability(nickname: string, exceptUserId?: string) {
  const next = normalizeNickname(nickname);
  const invalid = await nicknameProblem(next);
  if (invalid) return { ok: false as const, nickname: next, error: invalid };
  const owner = await findNicknameOwner(next, exceptUserId);
  if (owner) return { ok: false as const, nickname: next, error: "이미 쓰는 닉네임입니다." };
  return { ok: true as const, nickname: next, error: null };
}
