import Link from "@/components/ui/link";
import { ChevronRightIcon } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-icon";

const TOOLS = [
  { href: "/tools/rotation", icon: "chips" as const, title: "딜러 로테이션", body: "교대 시간표 자동 · 단톡방 이미지 · TV 화면" },
  { href: "/tools/seat-draw", icon: "cards" as const, title: "싯드로우", body: "칩 균형 맞춰 좌석 배정 · 이미지 · 인쇄" },
  { href: "/tools/board", icon: "lantern" as const, title: "게임 현황판", body: "블라인드 · 남은 시간 · 인원을 TV에 크게" },
  { href: "/tools/pay", icon: "coin" as const, title: "급여 계산기", body: "근무 시간 → 3.3% · 4대보험 · 실수령" },
  { href: "/boards/jobs/mine", icon: "noren" as const, title: "내 공고 관리", body: "매장 로고 · 날짜 줄 마감 · 끌어올리기" },
];

/** 홈: 매장 관리 도구 소개(회원이면 무료) */
export function HomeDealerTools() {
  return (
    <section aria-label="매장 관리" className="lounge-card grid content-start gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">매장 관리</h2>
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">POKA 하나로 · 회원 무료</span>
        <Link href="/tools" className="ml-auto inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a]">
          매장 관리 툴 5종
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      {/* 설명 없이 한 줄(휴대폰 2칸) — 메인을 단순하게 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {TOOLS.map((tool, i) => (
          <Link key={tool.href} href={tool.href} title={tool.body} className={`${i === TOOLS.length - 1 ? "col-span-2 sm:col-span-4 lg:col-span-2 " : ""}group touch-target flex min-h-12 items-center gap-2 rounded-xl border border-[#c9a25c]/30 bg-black/30 px-2.5 transition hover:border-[#c9a25c] hover:bg-[#2a2017] active:scale-[0.98] lg:min-h-[4.6rem]`}>
            <BrandIcon name={tool.icon} className="size-5 shrink-0" active />
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-black text-white">{tool.title}</span>
              {/* PC: 한 줄 설명(휴대폰은 이름만) */}
              <span className="hidden truncate text-[11.5px] text-[#b9aa92] lg:block">{tool.body}</span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-[#c9a25c] transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
