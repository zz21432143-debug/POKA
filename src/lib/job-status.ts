import { shiftDate, todayKstDate } from "@/lib/dates";

/** 날짜가 없는 일반 공고는 등록 후 이 기간이 지나면 자동 마감으로 봅니다. */
export const JOB_EXPIRE_DAYS = 30;
/** 날짜 없는(즉시/협의) 급구는 등록 후 이 기간이 지나면 마감으로 봅니다. */
export const URGENT_UNDATED_EXPIRE_DAYS = 7;

/** 근무 날짜가 있는 분류. 마지막 근무일이 지나면 마감됩니다. */
export const DATED_JOB_KINDS = ["URGENT", "APPLY", "TOURNAMENT"] as const;
/** 날짜가 없으면 30일 기준으로 마감하는 분류 */
const UNDATED_30_KINDS = ["FIXED", "TEAM", "SEEKING"] as const;

/** 구인구직 지역 칩. 공고의 jobLocation 앞부분(예: "서울 강남")과 맞춥니다. */
export const JOB_REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export type JobRegion = (typeof JOB_REGIONS)[number];

export function parseJobRegion(raw: string | null | undefined): JobRegion | null {
  const value = raw?.trim();
  if (!value) return null;
  return (JOB_REGIONS as readonly string[]).includes(value) ? (value as JobRegion) : null;
}

export function regionWhere(region: JobRegion | null) {
  return region ? { jobLocation: { contains: region } } : {};
}

function cutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * 모집중 공고 조건.
 * 모든 비교에 "값이 있을 때만(not null)"을 붙여, SQL에서 결과가 NULL이 되지 않게 했습니다.
 * 덕분에 closedJobWhere를 NOT(모집중)으로 만들어도 빠지는 공고가 없습니다.
 */
export function openJobWhere(now = new Date(), today = todayKstDate()) {
  const dated = { in: [...DATED_JOB_KINDS], not: null };
  return {
    jobFilled: false,
    // 모집 마감일이 없거나, 아직 지나지 않았을 때
    OR: [{ jobDeadline: null }, { jobDeadline: { gte: today, not: null } }],
    AND: [
      {
        OR: [
          { jobAlwaysOpen: true },
          // 날짜 있는 공고: 마지막 근무일(없으면 첫 근무일)이 오늘 이후
          { jobKind: dated, jobEndDate: { gte: today, not: null } },
          { jobKind: dated, jobEndDate: null, jobWorkDate: { gte: today, not: null } },
          // 날짜 없는 급구: 7일
          {
            jobKind: { equals: "URGENT" as const, not: null },
            jobEndDate: null,
            jobWorkDate: null,
            createdAt: { gte: cutoff(now, URGENT_UNDATED_EXPIRE_DAYS) },
          },
          // 날짜 없는 지원·대회 딜러: 30일
          {
            jobKind: { in: ["APPLY" as const, "TOURNAMENT" as const], not: null },
            jobEndDate: null,
            jobWorkDate: null,
            createdAt: { gte: cutoff(now, JOB_EXPIRE_DAYS) },
          },
          // 고정·팀 등 날짜 없는 분류: 30일
          { jobKind: { in: [...UNDATED_30_KINDS], not: null }, createdAt: { gte: cutoff(now, JOB_EXPIRE_DAYS) } },
          { jobKind: null, createdAt: { gte: cutoff(now, JOB_EXPIRE_DAYS) } },
        ],
      },
    ],
  };
}

/** openJobWhere의 정확한 반대 */
export function closedJobWhere(now = new Date(), today = todayKstDate()) {
  return { NOT: openJobWhere(now, today) };
}

export type JobStatusInput = {
  jobKind: string | null;
  jobFilled: boolean;
  jobAlwaysOpen?: boolean;
  jobWorkDate: string | null;
  jobEndDate?: string | null;
  jobDeadline?: string | null;
  createdAt: Date | string;
};

export type JobStatus = "open" | "filled" | "expired";

export function jobStatus(post: JobStatusInput, now = new Date(), today = todayKstDate()): JobStatus {
  if (post.jobFilled) return "filled";
  if (post.jobDeadline && post.jobDeadline < today) return "expired";
  if (post.jobAlwaysOpen) return "open";
  const created = new Date(post.createdAt);
  const kind = post.jobKind;
  if (kind && (DATED_JOB_KINDS as readonly string[]).includes(kind)) {
    const last = post.jobEndDate || post.jobWorkDate;
    if (last) return last < today ? "expired" : "open";
    const days = kind === "URGENT" ? URGENT_UNDATED_EXPIRE_DAYS : JOB_EXPIRE_DAYS;
    return created < cutoff(now, days) ? "expired" : "open";
  }
  return created < cutoff(now, JOB_EXPIRE_DAYS) ? "expired" : "open";
}

/** 자동 마감 예정일(YYYY-MM-DD). 마감일·마지막 근무일 중 이른 날, 날짜가 없으면 등록 후 30일. */
export function jobExpiresOn(post: JobStatusInput): string | null {
  if (post.jobAlwaysOpen) return post.jobDeadline ?? null;
  const kind = post.jobKind;
  const dated = Boolean(kind && (DATED_JOB_KINDS as readonly string[]).includes(kind));
  const last = dated ? post.jobEndDate || post.jobWorkDate : null;
  if (last || post.jobDeadline) {
    return [last, post.jobDeadline].filter((v): v is string => Boolean(v)).sort()[0] ?? null;
  }
  const kst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(post.createdAt));
  return shiftDate(kst, kind === "URGENT" ? URGENT_UNDATED_EXPIRE_DAYS : JOB_EXPIRE_DAYS);
}
