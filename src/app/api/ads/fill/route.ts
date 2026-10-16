import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const PLACEMENTS = new Set(["post-top", "post-bottom", "board-bottom", "home-bottom", "home-top", "home-mid", "post-mid", "infeed", "sidebar", "a1", "a2", "a3"]);

/** 광고 칸이 실제로 채워졌는지(브라우저가 자리마다 하루 한 번 알려 줌) — 관리 화면 「실제 노출」 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { placement?: unknown; filled?: unknown };
  const placement = typeof body.placement === "string" ? body.placement : "";
  if (!PLACEMENTS.has(placement) || typeof body.filled !== "boolean") return NextResponse.json({ ok: false }, { status: 400 });
  const day = todayKstDate();
  const f = body.filled ? 1 : 0;
  await prisma.$executeRaw`INSERT INTO "AdFillStat" ("day", "placement", "filled", "unfilled") VALUES (${day}, ${placement}, ${f}, ${1 - f})
    ON CONFLICT ("day", "placement") DO UPDATE SET "filled" = "AdFillStat"."filled" + ${f}, "unfilled" = "AdFillStat"."unfilled" + ${1 - f}`.catch(() => undefined);
  return NextResponse.json({ ok: true });
}
