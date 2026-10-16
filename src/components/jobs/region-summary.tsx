import Link from "next/link";
import { prisma } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { openJobWhere, regionWhere, type JobRegion } from "@/lib/job-status";

/** 지역 구인 페이지 위: 그 지역만의 숫자 요약(검색에 잡히는 고유 내용 · 딜러에게도 쓸모) */
export async function RegionSummary({ region }: { region: JobRegion }) {
  const base = { boardType: "JOBS" as const, hidden: false, isAttendanceThread: false, NOT: { jobKind: "SEEKING" as const } };
  const since = new Date(nowMs() - 30 * 86_400_000);
  const [open, month, pays, recent] = await Promise.all([
    prisma.post.count({ where: { AND: [base, openJobWhere(), regionWhere(region)] } }).catch(() => 0),
    prisma.post.count({ where: { AND: [base, regionWhere(region), { createdAt: { gte: since } }] } }).catch(() => 0),
    prisma.post
      .findMany({ where: { AND: [base, regionWhere(region), { jobPayType: "시급" }, { createdAt: { gte: new Date(nowMs() - 90 * 86_400_000) } }] }, select: { jobPayAmount: true }, take: 200 })
      .catch(() => []),
    prisma.post
      .findMany({ where: { AND: [base, regionWhere(region)] }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, createdAt: true } })
      .catch(() => []),
  ]);
  const nums = pays.map((p) => Number(String(p.jobPayAmount ?? "").replace(/[^\d]/g, ""))).filter((n) => n >= 9000 && n <= 100000);
  const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length / 100) * 100 : null;
  return (
    <section aria-label={`${region} 구인 요약`} data-region-summary className="grid gap-2 rounded-2xl border border-[#c9a25c]/30 bg-[#17120f] p-3">
      <h2 className="text-base font-black text-white">{region} 홀덤 딜러 구인 한눈에</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/30 p-2">
          <dt className="text-xs text-[#c9c0b2]">지금 모집</dt>
          <dd className="text-xl font-black text-[#ffcf4a]">{open}</dd>
        </div>
        <div className="rounded-xl bg-black/30 p-2">
          <dt className="text-xs text-[#c9c0b2]">최근 30일 공고</dt>
          <dd className="text-xl font-black text-white">{month}</dd>
        </div>
        <div className="rounded-xl bg-black/30 p-2">
          <dt className="text-xs text-[#c9c0b2]">평균 시급(90일)</dt>
          <dd className="text-xl font-black text-white">{avg ? `${avg.toLocaleString("ko-KR")}원` : "—"}</dd>
        </div>
      </dl>
      {recent.length ? (
        <div className="grid gap-1">
          <p className="text-xs font-bold text-[#e7c98a]">{region} 최근 공고</p>
          <ul className="grid gap-0.5 text-sm">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="flex min-h-9 items-center gap-2 text-[#e5e7eb] hover:text-white">
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{p.createdAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-zinc-400">
        {region} 홀덤펍 지원 딜러 · 급구 대타 · 고정 직원 공고를 모았어요. 날짜별로 보려면{" "}
        <Link href={`/boards/jobs/slots?region=${encodeURIComponent(region)}`} className="font-bold text-[#8eeaff] underline">
          {region} 빈자리 보드
        </Link>
        에서 쉬는 날을 골라 보세요.
      </p>
    </section>
  );
}
