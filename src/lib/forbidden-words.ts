import { prisma } from "@/lib/db";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";
import { PROFANITY_LABEL, findProfanity } from "@/lib/profanity";

export const FORBIDDEN_CACHE_KEY = "forbidden-words";
const DISABLED_CACHE_KEY = "forbidden-words-disabled";
const JOB_ALLOWED_CACHE_KEY = "forbidden-words-job-allowed";

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

/** 「자 지」 · 「보 지」처럼 글자 사이를 띄운 짧은 단어(띄운 걸 빼면 3글자 이하) */
export function isSpacedShortWord(word: string) {
  return /\s/.test(word.trim()) && word.replace(/\s+/g, "").length <= 3;
}

export function findForbiddenWord(text: string, words: string[]): string | null {
  const haystack = text.normalize("NFC").toLowerCase();
  for (const word of words) {
    const needle = word.normalize("NFC").trim().toLowerCase();
    if (needle.length < 2) continue;
    // 띄어 쓴 두 글자(「자 지」)는 「이상자 지원」 같은 정상 문장까지 막으므로 건너뜀
    if (isSpacedShortWord(needle)) continue;
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

/** 운영자가 「구인에서는 허용」으로 켠 금지어 */
export async function loadJobAllowedWords(): Promise<ReadonlySet<string>> {
  return ttlCache(JOB_ALLOWED_CACHE_KEY, 30_000, async () => {
    const rows = await prisma.forbiddenWord.findMany({ where: { jobAllowed: true }, select: { word: true } }).catch(() => []);
    return new Set(rows.map((row) => squash(row.word)));
  });
}

export function clearForbiddenWordsCache() {
  ttlCacheClear(FORBIDDEN_CACHE_KEY);
  ttlCacheClear(DISABLED_CACHE_KEY);
  ttlCacheClear(JOB_ALLOWED_CACHE_KEY);
}

/** 기본 금지어(욕설·음란·도박·스팸·혐오) + 관리자가 추가한 금지어를 모두 검사합니다. */
export async function assertNoForbiddenWords(...parts: Array<string | null | undefined>) {
  await checkForbidden(parts, null);
}

/**
 * 구인 · 지원 글에서는 막지 않는 단어: 「문자지원」 · 「남자지원」처럼 공고에 늘 나오는 말이라서.
 * 다른 게시판 · 댓글 · 닉네임은 그대로 막습니다.
 */
export const JOB_ALLOWED_WORDS: ReadonlySet<string> = new Set(["자지"]);

/** 구인 게시판(공고 · 지원 메시지)용 금지어 검사 */
export async function assertNoForbiddenWordsInJob(...parts: Array<string | null | undefined>) {
  const extra = await loadJobAllowedWords();
  await checkForbidden(parts, new Set([...JOB_ALLOWED_WORDS, ...extra]));
}

const squash = (w: string) => w.normalize("NFC").toLowerCase().replace(/\s+/g, "");

async function checkForbidden(parts: Array<string | null | undefined>, allowed: ReadonlySet<string> | null) {
  const text = parts.filter(Boolean).join("\n");
  const disabled = await loadDisabledBaseWords();
  const builtin = findProfanity(text, { disabled: allowed ? new Set([...disabled, ...allowed]) : disabled });
  if (builtin) throw new ForbiddenWordError(builtin.match, PROFANITY_LABEL[builtin.category]);
  const words = await loadForbiddenWords();
  const hit = findForbiddenWord(text, allowed ? words.filter((w) => !allowed.has(squash(w))) : words);
  if (hit) throw new ForbiddenWordError(hit);
}
