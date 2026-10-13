import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-icon";

const TOOLS = [
  { href: "/tools/rotation", icon: "chips" as const, title: "딜러 로테이션", body: "교대 시간표 자동 · 단톡방 이미지 · TV 화면" },
  { href: "/tools/seat-draw", icon: "cards" as const, title: "싯드로우", body: "칩 균형 맞춰 좌석 배정 · 이미지 · 인쇄" },
  { href: "/tools/pay", icon: "coin" as const, title: "급여 계산기", body: "근무 시간 → 3.3% · 4대보험 · 실수령" },
];

/** 홈: 딜러 툴 소개(회원이면 무료) */
export function HomeDealerTools() {
  return (
    <section aria-label="딜러 툴" className="lounge-card grid gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">딜러 툴</h2>
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">NEW · 회원 무료</span>
        <Link href="/tools" className="ml-auto inline-flex items-center text-xs font-bold text-[#e7c98a]">
          전체 보기
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="touch-target flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 hover:border-[#c9a25c]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2a2017]">
              <BrandIcon name={tool.icon} className="size-5" active />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-white">{tool.title}</span>
              <span className="block text-[11px] leading-4 text-[#D1C7B5]">{tool.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
