import { prisma } from "@/lib/db";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";
import { PROFANITY_LABEL, findProfanity } from "@/lib/profanity";

export const FORBIDDEN_CACHE_KEY = "forbidden-words";
const DISABLED_CACHE_KEY = "forbidden-words-disabled";

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

/** 숫자 · 기호로 바꿔 쓴 영문(s3x → sex, b1tch → bitch) */
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" };

/**
 * 닉네임 비교용 모양들: 그대로 · _/숫자 뺀 것 · 한글만 · 영문만 · 숫자→영문.
 * 사이에 _ · 숫자 · 영문을 끼워 넣는 우회(금_지어, 금1지어, 금x지어)도 걸리게 합니다.
 */
function nicknameShapes(raw: string) {
  const base = raw.normalize("NFC").toLowerCase().replace(/\s+/g, "");
  const leet = base.replace(/[0-9]/g, (d) => LEET[d] ?? d).replace(/_/g, "");
  return [
    ...new Set([
      base,
      base.replace(/[_0-9]/g, ""),
      base.replace(/[^가-힣]/g, ""),
      base.replace(/[^a-z]/g, ""),
      leet,
      leet.replace(/i/g, "l"),
    ]),
  ].filter(Boolean);
}

/** 닉네임에 금지어가 들어 있으면 그 단어(띄어 쓴 금지어는 붙여서 비교) */
export function findForbiddenInNickname(nickname: string, words: string[]): string | null {
  const shapes = nicknameShapes(nickname);
  for (const word of words) {
    const needle = word.normalize("NFC").toLowerCase().replace(/[\s_]+/g, "");
    if (needle.length < 2) continue;
    if (shapes.some((shape) => shape.includes(needle))) return word.trim();
  }
  return null;
}

/** 닉네임 검사용: 캐시 없이 바로 DB에서(관리자가 방금 넣은 금지어도 모든 서버에서 즉시 적용) */
export async function loadForbiddenWordsFresh() {
  try {
    const rows = await prisma.forbiddenWord.findMany({ select: { word: true } });
    return rows.map((row) => row.word);
  } catch {
    return loadForbiddenWords().catch(() => [] as string[]);
  }
}

export async function loadForbiddenWords() {
  return ttlCache(FORBIDDEN_CACHE_KEY, 30_000, async () => {
    const rows = await prisma.forbiddenWord.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => row.word);
  });
}

/** 관리자가 끈 기본 금지어 */
export async function loadDisabledBaseWords(): Promise<ReadonlySet<string>> {
  return ttlCache(DISABLED_CACHE_KEY, 30_000, async () => {
    const rows = await prisma.disabledBaseWord.findMany({ select: { word: true } });
    return new Set(rows.map((row) => row.word));
  });
}

export function clearForbiddenWordsCache() {
  ttlCacheClear(FORBIDDEN_CACHE_KEY);
  ttlCacheClear(DISABLED_CACHE_KEY);
}

/** 기본 금지어(욕설·음란·도박·스팸·혐오) + 관리자가 추가한 금지어를 모두 검사합니다. */
export async function assertNoForbiddenWords(...parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join("\n");
  const builtin = findProfanity(text, { disabled: await loadDisabledBaseWords() });
  if (builtin) throw new ForbiddenWordError(builtin.match, PROFANITY_LABEL[builtin.category]);
  const words = await loadForbiddenWords();
  const hit = findForbiddenWord(text, words);
  if (hit) throw new ForbiddenWordError(hit);
}
