import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { listServerErrors } from "@/lib/error-watch";
import { ensurePointLedger } from "@/lib/point-ledger";

export const metadata: Metadata = { title: "오류 · 이상 감시", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 하루에 정상적으로 받을 수 있는 포인트(출석 195 + 연속 최대 520 + 활동 700 + 미션 130 + 주간 390 + 퀴즈 · 채택 등)를 넘으면 의심 */
const SUSPECT_DAY = 2200;
/** 하루 포인트 받은 횟수가 이보다 많으면 의심(글 · 댓글 도배 등) */
const SUSPECT_COUNT = 60;

type GainRow = { userId: string; nickname: string; total: bigint; n: bigint; reasons: string };

/** 관리자: 서버 오류 기록 · 최근 24시간 포인트를 많이 받은 회원 */
export default async function AdminErrorsPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  await ensurePointLedger().catch(() => undefined);
  const [errors, gains] = await Promise.all([
    listServerErrors(100),
    prisma.$queryRaw<GainRow[]>`
      SELECT l."userId", COALESCE(u.nickname, '(탈퇴)') AS nickname, SUM(l.delta) AS total, COUNT(*) AS n,
             STRING_AGG(DISTINCT l.reason, ', ') AS reasons
      FROM "PointLedger" l LEFT JOIN "User" u ON u.id = l."userId"
      WHERE l."createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours' AND l.delta > 0
      GROUP BY l."userId", u.nickname
      ORDER BY total DESC
      LIMIT 20
    `.catch(() => [] as GainRow[]),
  ]);
  const suspects = gains.filter((g) => Number(g.total) > SUSPECT_DAY || Number(g.n) > SUSPECT_COUNT);
  const day = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-4" data-admin-errors>
      <header>
        <h1 className="text-2xl font-semibold">오류 · 이상 감시</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          서버 오류가 나면 여기에 쌓이고, 관리자 알림을 켠 기기로 알림이 가요(30분에 한 번까지). 포인트를 비정상적으로 많이 받은 회원도 함께 보여 줘요.
        </p>
      </header>

      <section className="grid gap-2" data-admin-suspects>
        <h2 className="text-base font-bold">
          포인트 이상 감시 <span className="text-sm font-normal text-muted-foreground">최근 24시간 · 하루 {SUSPECT_DAY.toLocaleString()}P 넘게 또는 {SUSPECT_COUNT}번 넘게 받으면 의심</span>
        </h2>
        {suspects.length ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200">⚠️ 의심 회원 {suspects.length}명이 있어요. 아래 빨간 줄을 확인해 주세요.</p>
        ) : (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">✅ 이상한 포인트 흐름이 없어요.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">회원</th>
                <th className="text-right">받은 포인트</th>
                <th className="text-right">횟수</th>
                <th className="pl-4">어디서</th>
              </tr>
            </thead>
            <tbody>
              {gains.map((g) => {
                const bad = Number(g.total) > SUSPECT_DAY || Number(g.n) > SUSPECT_COUNT;
                return (
                  <tr key={g.userId} data-suspect={bad ? "1" : "0"} className={bad ? "border-t border-rose-500/30 bg-rose-500/10" : "border-t border-white/5"}>
                    <td className="py-1.5">
                      <Link href={`/u/${encodeURIComponent(g.nickname)}`} className="font-bold underline">
                        {g.nickname}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{Number(g.total).toLocaleString()}P</td>
                    <td className="text-right tabular-nums">{Number(g.n)}</td>
                    <td className="pl-4 text-xs text-muted-foreground">{g.reasons}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!gains.length ? <p className="py-2 text-sm text-muted-foreground">최근 24시간 포인트 기록이 없어요.</p> : null}
        </div>
      </section>

      <section className="grid gap-2" data-admin-error-list>
        <h2 className="text-base font-bold">
          서버 오류 <span className="text-sm font-normal text-muted-foreground">최근 30일 · 같은 오류는 10분에 한 번만 기록</span>
        </h2>
        {errors.length ? (
          <ul className="grid gap-1.5">
            {errors.map((e) => (
              <li key={e.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">{day(e.at)}</span>
                  <span className="rounded bg-white/10 px-1.5 font-mono">{e.method}</span>
                  <span className="font-mono text-zinc-200">{e.path}</span>
                  {e.digest ? <span className="font-mono">#{e.digest}</span> : null}
                </div>
                <p className="mt-1 break-all font-mono text-xs text-rose-200">{e.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">✅ 기록된 서버 오류가 없어요.</p>
        )}
      </section>
    </div>
  );
}
