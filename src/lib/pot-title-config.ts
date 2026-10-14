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
/**
 * 랭킹 칭호(팟 계산 말고): 각 랭킹 1위에게 붙음. 관리자가 켜기/끄기 · 이름을 바꿉니다.
 * tab · period는 /ranking 랭킹 종류와 기간.
 */
export const HONOR_KEYS = ["level", "weekExp", "monthExp", "marks", "attendance"] as const;
export type HonorKey = (typeof HONOR_KEYS)[number];
export const HONOR_DEFS: Record<HonorKey, { icon: string; name: string; desc: string; tab: "level" | "marks" | "attendance"; period: "all" | "week" | "month" }> = {
  level: { icon: "👑", name: "백귀의 왕", desc: "레벨 랭킹(전체) 1위", tab: "level", period: "all" },
  weekExp: { icon: "🔥", name: "이번 주 사천왕", desc: "이번 주 경험치 1위", tab: "level", period: "week" },
  monthExp: { icon: "🌙", name: "이달의 귀신", desc: "이번 달 경험치 1위", tab: "level", period: "month" },
  marks: { icon: "🎴", name: "요괴 수집가", desc: "마크 수집 랭킹(전체) 1위", tab: "marks", period: "all" },
  attendance: { icon: "📅", name: "개근 도깨비", desc: "이번 달 출석 1위", tab: "attendance", period: "month" },
};
/** top: 1이면 1위만, 3이면 1~3위까지(이름 뒤에 · 2위처럼 붙음) */
export type HonorSetting = { enabled: boolean; name: string; top: 1 | 3 };

export type TitleConfig = {
  enabled: boolean;
  names: Record<1 | 2 | 3, string>;
  difficulty: Difficulty;
  period: TitlePeriod;
  excluded: string[];
  /** 랭킹 칭호 켜기/끄기 · 이름 */
  honors: Record<HonorKey, HonorSetting>;
};

const DEFAULT_HONORS = Object.fromEntries(HONOR_KEYS.map((k) => [k, { enabled: true, name: HONOR_DEFS[k].name, top: 1 }])) as Record<HonorKey, HonorSetting>;

export const DEFAULT_TITLE_CONFIG: TitleConfig = {
  enabled: true,
  names: { ...POT_TITLES },
  difficulty: TITLE_DIFFICULTY,
  period: "all",
  excluded: [],
  honors: DEFAULT_HONORS,
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
  const value = (raw && typeof raw === "object" ? raw : {}) as Omit<Partial<TitleConfig>, "names" | "honors"> & {
    names?: Record<string, unknown>;
    honors?: Record<string, { enabled?: unknown; name?: unknown; top?: unknown } | undefined>;
  };
  const names: Record<string, unknown> = value.names ?? {};
  const honors = Object.fromEntries(
    HONOR_KEYS.map((k) => {
      const h = value.honors?.[k] ?? {};
      return [k, { enabled: typeof h.enabled === "boolean" ? h.enabled : true, name: cleanName(h.name, HONOR_DEFS[k].name), top: Number(h.top) === 3 ? 3 : 1 }];
    }),
  ) as Record<HonorKey, HonorSetting>;
  return {
    honors,
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
