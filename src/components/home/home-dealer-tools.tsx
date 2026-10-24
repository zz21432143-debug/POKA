import Link from "@/components/ui/link";
import { ChevronRightIcon } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-icon";

const TOOLS = [
  { href: "/tools/rotation", icon: "chips" as const, title: "딜러 로테이션", body: "교대표 자동 · TV 화면" },
  { href: "/tools/seat-draw", icon: "cards" as const, title: "싯드로우", body: "칩 균형 맞춘 좌석 배정" },
  { href: "/tools/board", icon: "lantern" as const, title: "게임 현황판", body: "블라인드 · 시간을 TV에" },
  { href: "/tools/pay", icon: "coin" as const, title: "급여 계산기", body: "3.3% · 4대보험 실수령" },
  { href: "/tools/shot-clock", icon: "lantern" as const, title: "샷클락", body: "생각 시간 0.1초 타이머" },
  { href: "/boards/jobs/mine", icon: "noren" as const, title: "내 공고 관리", body: "마감 · 끌어올리기" },
];

/** 홈: 매장 관리 도구 소개(회원이면 무료) */
export function HomeDealerTools() {
  return (
    <section aria-label="매장 관리" className="lounge-card grid h-full content-start gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">매장 관리</h2>
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">POKA 하나로 · 회원 무료</span>
        <Link href="/tools" className="ml-auto inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a]">
          전체 보기
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      {/* 6칸: 휴대폰 · 태블릿 3칸×2줄(아이콘 위 · 이름 아래, 짧게) · PC 2칸×3줄(설명 한 줄) */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} title={tool.body} className={`group touch-target flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-[#c9a25c]/30 bg-black/30 px-1.5 py-2 text-center transition hover:border-[#c9a25c] hover:bg-[#2a2017] active:scale-[0.98] lg:min-h-[4.6rem] lg:flex-row lg:gap-2 lg:px-2.5 lg:py-0 lg:text-left`}>
            <BrandIcon name={tool.icon} className="size-5 shrink-0" active />
            <span className="grid w-full min-w-0 lg:w-auto lg:flex-1">
              <span className="truncate text-[12.5px] font-black text-white sm:text-sm">{tool.title}</span>
              {/* PC: 한 줄 설명(휴대폰은 이름만) */}
              <span className="hidden truncate text-[11.5px] text-[#b9aa92] lg:block">{tool.body}</span>
            </span>
            <ChevronRightIcon className="hidden size-4 shrink-0 text-[#c9a25c] transition group-hover:translate-x-0.5 lg:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}
