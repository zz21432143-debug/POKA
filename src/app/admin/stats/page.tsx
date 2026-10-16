import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { loadSiteStats } from "@/lib/site-stats";
import { SHARE_TOOLS, shareStats, type ShareTool } from "@/lib/share-stats";
import { formatKstLabel, shiftDate, todayKstDate } from "@/lib/dates";
import { trafficSummary } from "@/lib/traffic";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "방문 · 가입 통계", robots: { index: false } };

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;

/** "2026-10-12" → "10/12 (월)" */
function shortDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const week = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d} (${week})`;
}

function n(value: number) {
  return value.toLocaleString("ko-KR");
}

/** 방문자 수 · 회원가입 · 회원탈퇴: 오늘, 누적, 일별 */
export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const { days: daysParam } = await searchParams;
  const range = RANGES.find((value) => String(value) === daysParam) ?? 30;
  const since = new Date(`${shiftDate(todayKstDate(), -(range - 1))}T00:00:00+09:00`);
  const [stats, shares, traffic, invites] = await Promise.all([
    loadSiteStats(range),
    shareStats(range),
    trafficSummary(range),
    prisma.toolSaved.groupBy({ by: ["name"], where: { kind: "invite", createdAt: { gte: since } }, _count: { _all: true } }).catch(() => []),
  ]);
  const inviteCount = (name: string) => invites.find((r) => r.name === name)?._count._all ?? 0;
  const shareRows = (Object.keys(SHARE_TOOLS) as ShareTool[]).map((k) => ({ key: k, label: SHARE_TOOLS[k], ...shares[k] })).sort((a, b) => b.total - a.total);
  const maxVisitors = Math.max(1, ...stats.days.map((row) => row.visitors));
  const sum = (key: "visitors" | "signups" | "withdrawals") => stats.days.reduce((total, row) => total + row[key], 0);

  const cards = [
    { label: "오늘 방문자", value: stats.today.visitors, sub: `누적 ${n(stats.totals.visitors)}`, tone: "text-sky-300" },
    { label: "오늘 회원가입", value: stats.today.signups, sub: `누적 ${n(stats.totals.signups)}`, tone: "text-emerald-300" },
    { label: "오늘 회원탈퇴", value: stats.today.withdrawals, sub: `누적 ${n(stats.totals.withdrawals)}`, tone: "text-rose-300" },
    { label: "현재 회원 수", value: stats.totals.members, sub: "가입 누적 − 탈퇴 누적", tone: "text-[#e7c98a]" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">방문 · 가입 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          날짜는 한국 시간 기준입니다. 방문자는 같은 브라우저를 하루 1명으로 셉니다(검색 로봇 제외).
          {stats.totals.firstVisitDay ? ` 방문자 집계 시작일: ${formatKstLabel(stats.totals.firstVisitDay)}.` : " 방문자 집계는 이번 업데이트부터 시작됩니다."}
        </p>
      </header>

      <section aria-label="요약" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <p className="text-sm font-semibold text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-3xl font-black ${card.tone}`}>{n(card.value)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </section>

      <section aria-label="일별 통계" className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">일별</h2>
          <nav className="flex gap-1.5" aria-label="기간">
            {RANGES.map((value) => (
              <Link
                key={value}
                href={`/admin/stats?days=${value}`}
                aria-current={value === range ? "page" : undefined}
                className={
                  value === range
                    ? "inline-flex min-h-10 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
                    : "inline-flex min-h-10 items-center rounded-full border border-border px-3 text-sm font-semibold hover:bg-muted"
                }
              >
                최근 {value}일
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          최근 {range}일 합계: 방문 {n(sum("visitors"))} · 가입 {n(sum("signups"))} · 탈퇴 {n(sum("withdrawals"))}
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">날짜</th>
                <th className="py-2 pr-2 font-semibold">방문자</th>
                <th className="py-2 pr-2 text-right font-semibold">가입</th>
                <th className="py-2 pr-2 text-right font-semibold">탈퇴</th>
                <th className="py-2 text-right font-semibold">회원 수</th>
              </tr>
            </thead>
            <tbody>
              {stats.days.map((row, index) => (
                <tr key={row.day} className={index === 0 ? "border-b border-border/60 bg-white/[0.04]" : "border-b border-border/60"}>
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {shortDay(row.day)}
                    {index === 0 ? <span className="ml-1 text-xs font-bold text-primary">오늘</span> : null}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-right font-semibold text-sky-300 tabular-nums">{n(row.visitors)}</span>
                      <span
                        aria-hidden
                        className="h-2.5 rounded-full bg-sky-400/70"
                        style={{ width: `${Math.round((row.visitors / maxVisitors) * 100)}%`, maxWidth: "10rem", minWidth: row.visitors ? 4 : 0 }}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold text-emerald-300 tabular-nums">{row.signups ? `+${n(row.signups)}` : "0"}</td>
                  <td className="py-2 pr-2 text-right font-semibold text-rose-300 tabular-nums">{row.withdrawals ? `−${n(row.withdrawals)}` : "0"}</td>
                  <td className="py-2 text-right tabular-nums">{n(row.members)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 유입 경로: 어디서 들어와 가입했는지(QR · 초대 · 검색 · SNS) */}
      <section aria-label="유입 경로" data-traffic-stats className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">🧭 유입 경로 · 최근 {range}일</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          표시가 붙은 링크(QR · 초대 · 공유 이미지 · 알림)나 다른 사이트에서 들어온 방문만 셉니다(출처마다 하루 1번). 가입은 처음 들어온 출처로 셉니다.
        </p>
        {traffic.length ? (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1">출처</th>
                <th className="py-1 text-right">방문</th>
                <th className="py-1 text-right">가입</th>
                <th className="py-1 text-right">가입률</th>
              </tr>
            </thead>
            <tbody>
              {traffic.map((r) => (
                <tr key={r.source} data-traffic-row={r.source} className="border-t border-border">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right font-bold tabular-nums">{n(r.visits)}</td>
                  <td className="py-1.5 text-right tabular-nums">{n(r.signups)}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.visits ? `${Math.round((r.signups / r.visits) * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">아직 기록이 없어요.</p>
        )}
        <p data-invite-summary className="mt-3 text-sm">
          🤝 친구 초대 가입 {n(inviteCount("pending") + inviteCount("done") + inviteCount("capped") + inviteCount("same-ip"))}명 · 첫 출석(보상) {n(inviteCount("done"))}명
          {inviteCount("same-ip") ? ` · 같은 IP(보상 없음) ${n(inviteCount("same-ip"))}명` : ""}
          {inviteCount("capped") ? ` · 한도 초과 ${n(inviteCount("capped"))}명` : ""}
        </p>
      </section>

      {/* 이미지 공유: 어떤 도구 결과가 많이 퍼지는지(공유 창 = 카톡 등으로 바로 보냄, 저장 = 이미지 내려받음) */}
      <section aria-label="이미지 공유" data-share-stats className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">📤 이미지 공유 · 최근 {range}일</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1">도구</th>
              <th className="py-1 text-right">합계</th>
              <th className="py-1 text-right">공유 창</th>
              <th className="py-1 text-right">저장</th>
              <th className="py-1 text-right">세로형</th>
            </tr>
          </thead>
          <tbody>
            {shareRows.map((r) => (
              <tr key={r.key} data-share-row={r.key} className="border-t border-border">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{n(r.total)}</td>
                <td className="py-1.5 text-right tabular-nums">{n(r.shared)}</td>
                <td className="py-1.5 text-right tabular-nums">{n(r.downloaded)}</td>
                <td className="py-1.5 text-right tabular-nums">{n(r.story)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
