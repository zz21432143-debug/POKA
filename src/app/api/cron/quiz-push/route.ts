import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { getQuiz } from "@/lib/quiz-server";
import { KIND_LABEL } from "@/lib/quiz";
import { notifyQuiz } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * 매일 아침 9시(KST, vercel.json crons) 오늘의 퀴즈 알림.
 * CRON_SECRET이 있으면 Vercel이 보내는 Authorization만 받음 · 하루 한 번만 보냄.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const day = todayKstDate();
  // 이미 보낸 날이면 건너뜀(id 고정이라 두 번 만들어지지 않음)
  const mark = await prisma.toolSaved
    .createMany({ data: [{ id: `quizpush_${day}`, ownerId: "site", kind: "quiz-push", name: day, dataJson: "{}" }], skipDuplicates: true })
    .catch(() => ({ count: 0 }));
  if (mark.count !== 1) return NextResponse.json({ ok: true, skipped: true });
  const quiz = await getQuiz(day).catch(() => null);
  if (!quiz) return NextResponse.json({ ok: false, error: "no quiz" });
  const result = await notifyQuiz({
    title: `🧩 오늘의 퀴즈 · ${KIND_LABEL[quiz.kind]}`,
    body: `${quiz.question.slice(0, 80)} — 맞히면 +10P!`,
    url: "/quiz?from=push",
  });
  await prisma.toolSaved.update({ where: { id: `quizpush_${day}` }, data: { dataJson: JSON.stringify(result) } }).catch(() => undefined);
  return NextResponse.json({ ok: true, ...result });
}
