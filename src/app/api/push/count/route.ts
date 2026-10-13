import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJobRegion } from "@/lib/job-status";
import { pushEnabled } from "@/lib/push";

export const dynamic = "force-dynamic";

/** 이 지역 급구 알림을 받는 기기 수(그 지역 + 전국). 급구 글쓰기 화면에 보여 줍니다. */
export async function GET(request: Request) {
  const region = parseJobRegion(new URL(request.url).searchParams.get("region"));
  if (!pushEnabled()) return NextResponse.json({ enabled: false, count: 0 });
  const count = await prisma.pushSubscription
    .count({ where: { region: { in: region ? [region, "전국"] : ["전국"] } } })
    .catch(() => 0);
  return NextResponse.json({ enabled: true, region, count }, { headers: { "Cache-Control": "no-store" } });
}
