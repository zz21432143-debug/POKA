import Link from "next/link";
import { formatKstLabel } from "@/lib/dates";
import { SpadeIcon, CalendarDaysIcon } from "lucide-react";

export function GrowthHomePanel({
  today,
  hand,
  hub,
}: {
  today: string;
  hand: {
    id: string;
    title: string;
    isToday: boolean;
  } | null;
  hub: { id: string; title: string } | null;
}) {
  const handHref = hand ? `/posts/${hand.id}` : "/boards/hand-review";
  const weekHref = hub ? `/posts/${hub.id}` : "/boards/schedule";
  const handSpot = hand?.title.split("|").map((part) => part.trim()).at(-1) || hand?.title;
  const weekLabel = hub?.title.match(/\(([^)]+)\)/)?.[1] ?? hub?.title ?? "이번 주 일정";

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <article className="flex min-h-[8.25rem] min-w-0 flex-col rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <SpadeIcon className="size-4 shrink-0 text-primary" />
          {hand?.isToday ? "오늘의 홀덤 핸드" : "가장 최근 핸드리뷰"}
        </p>
        <h2 className="mt-2 text-sm font-semibold leading-snug break-keep sm:text-base">
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
        <Link
          href={hand ? handHref : "/boards/hand-review/write"}
          className="mt-auto pt-3 text-sm font-semibold text-primary"
        >
          {hand ? "투표하러 가기" : "오늘 핸드 올리기"}
        </Link>
      </article>

      <article className="flex min-h-[8.25rem] min-w-0 flex-col rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CalendarDaysIcon className="size-4 shrink-0 text-primary" />
          이번 주 홀덤 대회
        </p>
        <h2 className="mt-2 text-sm font-semibold leading-snug break-keep sm:text-base">
          {hub ? (
            <Link href={weekHref} className="hover:text-primary">
              {weekLabel}
            </Link>
          ) : (
            "주간 허브를 준비하고 있습니다"
          )}
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          달력에서 일자별로 이어집니다.
        </p>
        <Link href="/boards/schedule" className="mt-auto pt-3 text-sm font-semibold text-primary">
          달력 보기
        </Link>
      </article>
    </section>
  );
}
