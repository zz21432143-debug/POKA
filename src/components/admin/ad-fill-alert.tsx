import Link from "next/link";
import { nowMs } from "@/lib/dates";
import { prisma } from "@/lib/db";

/** 채움률 이만큼 아래면 알림(최근 7일 · 노출 기록이 충분한 자리만) */
const LOW_RATE = 0.5;
const MIN_SAMPLES = 20;

const LABEL: Record<string, string> = {
  "board-bottom": "게시판 · 공부 도구 · 랭킹 하단",
  "post-bottom": "글 아래",
  sidebar: "PC 왼쪽 사이드",
  "home-mid": "홈 중간",
  "home-top": "홈 상단",
  "home-bottom": "홈 하단",
  "post-top": "글 위",
  "post-mid": "긴 글 중간",
  infeed: "목록 사이",
};

/** 관리 화면 맨 위: 광고가 잘 안 채워지는 자리 알림(마스터) */
export async function AdFillAlert() {
  const since = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(nowMs() - 6 * 86_400_000));
  const rows = await prisma
    .$queryRaw<{ placement: string; filled: number; unfilled: number }[]>`SELECT "placement", SUM("filled")::int AS "filled", SUM("unfilled")::int AS "unfilled" FROM "AdFillStat" WHERE "day" >= ${since} GROUP BY "placement"`
    .catch(() => []);
  const low = rows
    .filter((r) => r.filled + r.unfilled >= MIN_SAMPLES && r.filled / (r.filled + r.unfilled) < LOW_RATE)
    .map((r) => ({ ...r, rate: Math.round((r.filled / (r.filled + r.unfilled)) * 100) }));
  if (!low.length) return null;
  return (
    <Link href="/admin/adsense" data-ad-fill-alert className="block rounded-2xl border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm">
      <b className="text-amber-200">⚠️ 광고가 잘 안 채워지는 자리 {low.length}곳</b>
      <span className="block text-xs text-amber-100/90">
        {low.map((r) => `${LABEL[r.placement] ?? r.placement} ${r.rate}%`).join(" · ")} — 최근 7일 기준. 그 자리만 다른 광고 단위로 바꾸거나 꺼 보세요 →
      </span>
    </Link>
  );
}
