import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { listMyDrillRuns } from "@/lib/dealer-ranks";
import { formatDurationMs } from "@/lib/practice-format";
import { formatRelativeKst } from "@/lib/dates";

export const metadata: Metadata = {
  title: "딜러 연습",
  description: "사이드팟·미니멈 레이즈를 10문제로 연습하고 기록을 남깁니다.",
};

export const dynamic = "force-dynamic";

const GAMES = [
  {
    href: "/practice/side-pot",
    title: "사이드팟 계산",
    body: "올인 스택을 보고 메인팟과 사이드팟 금액을 맞춥니다.",
  },
  {
    href: "/practice/min-raise",
    title: "미니멈 레이즈",
    body: "노리밋 홀덤에서 다음 레이즈 총액을 계산합니다.",
  },
] as const;

const KIND_LABEL: Record<string, string> = {
  SIDE_POT: "사이드팟",
  MIN_RAISE: "미니멈 레이즈",
};

export default async function PracticeHubPage() {
  const user = await getCurrentUser().catch(() => null);
  const recent = user ? await listMyDrillRuns(user.id) : [];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold">딜러 연습</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          실전 금액이 아닙니다. 홀덤 딜러가 테이블에서 쓰는 계산만 반복합니다. 비회원도 플레이할 수
          있고, 로그인하면 기록과 순위가 남습니다.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {GAMES.map((game) => (
          <li key={game.href}>
            <Link
              href={game.href}
              className="touch-target flex min-h-28 flex-col rounded-2xl border border-border bg-[#1a1617] px-4 py-4 shadow-sm hover:border-primary/40"
            >
              <span className="text-base font-semibold">{game.title}</span>
              <span className="mt-1 text-sm text-muted-foreground">{game.body}</span>
              <span className="mt-3 text-sm font-medium text-primary">10문제 시작</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/practice/ranks"
        className="touch-target flex min-h-14 items-center justify-between rounded-2xl border border-border bg-[#07150f] px-4 py-3 text-white"
      >
        <span className="text-sm font-semibold">기록 · 순위</span>
        <span className="text-xs text-emerald-200">최고 점수 1인 1기록</span>
      </Link>
      {user && recent.length > 0 ? (
        <section className="rounded-2xl border border-border bg-[#1a1617] p-4 shadow-sm">
          <h2 className="text-sm font-semibold">내 최근 기록</h2>
          <ul className="mt-2 divide-y divide-border">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>{KIND_LABEL[row.kind] ?? row.kind}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.correct}/{row.total} · {formatDurationMs(row.durationMs)} ·{" "}
                  {formatRelativeKst(row.createdAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!user ? (
        <p className="text-sm text-muted-foreground">
          게스트도 연습할 수 있습니다. 순위에 이름을 올리려면 로그인하세요.
        </p>
      ) : null}
    </div>
  );
}
