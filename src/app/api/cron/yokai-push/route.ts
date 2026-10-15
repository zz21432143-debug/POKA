import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { notifyYokaiUser } from "@/lib/push";
import { YOKAI, cleanNow, fullnessNow, isSpecies } from "@/lib/yokai";
import { yokaiPublic } from "@/lib/yokai-server";

export const dynamic = "force-dynamic";

/**
 * 매일 저녁 7시(KST, vercel.json crons): 요괴 마을 알림을 켠 회원 중 키우는 요괴가 배고프거나(포만감 40 미만) 꼬질꼬질한(청결도 30 미만) 사람에게 한 번.
 * CRON_SECRET이 있으면 Vercel이 보내는 Authorization만 받음 · 하루 한 번만. 공개 전에는 마스터만.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const day = todayKstDate();
  const mark = await prisma.toolSaved
    .createMany({ data: [{ id: `yokaipush_${day}`, ownerId: "site", kind: "yokai-push", name: day, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (mark.count !== 1) return NextResponse.json({ ok: true, skipped: true });
  const subs = await prisma.pushSubscription.findMany({ where: { yokaiAlerts: true, userId: { not: null } }, select: { userId: true }, distinct: ["userId"], take: 5000 });
  const userIds = subs.map((s) => s.userId!).filter(Boolean);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds }, withdrawnAt: null, ...(yokaiPublic() ? {} : { isMaster: true }) }, select: { id: true } }) : [];
  let sent = 0;
  let hungry = 0;
  for (const u of users) {
    const pet = await prisma.yokaiPet.findUnique({ where: { userId: u.id }, select: { activeSpecies: true } });
    if (!pet || !isSpecies(pet.activeSpecies)) continue;
    const row = await prisma.yokaiOwned.findUnique({ where: { userId_species: { userId: u.id, species: pet.activeSpecies } } });
    if (!row) continue;
    const isHungry = fullnessNow(row.fullness, row.fullnessAt) < 40;
    const isDirty = cleanNow(row.clean, row.cleanAt) < 30;
    if (!isHungry && !isDirty) continue;
    hungry += 1;
    const name = YOKAI[pet.activeSpecies].name;
    const payload = isHungry
      ? { title: `🍙 ${name}가 배고파해요`, body: isDirty ? "배도 고프고 꼬질꼬질해요. 밥 주고 샤워시켜 주세요!" : "요괴 마을에 들러 밥을 주세요. 오늘 출석 · 퀴즈를 하면 밥이 더 생겨요!", url: "/yokai?from=push" }
      : { title: `🛁 ${name}가 꼬질꼬질해요`, body: "샤워시켜 주면 밥 경험치 보너스가 다시 붙어요!", url: "/yokai?from=push" };
    const r = await notifyYokaiUser(u.id, payload).catch(() => ({ sent: 0 }));
    sent += r.sent;
  }
  await prisma.toolSaved.update({ where: { id: `yokaipush_${day}` }, data: { dataJson: JSON.stringify({ users: users.length, hungry, sent }) } }).catch(() => undefined);
  return NextResponse.json({ ok: true, users: users.length, hungry, sent });
}
