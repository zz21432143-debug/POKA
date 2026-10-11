export const PAGE_SIZE = 10;

export type FeedKey =
  | "schedule"
  | "official"
  | "attendance"
  | "rules"
  | "sketch"
  | "free"
  | "hand-review"
  | "suggestions"
  | "notices"
  | "jobs"
  | "jobs/fixed"
  | "jobs/apply"
  | "jobs/team"
  | "jobs/urgent";

export const FEED_BY_HREF: Record<string, FeedKey> = {
  "/boards/schedule": "schedule",
  "/boards/official": "official",
  "/boards/promo": "official",
  "/attendance": "attendance",
  "/boards/rules": "rules",
  "/boards/sketch": "sketch",
  "/boards/free": "free",
  "/boards/hand-review": "hand-review",
  "/boards/suggestions": "suggestions",
  "/notices": "notices",
  "/boards/jobs": "jobs",
  "/boards/jobs/fixed": "jobs/fixed",
  "/boards/jobs/apply": "jobs/apply",
  "/boards/jobs/team": "jobs/team",
  "/boards/jobs/urgent": "jobs/urgent",
};

/** 자유게시판 말머리. 순서대로 탭에 나옵니다. */
export const FREE_BOARD_TYPES = ["FREE", "RULE_QA", "SKETCH"] as const;

export function parseFeedKey(raw: string | null): FeedKey | null {
  if (!raw) return null;
  const value = raw.replace(/^\/boards\//, "").replace(/^\//, "") as FeedKey;
  const allowed = new Set(Object.values(FEED_BY_HREF));
  return allowed.has(value) ? value : null;
}

export function feedWhere(key: FeedKey) {
  if (key === "attendance") return { isAttendanceThread: true };
  if (key === "schedule") return { boardType: "SCHEDULE" as const, hidden: false, isAttendanceThread: false };
  if (key === "official") {
    return { boardType: "PROMO" as const, hidden: false, storeVerified: true, isAttendanceThread: false };
  }
  if (key === "rules") return { boardType: "RULE_QA" as const, hidden: false, isAttendanceThread: false };
  if (key === "sketch") return { boardType: "SKETCH" as const, hidden: false, isAttendanceThread: false };
  if (key === "free") {
    // 자유게시판은 질문·현장 스케치를 말머리로 함께 보여줍니다.
    return { boardType: { in: [...FREE_BOARD_TYPES] }, hidden: false, isAttendanceThread: false };
  }
  if (key === "hand-review") return { boardType: "HAND_REVIEW" as const, hidden: false, isAttendanceThread: false };
  if (key === "suggestions") return { boardType: "SUGGESTION" as const, hidden: false, isAttendanceThread: false };
  if (key === "notices") return { boardType: "NOTICE" as const, hidden: false, isAttendanceThread: false };
  if (key === "jobs") {
    // 개인 구직은 운영 종료. 예전 구직 글은 목록에 내지 않습니다.
    return {
      boardType: "JOBS" as const,
      hidden: false,
      isAttendanceThread: false,
      OR: [{ jobKind: null }, { jobKind: { not: "SEEKING" as const } }],
    };
  }
  const jobKind = {
    "jobs/fixed": "FIXED",
    "jobs/apply": "APPLY",
    "jobs/team": "TEAM",
    "jobs/urgent": "URGENT",
  }[key] as "FIXED" | "APPLY" | "TEAM" | "URGENT";
  return { boardType: "JOBS" as const, jobKind, hidden: false, isAttendanceThread: false };
}

export function jobFeedKey(kind: "FIXED" | "APPLY" | "TEAM" | "URGENT") {
  return (
    {
      FIXED: "jobs/fixed",
      APPLY: "jobs/apply",
      TEAM: "jobs/team",
      URGENT: "jobs/urgent",
    } as const
  )[kind];
}

export function isJobFeed(key: FeedKey) {
  return key === "jobs" || key.startsWith("jobs/");
}
