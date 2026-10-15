import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { RARITY_LABEL, STAGE_EXP, YOKAI, YOKAI_ORDER, isSpecies, yokaiImage, type YokaiSpecies } from "@/lib/yokai";

export const metadata: Metadata = { title: "요괴 마을 통계", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0) || 0;

/** 등급별 적정 보유율(요괴를 고른 회원 중 몇 %가 가지면 좋은지) */
const TARGET: Record<string, [number, number] | null> = { starter: null, common: [40, 95], rare: [10, 60], hero: [2, 25], legend: [0, 8] };
/** 판정은 회원 MIN_PETS명 · MIN_DAYS일 이상 쌓인 뒤에 */
const MIN_PETS = 20;
const MIN_DAYS = 7;

function verdict(rarity: string, pct: number, ready: boolean) {
  const t = TARGET[rarity];
  if (!t) return { text: "-", tone: "text-muted-foreground" };
  if (!ready) return { text: "데이터 모으는 중", tone: "text-muted-foreground" };
  if (pct < t[0]) return { text: "너무 어려움 → 기준 낮추기", tone: "text-rose-300" };
  if (pct > t[1]) return { text: "너무 쉬움 → 기준 올리기", tone: "text-amber-300" };
  return { text: "적절", tone: "text-emerald-300" };
}

/** 요괴 마을 통계: 시작 요괴 · 요괴별 보유 · 최종 진화 · 전설 보유자 · 오늘 활동 · 포인트 쓴 곳 */
export default async function AdminYokaiPage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const today = todayKstDate();
  const final = STAGE_EXP[4];
  const [pets, starters, perSpecies, legends, todayRow, bgRow, first] = await Promise.all([
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
    // 오픈 며칠째(첫 요괴를 고른 날부터 · DB 시각은 UTC)
    prisma.$queryRaw<{ days: number | null }[]>`SELECT FLOOR(EXTRACT(EPOCH FROM ((now() AT TIME ZONE 'UTC') - MIN("createdAt"))) / 86400) AS days FROM "YokaiPet"`,
  ]);
  const days = n(first[0]?.days);
  const ready = pets >= MIN_PETS && days >= MIN_DAYS;
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
        <h2 className="text-base font-bold">요괴별 보유 · 최종 진화 · 판정</h2>
        <p className="text-xs text-muted-foreground">
          적정 보유율: 일반 40~95% · 희귀 10~60% · 영웅 2~25% · 전설 0~8%. {ready ? `오픈 ${days}일째 · ${pets}명 기준으로 판정했어요.` : `회원 ${MIN_PETS}명 · ${MIN_DAYS}일이 쌓이면 판정해요(지금 ${pets}명 · ${days}일).`}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" data-admin-yokai-table>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">요괴</th>
                <th>등급</th>
                <th className="text-right">가진 회원</th>
                <th className="text-right">비율</th>
                <th className="text-right">5단계</th>
                <th className="pl-3">판정</th>
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
                    {(() => {
                      const v = verdict(YOKAI[s].rarity, pets ? (row.owners / pets) * 100 : 0, ready);
                      return (
                        <td data-verdict={s} className={`pl-3 text-xs font-bold ${v.tone}`}>
                          {v.text}
                        </td>
                      );
                    })()}
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
