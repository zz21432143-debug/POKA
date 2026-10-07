export const PAGE_SIZE = 10;

export type FeedKey =
  | "schedule"
  | "official"
  | "attendance"
  | "rules"
  | "sketch"
  | "free"
  | "hand-review"
  | "anonymous"
  | "jobs/fixed"
  | "jobs/apply"
  | "jobs/team"
  | "jobs/urgent"
  | "jobs/seek";

export const FEED_BY_HREF: Record<string, FeedKey> = {
  "/boards/schedule": "schedule",
  "/boards/official": "official",
  "/boards/promo": "official",
  "/attendance": "attendance",
  "/boards/rules": "rules",
  "/boards/sketch": "sketch",
  "/boards/free": "free",
  "/boards/hand-review": "hand-review",
  "/boards/anonymous": "anonymous",
  "/boards/jobs/fixed": "jobs/fixed",
  "/boards/jobs/apply": "jobs/apply",
  "/boards/jobs/team": "jobs/team",
  "/boards/jobs/urgent": "jobs/urgent",
  "/boards/jobs/seek": "jobs/seek",
};

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
  if (key === "free") return { boardType: "FREE" as const, hidden: false, isAttendanceThread: false };
  if (key === "hand-review") return { boardType: "HAND_REVIEW" as const, hidden: false, isAttendanceThread: false };
  if (key === "anonymous") return { boardType: "ANONYMOUS_REVIEW" as const, hidden: false, isAttendanceThread: false };
  const jobKind = {
    "jobs/fixed": "FIXED",
    "jobs/apply": "APPLY",
    "jobs/team": "TEAM",
    "jobs/urgent": "URGENT",
    "jobs/seek": "SEEKING",
  }[key] as "FIXED" | "APPLY" | "TEAM" | "URGENT" | "SEEKING";
  return { boardType: "JOBS" as const, jobKind, hidden: false, isAttendanceThread: false };
}

export function jobFeedKey(kind: "FIXED" | "APPLY" | "TEAM" | "URGENT" | "SEEKING") {
  return (
    {
      FIXED: "jobs/fixed",
      APPLY: "jobs/apply",
      TEAM: "jobs/team",
      URGENT: "jobs/urgent",
      SEEKING: "jobs/seek",
    } as const
  )[kind];
}

export function isJobFeed(key: FeedKey) {
  return key.startsWith("jobs/");
}
