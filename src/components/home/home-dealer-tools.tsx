import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BrandIcon } from "@/components/brand/brand-icon";

const TOOLS = [
  { href: "/tools/rotation", icon: "chips" as const, title: "딜러 로테이션", body: "교대 시간표 자동 · 단톡방 이미지 · TV 화면" },
  { href: "/tools/seat-draw", icon: "cards" as const, title: "싯드로우", body: "칩 균형 맞춰 좌석 배정 · 이미지 · 인쇄" },
  { href: "/tools/board", icon: "lantern" as const, title: "게임 현황판", body: "블라인드 · 남은 시간 · 인원 · 상금을 TV에" },
  { href: "/tools/pay", icon: "coin" as const, title: "급여 계산기", body: "근무 시간 → 3.3% · 4대보험 · 실수령" },
];

/** 홈: 매장 관리 도구 소개(회원이면 무료) */
export function HomeDealerTools() {
  return (
    <section aria-label="매장 관리" className="lounge-card grid gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">매장 관리</h2>
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">POKA 하나로 · 회원 무료</span>
        <Link href="/tools" aria-label="매장 관리 툴 전체 보기" className="ml-auto inline-flex items-center text-xs font-bold text-[#e7c98a]">
          전체 보기
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      {/* 설명 없이 한 줄(휴대폰 2칸) — 메인을 단순하게 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} title={tool.body} className="touch-target flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-2.5 hover:border-[#c9a25c]">
            <BrandIcon name={tool.icon} className="size-5 shrink-0" active />
            <span className="min-w-0 truncate text-sm font-black text-white">{tool.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
