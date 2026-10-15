import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { shiftDate, todayKstDate } from "@/lib/dates";
import { jobExpiresOn, openJobWhere } from "@/lib/job-status";
import { notifyUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/** 마감 며칠 전에 알릴지 */
const NOTICE_DAYS = 2;

/**
 * 매일 오전(KST, vercel.json crons): 이틀 뒤 자동 마감되는 구인 공고의 작성자에게
 * 「곧 마감돼요 · 끌어올리기/연장」 알림(공고마다 한 번 · 알림을 켠 기기만).
 * CRON_SECRET이 있으면 Vercel이 보내는 Authorization만 받음.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = todayKstDate();
  const target = shiftDate(today, NOTICE_DAYS);
  const rows = await prisma.post.findMany({
    where: {
      AND: [
        { boardType: "JOBS", hidden: false, isAttendanceThread: false, authorId: { not: null } },
        { NOT: { jobKind: "SEEKING" } },
        openJobWhere(new Date(), today),
      ],
    },
    select: { id: true, title: true, authorId: true, jobKind: true, jobFilled: true, jobAlwaysOpen: true, jobWorkDate: true, jobEndDate: true, jobDeadline: true, createdAt: true },
    take: 2000,
  });
  const due = rows.filter((p) => jobExpiresOn(p) === target);
  let sent = 0;
  for (const post of due) {
    // 공고마다 한 번만(같은 마감일)
    const mark = await prisma.toolSaved
      .createMany({
        data: [{ id: `jobexp_${post.id}_${target}`, ownerId: post.authorId!, kind: "job-expiry-push", name: target, dataJson: "{}" }],
        skipDuplicates: true,
      })
      .catch(() => ({ count: 0 }));
    if (mark.count !== 1) continue;
    const r = await notifyUser(post.authorId!, {
      title: "⏰ 공고가 곧 마감돼요",
      body: `「${post.title.slice(0, 40)}」 공고가 ${NOTICE_DAYS}일 뒤 자동 마감돼요. 아직 구하는 중이면 끌어올리거나 날짜를 고쳐 주세요.`,
      url: `/posts/${post.id}`,
    }).catch(() => ({ sent: 0 }));
    sent += r.sent ?? 0;
  }
  return NextResponse.json({ ok: true, target, due: due.length, sent });
}
