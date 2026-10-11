import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { openJobWhere, parseJobRegion, regionWhere } from "@/lib/job-status";

export const dynamic = "force-dynamic";

/** 내 지역에 since 이후 올라온 모집중 급구 수. 알림 배지용입니다. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = parseJobRegion(url.searchParams.get("region"));
  if (!region) {
    return NextResponse.json({ error: "지역을 확인하세요." }, { status: 400 });
  }
  const sinceRaw = Number(url.searchParams.get("since"));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const since = new Date(Number.isFinite(sinceRaw) && sinceRaw > weekAgo ? sinceRaw : weekAgo);
  try {
    const count = await prisma.post.count({
      where: {
        AND: [
          { boardType: "JOBS", jobKind: "URGENT", hidden: false, isAttendanceThread: false },
          regionWhere(region),
          openJobWhere(),
          { createdAt: { gt: since } },
        ],
      },
    });
    return NextResponse.json({ region, count });
  } catch {
    return NextResponse.json({ region, count: 0 });
  }
}
