import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { todayKstDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** 홀덤 공부 도구를 쓴 날 기록(로그인 회원 · 하루 한 줄). 요괴 마을 「텐구」 조건 */
export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false });
  const day = todayKstDate();
  await prisma.toolSaved
    .createMany({ data: [{ id: `study_${user.id}_${day}`, ownerId: user.id, kind: "study-day", name: day, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => undefined);
  return NextResponse.json({ ok: true });
}
