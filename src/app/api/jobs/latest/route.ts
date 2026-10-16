import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { openJobWhere, parseJobRegion, regionWhere } from "@/lib/job-status";

export const dynamic = "force-dynamic";

/** 빈자리 보드: since(ms) 뒤에 올라오거나 끌어올린 지원 딜러 · 급구 · 대회 공고 수 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const since = Number(q.get("since"));
  if (!Number.isFinite(since) || since <= 0) return NextResponse.json({ count: 0 });
  const region = parseJobRegion(q.get("region") ?? undefined);
  const count = await prisma.post
    .count({
      where: {
        AND: [
          { boardType: "JOBS", hidden: false, isAttendanceThread: false, jobKind: { in: ["APPLY", "URGENT", "TOURNAMENT"] }, bumpedAt: { gt: new Date(since) } },
          openJobWhere(),
          regionWhere(region),
        ],
      },
    })
    .catch(() => 0);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
