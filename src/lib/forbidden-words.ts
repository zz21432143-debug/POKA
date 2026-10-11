import { prisma } from "@/lib/db";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";
import { PROFANITY_LABEL, findProfanity } from "@/lib/profanity";

export const FORBIDDEN_CACHE_KEY = "forbidden-words";

export class ForbiddenWordError extends Error {
  word: string;
  constructor(word: string, label?: string) {
    // 기본 필터에 걸리면 단어 대신 종류(욕설·스팸 등)만 알려 줍니다. 우회 단서를 덜 주기 위해서입니다.
    super(
      label
        ? `${label}이(가) 포함되어 있어 등록할 수 없습니다. 표현을 바꿔 다시 시도해 주세요.`
        : `부적절한 단어(${word})가 포함되어 있어 글을 작성할 수 없습니다.`,
    );
    this.name = "ForbiddenWordError";
    this.word = word;
  }
}

export function findForbiddenWord(text: string, words: string[]): string | null {
  const haystack = text.normalize("NFC").toLowerCase();
  for (const word of words) {
    const needle = word.normalize("NFC").trim().toLowerCase();
    if (needle.length < 2) continue;
    if (haystack.includes(needle)) return word.trim();
  }
  return null;
}

export async function loadForbiddenWords() {
  return ttlCache(FORBIDDEN_CACHE_KEY, 30_000, async () => {
    const rows = await prisma.forbiddenWord.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => row.word);
  });
}

export function clearForbiddenWordsCache() {
  ttlCacheClear(FORBIDDEN_CACHE_KEY);
}

/** 기본 금지어(욕설·음란·도박·스팸·혐오) + 관리자가 추가한 금지어를 모두 검사합니다. */
export async function assertNoForbiddenWords(...parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join("\n");
  const builtin = findProfanity(text);
  if (builtin) throw new ForbiddenWordError(builtin.match, PROFANITY_LABEL[builtin.category]);
  const words = await loadForbiddenWords();
  const hit = findForbiddenWord(text, words);
  if (hit) throw new ForbiddenWordError(hit);
}
