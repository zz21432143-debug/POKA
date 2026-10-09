import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { DRILL_KINDS, listDrillRanks, listMyDrillRuns, type DrillKind } from "@/lib/dealer-ranks";
import { formatDurationMs } from "@/lib/practice-format";
import { formatRelativeKst } from "@/lib/dates";

export const metadata: Metadata = {
  title: "딜러 연습 순위 — POKA",
  description: "사이드팟·미니멈 레이즈 연습의 최고 기록 순위입니다.",
};

export const dynamic = "force-dynamic";

function RankTable({
  title,
  href,
  rows,
}: {
  title: string;
  href: string;
  rows: Awaited<ReturnType<typeof listDrillRanks>>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-primary">
          연습
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">아직 기록이 없습니다.</p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{index + 1}</span>
              <Link href={`/u/${encodeURIComponent(row.user.nickname)}`} className="min-w-0 flex-1 truncate font-medium">
                {row.user.nickname}
                {row.user.isDealerVerified ? (
                  <span className="ml-1 text-xs font-normal text-amber-700">인증</span>
                ) : null}
              </Link>
              <span className="shrink-0 tabular-nums">
                {row.correct}/{row.total}
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                {formatDurationMs(row.durationMs)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function PracticeRanksPage() {
  const user = await getCurrentUser().catch(() => null);
  const kinds = Object.keys(DRILL_KINDS) as DrillKind[];
  const [side, raise, mine] = await Promise.all([
    listDrillRanks("SIDE_POT"),
    listDrillRanks("MIN_RAISE"),
    user ? listMyDrillRuns(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm">
          <Link href="/practice" className="text-muted-foreground hover:text-foreground">
            딜러 연습
          </Link>
          <span className="mx-1 text-muted-foreground">/</span>
          기록 · 순위
        </p>
        <h1 className="mt-2 text-2xl font-semibold">기록 · 순위</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회원별 최고 기록 한 줄입니다. 맞힌 수가 같으면 더 빠른 기록이 위입니다.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {kinds.map((kind) => (
          <RankTable
            key={kind}
            title={DRILL_KINDS[kind]}
            href={kind === "SIDE_POT" ? "/practice/side-pot" : "/practice/min-raise"}
            rows={kind === "SIDE_POT" ? side : raise}
          />
        ))}
      </div>
      {user ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">내 기록</h2>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">아직 저장한 판이 없습니다.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {mine.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{DRILL_KINDS[row.kind as DrillKind] ?? row.kind}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.correct}/{row.total} · {formatDurationMs(row.durationMs)} ·{" "}
                    {formatRelativeKst(row.createdAt.toISOString())}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          내 기록을 보려면{" "}
          <Link href="/login" className="font-medium text-primary underline">
            로그인
          </Link>
          하세요.
        </p>
      )}
    </div>
  );
}
