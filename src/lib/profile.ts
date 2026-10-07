import { progressFromExp } from "@/lib/levels";

export type ViewerProfile = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
  isAdmin: boolean;
  isMaster: boolean;
  memberKind: "COMPANY" | "INDIVIDUAL";
  attendanceStreak: number;
  lastAttendanceDate: string | null;
  currentLevelExp: number;
  nextLevelExp: number | null;
  progressPercent: number;
};

export async function getViewerProfile(): Promise<ViewerProfile | null> {
  const { getCurrentUser } = await import("@/lib/current-user");
  return getCurrentUser();
}

export function toViewerProfile(user: {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
  isAdmin?: boolean;
  isMaster?: boolean;
  memberKind?: "COMPANY" | "INDIVIDUAL";
  attendanceStreak?: number;
  lastAttendanceDate?: string | null;
}): ViewerProfile {
  const { currentLevelExp, nextLevelExp, progressPercent } = progressFromExp(user.level, user.exp);

  return {
    nickname: user.nickname,
    profileMarkImageUrl: user.profileMarkImageUrl,
    level: user.level,
    exp: user.exp,
    points: user.points,
    isDealerVerified: user.isDealerVerified,
    isAdmin: Boolean(user.isAdmin),
    isMaster: Boolean(user.isMaster),
    memberKind: user.memberKind === "COMPANY" ? "COMPANY" : "INDIVIDUAL",
    attendanceStreak: user.attendanceStreak ?? 0,
    lastAttendanceDate: user.lastAttendanceDate ?? null,
    currentLevelExp,
    nextLevelExp,
    progressPercent,
  };
}
