import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { loadApplyChat } from "@/lib/job-chat";
import { parseJobRegion } from "@/lib/job-status";

export const dynamic = "force-dynamic";

/** 지원 딜러 오픈채팅: ?before=ISO(위로 더 보기) · ?after=ISO(새 공고) · ?region= */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const user = await getCurrentUser().catch(() => null);
  const date = (v: string | null) => {
    const t = v ? Date.parse(v) : NaN;
    return Number.isFinite(t) ? new Date(t) : null;
  };
  const messages = await loadApplyChat({
    region: parseJobRegion(q.get("region") ?? undefined),
    before: date(q.get("before")),
    after: date(q.get("after")),
    guest: !user,
  });
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
