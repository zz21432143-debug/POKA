import Link from "next/link";
import { CopyTextButton } from "@/components/growth/copy-text-button";
import { kakaoDailyHeadline, kakaoDailyLines } from "@/lib/growth";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";
import { formatKstLabel } from "@/lib/dates";
import { MarkImage } from "@/components/layout/mark-image";
import { SpadeIcon, CalendarDaysIcon, UsersIcon } from "lucide-react";

export function GrowthHomePanel({
  today,
  hand,
  hub,
  dealers,
}: {
  today: string;
  hand: {
    id: string;
    title: string;
    isToday: boolean;
  } | null;
  hub: { id: string; title: string } | null;
  dealers: {
    nickname: string;
    isDealerVerified: boolean;
    weeklyOk: boolean;
    weeklyOpsPosts: number;
    profileMarkImageUrl: string | null;
  }[];
}) {
  const handHref = hand ? `/posts/${hand.id}` : "/boards/hand-review";
  const weekHref = hub ? `/posts/${hub.id}` : "/boards/schedule";
  const lines = kakaoDailyLines({ today });
  const headline = kakaoDailyHeadline(today);
  const handSpot = hand?.title.split("|").map((part) => part.trim()).at(-1) || hand?.title;

  return (
    <section className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <SpadeIcon className="size-4 shrink-0 text-primary" />
            {hand?.isToday ? "오늘의 홀덤 핸드" : "가장 최근 핸드리뷰"}
          </p>
          <h2 className="mt-2 text-base font-semibold leading-snug break-keep">
            {hand ? (
              <Link href={handHref} className="hover:text-primary" title={hand.title}>
                {handSpot}
              </Link>
            ) : (
              "아직 오늘의 핸드가 없습니다"
            )}
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {formatKstLabel(today)} · Fold/Check/Call/Raise 투표는 글에서.
          </p>
          <Link href="/boards/hand-review/write" className="mt-3 inline-flex text-sm font-semibold text-primary">
            오늘 핸드 올리기
          </Link>
        </article>

        <article className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CalendarDaysIcon className="size-4 shrink-0 text-primary" />
            이번 주 홀덤 대회
          </p>
          <h2 className="mt-2 text-base font-semibold leading-snug break-keep">
            {hub ? (
              <Link href={weekHref} className="hover:text-primary">
                {hub.title.match(/\(([^)]+)\)/)?.[1] ?? hub.title}
              </Link>
            ) : (
              "주간 허브를 준비하고 있습니다"
            )}
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            홀덤 토너먼트만 모았습니다. 달력은 대회 스케줄에서 이어집니다.
          </p>
          <Link href="/boards/schedule" className="mt-3 inline-flex text-sm font-semibold text-primary">
            달력 보기
          </Link>
        </article>

        <article className="min-w-0 rounded-2xl border border-[#FEE500] bg-[#FEE500]/30 p-4 shadow-sm">
          <p className="text-xs font-semibold text-[#191919]/70">오픈채팅에 붙일 세 줄</p>
          <p className="mt-1 text-[11px] text-[#191919]/60">{headline}</p>
          <ol className="mt-2 space-y-1.5 font-sans text-sm leading-6 text-[#191919]">
            {lines.split("\n").map((line) => (
              <li key={line} className="truncate tabular-nums">
                {line}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyTextButton text={`${headline}\n${lines}`} label="세 줄 복사" />
            <a
              href={KAKAO_OPEN_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#191919] underline-offset-2 hover:underline"
            >
              오픈채팅 열기
            </a>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <UsersIcon className="size-4 text-primary" />
              인증 딜러 운영팀
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              골드 뱃지는 주 1회 핸드리뷰 또는 현장 스케치를 올리면 유지됩니다. 홀덤만.
            </p>
          </div>
          <Link href="/info/dealers" className="text-sm font-semibold text-primary">
            운영 규칙
          </Link>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {dealers.map((dealer) => (
            <li key={dealer.nickname}>
              <Link
                href={`/u/${encodeURIComponent(dealer.nickname)}`}
                className="touch-target flex min-h-14 items-center gap-2 rounded-xl border border-border px-2 py-2 hover:border-primary/40"
              >
                <MarkImage src={dealer.profileMarkImageUrl} alt="" size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{dealer.nickname}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {dealer.weeklyOk ? `이번 주 ${dealer.weeklyOpsPosts}편` : "이번 주 미작성"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
