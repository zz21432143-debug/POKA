import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ALL_REGIONS, JOB_REGIONS } from "@/lib/job-status";
import { pushEnabled } from "@/lib/push";
import { AdminNav } from "@/components/admin/admin-nav";
import { PushAdminActions } from "@/components/admin/push-admin-actions";

export const metadata: Metadata = { title: "알림 관리", robots: { index: false } };
export const dynamic = "force-dynamic";

function n(value: number) {
  return value.toLocaleString("ko-KR");
}

/** 급구 알림을 켠 기기 수(지역별) · 테스트 알림 · 공지 알림 보내기 */
export default async function AdminPushPage() {
  const user = await getCurrentUser();
  if (!user?.isMaster) notFound();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [byRegion, recent, members, mine, admins] = await Promise.all([
    prisma.pushSubscription.groupBy({ by: ["region"], _count: { _all: true } }),
    prisma.pushSubscription.count({ where: { region: { not: "" }, createdAt: { gte: weekAgo } } }),
    prisma.pushSubscription.count({ where: { region: { not: "" }, userId: { not: null } } }),
    prisma.pushSubscription.count({ where: { userId: user.id } }),
    prisma.pushSubscription.count({ where: { adminAlerts: true } }),
  ]);
  const count = new Map(byRegion.map((row) => [row.region, row._count._all]));
  const total = byRegion.filter((row) => row.region !== "").reduce((sum, row) => sum + row._count._all, 0);
  const nationwide = count.get(ALL_REGIONS) ?? 0;
  const rows = JOB_REGIONS.map((region) => ({ region, only: count.get(region) ?? 0, reach: (count.get(region) ?? 0) + nationwide }));

  const cards = [
    { label: "급구 알림 켠 기기", value: total, sub: `최근 7일 +${n(recent)}`, tone: "text-[#e7c98a]" },
    { label: "전국 알림", value: nationwide, sub: "모든 지역 급구를 받음", tone: "text-sky-300" },
    { label: "로그인한 회원 기기", value: members, sub: "나머지는 비회원 기기", tone: "text-emerald-300" },
    { label: "관리자 알림 기기", value: admins, sub: `내 기기 ${n(mine)}대`, tone: "text-rose-300" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">알림 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pushEnabled() ? "휴대폰 알림이 켜져 있습니다." : "알림 키가 없어 휴대폰 알림이 꺼져 있습니다(Vercel 환경변수 확인)."} 급구를 올리면 그 지역 + 전국 알림을 켠 기기로 바로 갑니다.
        </p>
        <div className="mt-2">
          <AdminNav current="/admin/push" isMaster />
        </div>
      </header>

      <section aria-label="요약" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <p className="text-sm font-semibold text-muted-foreground">{card.label}</p>
            <p data-push-stat={card.label} className={`mt-1 text-3xl font-black ${card.tone}`}>
              {n(card.value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </section>

      <PushAdminActions enabled={pushEnabled()} mine={mine} total={total} regions={rows.map((row) => ({ region: row.region, reach: row.reach }))} />

      <section aria-label="지역별" className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">지역별 급구 알림</h2>
        <p className="mt-1 text-xs text-muted-foreground">받는 수 = 그 지역을 고른 기기 + 전국 알림 기기. 급구를 올리면 이만큼 알림이 갑니다.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-semibold">지역</th>
                <th className="py-2 text-right font-semibold">지역 선택</th>
                <th className="py-2 text-right font-semibold">급구 올리면 받는 수</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.region} className="border-b border-border/50">
                  <td className="py-2 font-semibold">{row.region}</td>
                  <td className="py-2 text-right tabular-nums">{n(row.only)}</td>
                  <td className="py-2 text-right font-black text-[#e7c98a] tabular-nums">{n(row.reach)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
