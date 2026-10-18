import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { RegionUrgentAlert } from "@/components/jobs/region-urgent-alert";
import { JOB_REGIONS, parseJobRegion } from "@/lib/job-status";
import { JOB_KINDS, resolveJobKind } from "@/lib/nav";
import { cn } from "cn";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { getCurrentUser } from "@/lib/current-user";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { ApplyChat } from "@/components/jobs/apply-chat";
import { loadApplyChat } from "@/lib/job-chat";
import { JobChatSide } from "@/components/jobs/job-chat-side";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ region?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) return { title: "구인구직" };
  const region = parseJobRegion((await searchParams).region);
  if (region) {
    return { title: `${region} ${job.title} · 구인구직`, description: `${region} 지역 ${job.blurb}` };
  }
  return { title: `${job.title} · 구인구직`, description: job.blurb };
}

export default async function JobBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: SearchParams;
}) {
  const { kind } = await params;
  const job = resolveJobKind(kind);
  if (!job) notFound();
  const query = await searchParams;
  const region = parseJobRegion(query.region);
  // 비로그인은 제목만 보이게 조건·주소 등을 빼고 내려보냅니다.
  const viewer = await getCurrentUser().catch(() => null);
  const guest = !viewer;
  // 모든 구인: 카카오톡 오픈채팅처럼(공고 = 말풍선 · 최신이 맨 아래 · 붙여넣어 바로 올리기). 예전 목록 보기(?view=list)는 없앰
  const slug = Object.entries(JOB_KINDS).find(([, v]) => v.kind === job.kind)?.[0] ?? kind;
  const chatMessages = await loadApplyChat({ kind: job.kind, region, guest });
  const writeHref = `/boards/jobs/${kind}/write`;

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <BoardTitle sticker={BOARD_STICKER[kind] ?? BOARD_STICKER.jobs}>{region ? `${region} ${job.title}` : job.title}</BoardTitle>
          <p className="mt-1 text-sm">카톡 공고를 붙여넣으면 바로 올라가요 · 연락처는 로그인 후</p>
        </div>
      </header>
      {job.kind === "URGENT" ? <RegionUrgentAlert /> : null}
      {(
        <div className="mx-auto grid w-full max-w-[720px] items-start gap-4 xl:max-w-[1016px] xl:grid-cols-[minmax(0,720px)_280px]">
        <div className="flex min-w-0 flex-col gap-3">
          <nav aria-label="지역" className="card-scroller -mx-1 overflow-x-auto px-1">
            <ul className="flex w-max gap-1.5">
              {[null, ...JOB_REGIONS].map((r) => (
                <li key={r ?? "all"}>
                  <Link
                    href={r ? `/boards/jobs/${slug}?region=${encodeURIComponent(r)}` : `/boards/jobs/${slug}`}
                    className={cn("touch-target inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-bold", (r ?? null) === region ? "border-[#fee500] bg-[#fee500] text-[#1d1d1d]" : "border-white/15 text-zinc-300")}
                  >
                    {r ?? "전국"}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ApplyChat key={`${slug}-${region ?? "all"}`} kind={job.kind} slug={slug} title={job.title} initial={chatMessages} region={region} loggedIn={!guest} myNickname={viewer?.nickname ?? null} />
          <Link href={writeHref} className="self-center text-sm font-bold text-zinc-400 underline">
            양식으로 자세히 쓰기({job.cta})
          </Link>
        </div>
        <JobChatSide region={region} slug={slug} loggedIn={!guest} />
        </div>
      )}
      <BoardBottomAd />
    </div>
  );
}
