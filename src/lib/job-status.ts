import { shiftDate, todayKstDate } from "@/lib/dates";

/** 일반 공고는 등록 후 이 기간이 지나면 자동 마감으로 봅니다. */
export const JOB_EXPIRE_DAYS = 30;
/** 날짜 없는(즉시/협의) 급구는 등록 후 이 기간이 지나면 마감으로 봅니다. */
export const URGENT_UNDATED_EXPIRE_DAYS = 7;

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

/** 모집중 공고 조건. jobFilled가 아니고 유효기간 안이어야 합니다. */
export function openJobWhere(now = new Date(), today = todayKstDate()) {
  return {
    jobFilled: false,
    OR: [
      { jobAlwaysOpen: true },
      { jobKind: "URGENT" as const, jobWorkDate: { gte: today } },
      { jobKind: "URGENT" as const, jobWorkDate: null, createdAt: { gte: cutoff(now, URGENT_UNDATED_EXPIRE_DAYS) } },
      { jobKind: { not: "URGENT" as const }, createdAt: { gte: cutoff(now, JOB_EXPIRE_DAYS) } },
      { jobKind: null, createdAt: { gte: cutoff(now, JOB_EXPIRE_DAYS) } },
    ],
  };
}

/** openJobWhere의 정확한 반대. NULL 비교 때문에 NOT 대신 직접 적습니다. */
export function closedJobWhere(now = new Date(), today = todayKstDate()) {
  return {
    OR: [
      { jobFilled: true },
      { jobAlwaysOpen: false, jobKind: "URGENT" as const, jobWorkDate: { lt: today } },
      {
        jobAlwaysOpen: false,
        jobKind: "URGENT" as const,
        jobWorkDate: null,
        createdAt: { lt: cutoff(now, URGENT_UNDATED_EXPIRE_DAYS) },
      },
      { jobAlwaysOpen: false, jobKind: { not: "URGENT" as const }, createdAt: { lt: cutoff(now, JOB_EXPIRE_DAYS) } },
      { jobAlwaysOpen: false, jobKind: null, createdAt: { lt: cutoff(now, JOB_EXPIRE_DAYS) } },
    ],
  };
}

export type JobStatusInput = {
  jobKind: string | null;
  jobFilled: boolean;
  jobAlwaysOpen?: boolean;
  jobWorkDate: string | null;
  createdAt: Date | string;
};

export type JobStatus = "open" | "filled" | "expired";

export function jobStatus(post: JobStatusInput, now = new Date(), today = todayKstDate()): JobStatus {
  if (post.jobFilled) return "filled";
  if (post.jobAlwaysOpen) return "open";
  const created = new Date(post.createdAt);
  if (post.jobKind === "URGENT") {
    if (post.jobWorkDate) return post.jobWorkDate < today ? "expired" : "open";
    return created < cutoff(now, URGENT_UNDATED_EXPIRE_DAYS) ? "expired" : "open";
  }
  return created < cutoff(now, JOB_EXPIRE_DAYS) ? "expired" : "open";
}

/** 일반 공고가 자동 마감되는 날짜(YYYY-MM-DD). 급구는 근무일. */
export function jobExpiresOn(post: JobStatusInput): string | null {
  if (post.jobAlwaysOpen) return null;
  if (post.jobKind === "URGENT") return post.jobWorkDate;
  const created = new Date(post.createdAt);
  const kst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(created);
  return shiftDate(kst, JOB_EXPIRE_DAYS);
}
