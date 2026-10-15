import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { AdminNav } from "@/components/admin/admin-nav";
import { RARITY_LABEL, STAGE_EXP, YOKAI, YOKAI_ORDER, isSpecies, yokaiImage, type YokaiSpecies } from "@/lib/yokai";

export const metadata: Metadata = { title: "요괴 마을 통계", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0) || 0;

/** 요괴 마을 통계: 시작 요괴 · 요괴별 보유 · 최종 진화 · 전설 보유자 · 오늘 활동 · 포인트 쓴 곳 */
export default async function AdminYokaiPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const today = todayKstDate();
  const final = STAGE_EXP[4];
  const [pets, starters, perSpecies, legends, todayRow, bgRow] = await Promise.all([
    prisma.yokaiPet.count(),
    prisma.yokaiPet.groupBy({ by: ["species"], _count: { _all: true } }),
    prisma.$queryRaw<{ species: string; owners: bigint; finals: bigint }[]>`
      SELECT species, COUNT(*) AS owners, COUNT(*) FILTER (WHERE exp >= ${final}) AS finals FROM "YokaiOwned" GROUP BY species`,
    prisma.$queryRaw<{ nickname: string; species: string; at: Date }[]>`
      SELECT u.nickname, o.species, o."createdAt" AS at FROM "YokaiOwned" o JOIN "User" u ON u.id = o."userId"
      WHERE o.species IN ('gumiho', 'yeomra') ORDER BY o."createdAt" ASC LIMIT 50`,
    prisma.$queryRaw<{ fed: bigint; snacks: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE day = ${today} AND "fedToday" > 0) AS fed,
             COALESCE(SUM("snacksToday") FILTER (WHERE "snackDay" = ${today}), 0) AS snacks FROM "YokaiPet"`,
    prisma.$queryRaw<{ bought: bigint }[]>`SELECT COALESCE(SUM(GREATEST(json_array_length("bgOwnedJson"::json) - 1, 0)), 0) AS bought FROM "YokaiPet"`,
  ]);
  const owned = new Map(perSpecies.map((r) => [r.species, { owners: n(r.owners), finals: n(r.finals) }]));
  const totalOwned = perSpecies.reduce((a, r) => a + n(r.owners), 0);
  const stat = (label: string, value: string, sub?: string) => (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
  return (
    <div className="flex flex-col gap-4" data-admin-yokai>
      <header>
        <h1 className="text-2xl font-semibold">요괴 마을 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">요괴를 얻는 기준 숫자는 src/lib/yokai-achieve.ts(NEED · 아홉 꼬리)에서 바꿉니다. 많이 막히는 요괴가 있으면 기준을 낮춰 주세요.</p>
        <div className="mt-2">
          <AdminNav current="/admin/yokai" isMaster={user.isMaster} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("요괴를 고른 회원", `${pets.toLocaleString()}명`)}
        {stat("평균 도감", pets ? `${(totalOwned / pets).toFixed(1)}종` : "-", `전체 ${YOKAI_ORDER.length}종`)}
        {stat("오늘 밥 준 회원", `${n(todayRow[0]?.fed).toLocaleString()}명`, `간식 ${n(todayRow[0]?.snacks)}개 팔림`)}
        {stat("산 마을 배경", `${n(bgRow[0]?.bought).toLocaleString()}개`)}
      </section>

      <section className="grid gap-2">
        <h2 className="text-base font-bold">시작 요괴</h2>
        <div className="flex flex-wrap gap-2">
          {starters
            .filter((r) => isSpecies(r.species))
            .sort((a, b) => b._count._all - a._count._all)
            .map((r) => (
              <span key={r.species} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm">
                {YOKAI[r.species as YokaiSpecies].name} <b className="tabular-nums">{r._count._all}</b>명 ({pets ? Math.round((r._count._all / pets) * 100) : 0}%)
              </span>
            ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-base font-bold">요괴별 보유 · 최종 진화</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm" data-admin-yokai-table>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">요괴</th>
                <th>등급</th>
                <th className="text-right">가진 회원</th>
                <th className="text-right">비율</th>
                <th className="text-right">5단계</th>
                <th className="pl-4">얻는 방법</th>
              </tr>
            </thead>
            <tbody>
              {YOKAI_ORDER.map((s) => {
                const row = owned.get(s) ?? { owners: 0, finals: 0 };
                return (
                  <tr key={s} className="border-t border-white/5">
                    <td className="flex items-center gap-1.5 py-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 도트 그림 */}
                      <img src={yokaiImage(s, 1)} alt="" className="size-7 object-contain" />
                      {YOKAI[s].name}
                    </td>
                    <td className="text-xs">{RARITY_LABEL[YOKAI[s].rarity]}</td>
                    <td className="text-right tabular-nums">{row.owners}</td>
                    <td className="text-right tabular-nums">{pets ? `${Math.round((row.owners / pets) * 100)}%` : "-"}</td>
                    <td className="text-right tabular-nums">{row.finals}</td>
                    <td className="pl-4 text-xs text-muted-foreground">{YOKAI[s].how}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="text-base font-bold">전설 보유자</h2>
        {legends.length ? (
          <ul className="grid gap-1 text-sm">
            {legends.map((l) => (
              <li key={`${l.nickname}-${l.species}`}>
                {isSpecies(l.species) ? YOKAI[l.species].name : l.species} ·{" "}
                <Link href={`/u/${encodeURIComponent(l.nickname)}`} className="font-bold underline">
                  {l.nickname}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">{new Date(l.at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">아직 전설 요괴를 만난 회원이 없어요.</p>
        )}
      </section>
    </div>
  );
}
