/**
 * 팟 계산 칭호 설정(관리자 페이지에서 바꿈). 서버·화면 공통, DB 없이 계산만.
 * - enabled: 칭호를 보일지
 * - names: 1·2·3위 칭호 이름
 * - difficulty: 어느 난이도 랭킹으로 줄지(기본 지옥)
 * - period: 전체 기록 / 이번 달(한국 시간 1일 0시부터) 기록
 * - excluded: 칭호에서 뺄 회원(id) — 랭킹에는 남고 칭호만 안 받음
 */
import { DIFFICULTIES, POT_TITLES, TITLE_DIFFICULTY, type Difficulty } from "@/lib/practice";

export type TitlePeriod = "all" | "month";
export type TitleConfig = {
  enabled: boolean;
  names: Record<1 | 2 | 3, string>;
  difficulty: Difficulty;
  period: TitlePeriod;
  excluded: string[];
};

export const DEFAULT_TITLE_CONFIG: TitleConfig = {
  enabled: true,
  names: { ...POT_TITLES },
  difficulty: TITLE_DIFFICULTY,
  period: "all",
  excluded: [],
};

export const TITLE_NAME_MAX = 12;
export const PERIOD_LABEL: Record<TitlePeriod, string> = { all: "전체 기록", month: "이번 달" };

const cleanName = (value: unknown, fallback: string) => {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_NAME_MAX);
  return text || fallback;
};

/** 저장된 JSON(또는 관리자 입력)을 안전한 설정으로 */
export function normalizeTitleConfig(raw: unknown): TitleConfig {
  const value = (raw && typeof raw === "object" ? raw : {}) as Omit<Partial<TitleConfig>, "names"> & { names?: Record<string, unknown> };
  const names: Record<string, unknown> = value.names ?? {};
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_TITLE_CONFIG.enabled,
    names: {
      1: cleanName(names[1], POT_TITLES[1]),
      2: cleanName(names[2], POT_TITLES[2]),
      3: cleanName(names[3], POT_TITLES[3]),
    },
    difficulty: DIFFICULTIES.includes(value.difficulty as Difficulty) ? (value.difficulty as Difficulty) : DEFAULT_TITLE_CONFIG.difficulty,
    period: value.period === "month" ? "month" : "all",
    excluded: Array.isArray(value.excluded) ? [...new Set(value.excluded.map(String).filter(Boolean))].slice(0, 500) : [],
  };
}

export function parseTitleConfig(json: string | null | undefined): TitleConfig {
  if (!json) return DEFAULT_TITLE_CONFIG;
  try {
    return normalizeTitleConfig(JSON.parse(json));
  } catch {
    return DEFAULT_TITLE_CONFIG;
  }
}

/** 이번 달 시작(한국 시간 1일 0시)을 UTC 시각으로 */
export function monthStartKst(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1) - 9 * 3600_000);
}
