import Link from "next/link";
import { prisma } from "@/lib/db";

/**
 * 구인 글 아래 「이 지역 딜러 구인 한눈에」: 지역 공고 수 · 최근 시급 평균 · 3.3% 실수령 예시 · 지원 전 체크리스트.
 * 연락처가 로그인 뒤에 있어 비회원(검색 · 광고 심사)에게 비어 보이던 공고 페이지에 쓸모 있는 정보를 채웁니다.
 */
const cache = new Map<string, { at: number; open: number; avg: number | null; min: number | null; max: number | null; n: number }>();

async function regionStats(region: string) {
  const hit = cache.get(region);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit;
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since60 = new Date(Date.now() - 60 * 86_400_000);
  const [open, paid] = await Promise.all([
    prisma.post.count({
      where: { boardType: "JOBS", hidden: false, jobLocation: { startsWith: region }, createdAt: { gte: since30 }, NOT: { jobKind: "SEEKING" } },
    }),
    prisma.post.findMany({
      where: { boardType: "JOBS", hidden: false, jobLocation: { startsWith: region }, createdAt: { gte: since60 }, jobPayType: "시급" },
      select: { jobPayAmount: true },
      take: 500,
    }),
  ]);
  // 말이 안 되는 값(오타 · 일급을 시급에 적은 것)은 빼고
  const wages = paid
    .map((row) => Number(String(row.jobPayAmount ?? "").replace(/[^0-9]/g, "")))
    .filter((v) => v >= 9_000 && v <= 100_000);
  const avg = wages.length ? Math.round(wages.reduce((a, b) => a + b, 0) / wages.length / 100) * 100 : null;
  const row = { at: Date.now(), open, avg, min: wages.length ? Math.min(...wages) : null, max: wages.length ? Math.max(...wages) : null, n: wages.length };
  cache.set(region, row);
  return row;
}

const won = (v: number) => `${v.toLocaleString("ko-KR")}원`;

export async function JobRegionInfo({ region, kindLabel }: { region: string; kindLabel: string }) {
  if (!region || region === "미정") return null;
  const stats = await regionStats(region).catch(() => null);
  const sample = stats?.avg ?? 15_000;
  const day = sample * 8;
  const net = Math.round((day * (1 - 0.033)) / 10) * 10;
  return (
    <section data-job-region-info className="grid gap-3 rounded-xl border border-[#3a332c] bg-[#141110] p-4 text-sm leading-6 text-[#D1D5DB]">
      <h2 className="text-base font-bold text-[#f3d9a4]">{region} 홀덤 딜러 구인 한눈에</h2>
      {stats ? (
        <ul className="grid gap-1">
          <li>
            • 최근 30일 {region} 공고 <b className="text-white">{stats.open}건</b> ·{" "}
            <Link href={`/jobs/${encodeURIComponent(region)}`} className="text-primary underline">
              {region} 공고 모두 보기
            </Link>
          </li>
          {stats.avg ? (
            <li>
              • 최근 60일 시급 공고 {stats.n}건 평균 <b className="text-white">{won(stats.avg)}</b>
              {stats.min && stats.max && stats.min !== stats.max ? ` (최저 ${won(stats.min)} ~ 최고 ${won(stats.max)})` : ""}
            </li>
          ) : null}
        </ul>
      ) : null}
      <p>
        시급 {won(sample)}으로 8시간 일하면 하루 {won(day)}입니다. 프리랜서(사업소득)로 3.3%를 떼면 실제로 받는 돈은 약{" "}
        <b className="text-white">{won(net)}</b>이고, 4대보험 직원이면 공제 방식이 달라집니다. 급여 계산기에서 근무 시간과 세금 방식을 바꿔 바로
        비교할 수 있어요.
      </p>
      <div className="grid gap-1">
        <p className="font-semibold text-white">{kindLabel} 지원 전에 꼭 확인할 것</p>
        <ul className="grid gap-0.5">
          <li>• 근무 시간과 휴게 시간, 마감 뒤 정리까지 근무에 들어가는지</li>
          <li>• 급여 지급일(당일 · 주급 · 월급)과 세금 방식(3.3% · 4대보험)</li>
          <li>• 복장 규정(셔츠 · 조끼 · 신발)과 교육 기간 급여</li>
          <li>• 야간 근무라면 귀가 방법(대중교통 막차 · 택시비 지원)</li>
          <li>• 토너먼트 · 캐시게임 비율과 테이블 수(체력 · 로테이션에 영향)</li>
        </ul>
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <Link href="/tools/pay" className="text-primary underline">
          딜러 급여 계산기
        </Link>
        <Link href="/info/guide/how-to-become-dealer" className="text-primary underline">
          홀덤 딜러 되는 법
        </Link>
        <Link href="/info/guide/dealer-interview" className="text-primary underline">
          딜러 면접 준비
        </Link>
        <Link href="/info/guide/dealer-pay-structure" className="text-primary underline">
          근무 형태와 급여 구조
        </Link>
      </p>
    </section>
  );
}
