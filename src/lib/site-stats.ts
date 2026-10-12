import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { shiftDate, todayKstDate } from "@/lib/dates";

/** 검색엔진·미리보기 봇은 방문자로 세지 않습니다(카카오톡 앱 안 브라우저는 셉니다). */
const BOT_UA =
  /(bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum|python|curl|wget|axios|node-fetch)/i;

export function isBotAgent(userAgent: string | null | undefined) {
  return !userAgent || BOT_UA.test(userAgent);
}

/** 오늘(KST) 방문 1회 기록. 같은 브라우저는 하루 한 번만 셉니다. */
export async function recordVisit(visitorId: string, day = todayKstDate()) {
  const visitor = createHash("sha256").update(`poka-visit:${visitorId}`).digest("base64url").slice(0, 32);
  await prisma.dailyVisit.createMany({ data: [{ day, visitor }], skipDuplicates: true });
}

export type DayStat = {
  day: string;
  visitors: number;
  signups: number;
  withdrawals: number;
  /** 그날 끝 기준 회원 수(가입 누적 − 탈퇴 누적) */
  members: number;
};

export type SiteStats = {
  today: DayStat;
  days: DayStat[];
  totals: { visitors: number; signups: number; withdrawals: number; members: number; firstVisitDay: string | null };
};

type CountRow = { day: string; n: bigint | number };

/** 회원가입(User.createdAt)·탈퇴(User.withdrawnAt)는 KST 날짜로 묶습니다. 저장값은 UTC입니다. */
const KST_DAY = (column: string) =>
  `to_char((("${column}" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD')`;

function toMap(rows: CountRow[]) {
  return new Map(rows.map((row) => [row.day, Number(row.n)]));
}

/** 최근 N일 일별 통계 + 누적 */
export async function loadSiteStats(range: number): Promise<SiteStats> {
  const today = todayKstDate();
  const from = shiftDate(today, -(range - 1));
  const [visitRows, signupRows, withdrawRows, totalVisitors, firstVisit, signupsBefore, withdrawalsBefore, signupsAll, withdrawalsAll] =
    await Promise.all([
      prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT "day", COUNT(*) AS n FROM "DailyVisit" WHERE "day" >= $1 GROUP BY "day"`,
        from,
      ),
      prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT ${KST_DAY("createdAt")} AS day, COUNT(*) AS n FROM "User" WHERE ${KST_DAY("createdAt")} >= $1 GROUP BY 1`,
        from,
      ),
      prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT ${KST_DAY("withdrawnAt")} AS day, COUNT(*) AS n FROM "User" WHERE "withdrawnAt" IS NOT NULL AND ${KST_DAY("withdrawnAt")} >= $1 GROUP BY 1`,
        from,
      ),
      prisma.dailyVisit.count(),
      prisma.dailyVisit.findFirst({ orderBy: { day: "asc" }, select: { day: true } }),
      prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM "User" WHERE ${KST_DAY("createdAt")} < $1`, from),
      prisma.$queryRawUnsafe<{ n: bigint }[]>(
        `SELECT COUNT(*) AS n FROM "User" WHERE "withdrawnAt" IS NOT NULL AND ${KST_DAY("withdrawnAt")} < $1`,
        from,
      ),
      prisma.user.count(),
      prisma.user.count({ where: { withdrawnAt: { not: null } } }),
    ]);

  const visits = toMap(visitRows);
  const signups = toMap(signupRows);
  const withdrawals = toMap(withdrawRows);
  let members = Number(signupsBefore[0]?.n ?? 0) - Number(withdrawalsBefore[0]?.n ?? 0);
  const days: DayStat[] = [];
  for (let day = from; day <= today; day = shiftDate(day, 1)) {
    const s = signups.get(day) ?? 0;
    const w = withdrawals.get(day) ?? 0;
    members += s - w;
    days.push({ day, visitors: visits.get(day) ?? 0, signups: s, withdrawals: w, members });
  }
  return {
    today: days[days.length - 1],
    days: days.reverse(),
    totals: {
      visitors: totalVisitors,
      signups: signupsAll,
      withdrawals: withdrawalsAll,
      members: signupsAll - withdrawalsAll,
      firstVisitDay: firstVisit?.day ?? null,
    },
  };
}
