import Link from "@/components/ui/link";
import { BarChart3Icon, CalculatorIcon, ChevronRightIcon, Grid3x3Icon, ListOrderedIcon, PercentIcon, PieChartIcon, ScrollTextIcon } from "lucide-react";

const TOOLS = [
  { href: "/info/push-fold", icon: Grid3x3Icon, title: "GTO 푸시폴드", body: "포지션별 올인 · 콜 범위 + ICM" },
  { href: "/community/equity", icon: PercentIcon, title: "승률 계산기", body: "내 패 vs 상대 · 스트리트별" },
  { href: "/info/icm", icon: PieChartIcon, title: "ICM 계산기", body: "파이널 딜 금액" },
  { href: "/community/hand-ranges", icon: BarChart3Icon, title: "핸드 레인지 순위", body: "169개 패 · 상위 X%" },
  { href: "/community/hand-rankings", icon: ListOrderedIcon, title: "족보 순위", body: "카드로 보는 족보 · 확률" },
  { href: "/tools/practice", icon: CalculatorIcon, title: "팟 계산 연습", body: "사이드팟 · 팟 계산 랭킹" },
];

/** 홈: 무료 홀덤 공부 도구(로그인 없이) 한 줄 바로가기 */
export function HomeStudyTools() {
  return (
    <section aria-label="무료 홀덤 도구" data-home-study className="lounge-card grid h-full content-start gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">홀덤 공부 도구</h2>
        <span className="rounded-full bg-[#1f6f4a] px-2 py-0.5 text-[11px] font-black text-[#eafff3]">무료 · 로그인 없이</span>
        <Link href="/study" className="ml-auto inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a]">
          홀덤 공부 전체
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      {/* TDA 룰(토너먼트 공식 룰 · PDF 다운로드): 색을 달리해 바로 찾게 */}
      <Link
        href="/boards/tda"
        data-home-tda
        className="group touch-target flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-[#5aa9ff]/70 bg-gradient-to-r from-[#123a66] to-[#0d2440] px-3 transition hover:border-[#8cc4ff] active:scale-[0.98]"
      >
        <ScrollTextIcon aria-hidden className="size-5 shrink-0 text-[#8cc4ff]" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-white">TDA 룰 · 토너먼트 공식 룰</span>
          <span className="block truncate text-[11px] font-bold text-[#b9d9ff]">조항 검색 · PDF 다운로드</span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-[#8cc4ff] transition group-hover:translate-x-0.5" />
      </Link>
      {/* 6칸: 혼자 남는 칸 없게 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {TOOLS.map(({ href, icon: Icon, title, body }) => (
          <Link key={href} href={href} title={body} className="group touch-target flex min-h-12 items-center gap-2 rounded-xl border border-[#c9a25c]/30 bg-black/30 px-2.5 transition hover:border-[#c9a25c] hover:bg-[#2a2017] active:scale-[0.98] lg:min-h-[3.6rem]">
            <Icon aria-hidden className="size-5 shrink-0 text-[#c9a25c]" />
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-black text-white">{title}</span>
              <span className="hidden truncate text-[11.5px] text-[#b9aa92] lg:block">{body}</span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-[#c9a25c] transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
