import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ContentPlanPublisher, type PublishItem } from "@/components/admin/content-plan-publisher";
import { CONTENT_PLAN, EXTRA_PLAN, scheduleSummary, type ScheduleRow } from "@/lib/content-plan";

const PLAN = [...CONTENT_PLAN, ...EXTRA_PLAN];
import { normalizeHandTitle } from "@/lib/holdem-only";
import { shiftDate, todayKstDate, weekStartKst } from "@/lib/dates";

export const metadata: Metadata = { title: "콘텐츠 발행", robots: { index: false } };

export const dynamic = "force-dynamic";

/** "2026-10-19" → "10/19" */
function md(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d}`;
}

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
  // 대회 일정 요약 글은 매주 새로 올리므로 제목에 날짜를 붙입니다(지난주 글과 따로 셈).
  const weekLabel = (item: (typeof PLAN)[number]) =>
    item.schedule === "week" ? `${md(monday)}~${md(sunday)}` : `${md(saturday)}~${md(sunday)}`;
  const titles = PLAN.map((item) =>
    item.boardType === "HAND_REVIEW" ? normalizeHandTitle(item.title) : item.schedule ? `${item.title} · ${weekLabel(item)}` : item.title,
  );
  const weekStart = new Date(`${monday}T00:00:00+09:00`);
  const [events, published, skips] = await Promise.all([
    prisma.post.findMany({
      where: { boardType: "SCHEDULE", hidden: false, eventDate: { not: null, lte: sunday } },
      select: { id: true, title: true, eventDate: true, eventEndDate: true, promoLocation: true, eventPrize: true },
      orderBy: { eventDate: "asc" },
      take: 200,
    }),
    prisma.post.findMany({
      where: {
        authorId: user.id,
        hidden: false,
        OR: [
          { title: { in: [...titles, ...PLAN.flatMap((item) => item.oldTitles ?? [])] } },
          // 이번 주에 날짜 없이 올린 예전 대회 요약 글도 '올림'으로 셈
          ...PLAN.filter((item) => item.schedule).map((item) => ({ title: { startsWith: item.title }, createdAt: { gte: weekStart } })),
        ],
      },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentPlanSkip.findMany({ select: { planId: true } }),
  ]);
  const skipped = new Set(skips.map((row) => row.planId));
  const doneByTitle = new Map(published.map((row) => [row.title, row]));

  // 핸드 투표 결과(해설 글에 자동으로 채움)
  const pollPlanIds = [...new Set(PLAN.flatMap((item) => item.pollSummary?.map((ref) => ref.plan) ?? []))];
  const pollPostIds = Object.fromEntries(
    pollPlanIds.map((planId) => {
      const index = PLAN.findIndex((item) => item.id === planId);
      return [planId, index >= 0 ? (doneByTitle.get(titles[index])?.id ?? null) : null];
    }),
  ) as Record<string, string | null>;
  const voteRows = await prisma.handPollVote.groupBy({
    by: ["postId", "choice"],
    where: { postId: { in: Object.values(pollPostIds).filter((id): id is string => Boolean(id)) } },
    _count: { _all: true },
  });
  function voteLine(ref: NonNullable<(typeof PLAN)[number]["pollSummary"]>[number]) {
    const postId = pollPostIds[ref.plan];
    if (!postId) return "투표: (핸드리뷰 글이 아직 올라가지 않았어요)";
    const counts = Object.fromEntries(voteRows.filter((row) => row.postId === postId).map((row) => [row.choice, row._count._all]));
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (total === 0) return "투표: 아직 참여한 분이 없어요. 지금이라도 투표해 주세요!";
    const parts = ref.choices.map(([id, label]) => `${label} ${Math.round(((counts[id] ?? 0) / total) * 100)}%`);
    return `투표: ${parts.join(" / ")} (${total}명 참여)`;
  }

  const items: PublishItem[] = PLAN.map((item, index) => {
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
    if (item.pollSummary) {
      for (const ref of item.pollSummary) content = content.replace(`{{투표:${ref.plan}}}`, voteLine(ref));
      note = "핸드리뷰 글의 실제 투표 결과로 채웠습니다.";
    }
    // 새 제목으로 올린 글이 없으면 예전 제목으로 올린 글을 찾습니다(→ '새 내용으로 고치기').
    const done = item.schedule
      ? published.find((row) => row.title.startsWith(item.title) && row.createdAt >= weekStart)
      : (doneByTitle.get(titles[index]) ?? (item.oldTitles ?? []).map((t) => doneByTitle.get(t)).find(Boolean));
    return {
      id: item.id,
      order: index + 1,
      day: item.day,
      time: item.time,
      kind: item.kind,
      boardType: item.boardType,
      boardLabel: item.boardLabel,
      title: item.schedule ? titles[index] : item.title,
      content,
      hand: item.hand ?? null,
      photos: Boolean(item.photos),
      manualHand: Boolean(item.manualHand),
      note,
      publishedId: done?.id ?? null,
      // 올린 글이 지금 계획 글과 다르면(제목·본문을 고친 경우) 고치기 버튼을 보여 줍니다. 대회 일정 요약 글은 매주 바뀌므로 빼요.
      stale: Boolean(done && !item.schedule && !item.pollSummary && (done.title !== titles[index] || done.content !== content)),
      skipped: skipped.has(item.id),
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
      </header>
      <ContentPlanPublisher items={items} />
    </div>
  );
}
