import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { ContentPlanPublisher, type PublishItem } from "@/components/admin/content-plan-publisher";
import { CONTENT_PLAN, scheduleSummary, type ScheduleRow } from "@/lib/content-plan";
import { normalizeHandTitle } from "@/lib/holdem-only";
import { shiftDate, todayKstDate, weekStartKst } from "@/lib/dates";

export const metadata: Metadata = { title: "콘텐츠 발행", robots: { index: false } };

export const dynamic = "force-dynamic";

function overlaps(row: ScheduleRow, start: string, end: string) {
  if (!row.eventDate) return false;
  return row.eventDate <= end && (row.eventEndDate || row.eventDate) >= start;
}

/** 1주일 콘텐츠(14개)를 POKA 계정으로 올리는 화면. 마스터 계정만 씁니다. */
export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user?.isMaster) notFound();

  const monday = weekStartKst(todayKstDate());
  const sunday = shiftDate(monday, 6);
  const saturday = shiftDate(monday, 5);
  const titles = CONTENT_PLAN.map((item) => (item.boardType === "HAND_REVIEW" ? normalizeHandTitle(item.title) : item.title));
  const [events, published] = await Promise.all([
    prisma.post.findMany({
      where: { boardType: "SCHEDULE", hidden: false, eventDate: { not: null, lte: sunday } },
      select: { id: true, title: true, eventDate: true, eventEndDate: true, promoLocation: true, eventPrize: true },
      orderBy: { eventDate: "asc" },
      take: 200,
    }),
    prisma.post.findMany({
      where: { authorId: user.id, hidden: false, title: { in: titles } },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const doneByTitle = new Map(published.map((row) => [row.title, row.id]));

  const items: PublishItem[] = CONTENT_PLAN.map((item, index) => {
    let content = item.content;
    let note: string | null = null;
    if (item.schedule) {
      const rows = events.filter((row) =>
        item.schedule === "week" ? overlaps(row, monday, sunday) : overlaps(row, saturday, sunday),
      );
      const text = scheduleSummary(rows, item.schedule);
      content = text ?? "";
      note = text
        ? `대회 캘린더의 ${item.schedule === "week" ? "이번 주" : "이번 주말"} 일정 ${rows.length}개로 채웠습니다.`
        : `대회 캘린더에 ${item.schedule === "week" ? "이번 주" : "이번 주말"} 일정이 없습니다. 먼저 대회 캘린더에 일정을 올려 주세요.`;
    }
    return {
      id: item.id,
      order: index + 1,
      day: item.day,
      time: item.time,
      kind: item.kind,
      boardType: item.boardType,
      boardLabel: item.boardLabel,
      title: item.title,
      content,
      hand: item.hand ?? null,
      photos: Boolean(item.photos),
      manualHand: Boolean(item.manualHand),
      note,
      publishedId: doneByTitle.get(titles[index]) ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">콘텐츠 발행</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          1주일 콘텐츠 14개를 POKA 계정으로 올립니다. 요일·시간에 맞춰 하나씩 올리거나, 준비된 글을 한 번에 올릴 수 있습니다.
          올리기 전에 제목과 본문을 고칠 수 있습니다. 〔 〕가 남아 있는 글은 실제 내용(사진·결과)을 채워야 올라갑니다.
        </p>
        <div className="mt-2">
          <AdminNav current="/admin/content" isMaster />
        </div>
      </header>
      <ContentPlanPublisher items={items} />
    </div>
  );
}
