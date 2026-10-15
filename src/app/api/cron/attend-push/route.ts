import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { notifyAttend } from "@/lib/push";
import { EARLY_BIRD_EXP } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/**
 * 매일 밤 12시(KST, vercel.json crons) 출석 글이 열리면 「출석 1등 도전」 알림(켠 기기만 · 하루 한 번).
 * CRON_SECRET이 있으면 Vercel이 보내는 Authorization만 받음.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const day = todayKstDate();
  const mark = await prisma.toolSaved
    .createMany({
      data: [
        {
          id: `attendpush_${day}`,
          ownerId: "site",
          kind: "attend-push",
          name: day,
          dataJson: "{}",
        },
      ],
      skipDuplicates: true,
    })
    .catch(() => ({ count: 0 }));
  if (mark.count !== 1) return NextResponse.json({ ok: true, skipped: true });
  // 출석 글을 미리 열어 둠
  const { ensureTodayAttendancePost } = await import("@/lib/attendance");
  await ensureTodayAttendancePost().catch(() => undefined);
  const result = await notifyAttend({
    title: "🥇 출석 1등 도전!",
    body: `오늘 출석 글이 열렸어요. 1등 EXP +${EARLY_BIRD_EXP[0]} · 2등 +${EARLY_BIRD_EXP[1]} · 3등 +${EARLY_BIRD_EXP[2]}`,
    url: "/attendance?from=push",
  });
  await prisma.toolSaved
    .update({
      where: { id: `attendpush_${day}` },
      data: { dataJson: JSON.stringify(result) },
    })
    .catch(() => undefined);
  return NextResponse.json({ ok: true, ...result });
}
