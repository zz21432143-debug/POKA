import { prisma } from "@/lib/db";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";

export const FORBIDDEN_CACHE_KEY = "forbidden-words";

export class ForbiddenWordError extends Error {
  word: string;
  constructor(word: string) {
    super(`부적절한 단어(${word})가 포함되어 있어 글을 작성할 수 없습니다.`);
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

export async function assertNoForbiddenWords(...parts: Array<string | null | undefined>) {
  const words = await loadForbiddenWords();
  const hit = findForbiddenWord(parts.filter(Boolean).join("\n"), words);
  if (hit) throw new ForbiddenWordError(hit);
}
