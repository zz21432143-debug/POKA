import { prisma } from "@/lib/db";
import { todayKstDate, shiftDate } from "@/lib/dates";

/**
 * 유입 경로: 어디서 들어왔는지(출처)별 하루 방문 · 가입 수.
 * 출처는 화면(src/components/analytics/source-beacon.tsx)이 정함: ?from= · ?utm_source= · 초대 링크 · 다른 사이트에서 온 링크(referrer).
 */
export const SOURCE_COOKIE = "poka_src";
export const SOURCE_RE = /^[a-z0-9-]{1,24}$/;

export const SOURCE_LABEL: Record<string, string> = {
  invite: "🤝 친구 초대",
  board: "📺 게임 현황판 QR",
  rotation: "🔁 교대표 QR",
  share: "🖼️ 공유 이미지 QR",
  "game-share": "🎮 게임 결과 공유",
  "game-invite": "🎮 오락실 초대 링크",
  "push-game": "🔔 게임 상대 찾기 알림",
  push: "🔔 푸시 알림",
  google: "구글",
  naver: "네이버",
  daum: "다음",
  kakao: "카카오톡",
  instagram: "인스타그램",
  threads: "스레드",
  facebook: "페이스북",
  youtube: "유튜브",
  band: "밴드",
  "other-site": "다른 사이트",
  direct: "직접 · 알 수 없음",
};

export const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? s;

export async function addTraffic(
  source: string,
  field: "visits" | "signups",
  day = todayKstDate(),
) {
  if (!SOURCE_RE.test(source)) return;
  if (field === "visits") {
    await prisma.$executeRaw`INSERT INTO "TrafficDaily"(day, source, visits, signups) VALUES (${day}, ${source}, 1, 0)
      ON CONFLICT (day, source) DO UPDATE SET visits = "TrafficDaily".visits + 1`;
  } else {
    await prisma.$executeRaw`INSERT INTO "TrafficDaily"(day, source, visits, signups) VALUES (${day}, ${source}, 0, 1)
      ON CONFLICT (day, source) DO UPDATE SET signups = "TrafficDaily".signups + 1`;
  }
}

/** 최근 N일 출처별 합계(방문 많은 순) */
export async function trafficSummary(days: number) {
  const from = shiftDate(todayKstDate(), -(days - 1));
  const rows = await prisma.trafficDaily
    .groupBy({
      by: ["source"],
      where: { day: { gte: from } },
      _sum: { visits: true, signups: true },
    })
    .catch(() => []);
  return rows
    .map((r) => ({
      source: r.source,
      label: sourceLabel(r.source),
      visits: r._sum.visits ?? 0,
      signups: r._sum.signups ?? 0,
    }))
    .sort((a, b) => b.visits - a.visits || b.signups - a.signups);
}
