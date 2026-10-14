import type { Metadata } from "next";
import { ChevronRightIcon, MonitorPlayIcon, RefreshCwIcon, ShuffleIcon, WalletIcon } from "lucide-react";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools, DEALER_TOOLS_OPEN } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = toolMetadata("/tools");
export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/tools/board", title: "게임 현황판", icon: MonitorPlayIcon, body: "블라인드 레벨 · 남은 시간 · 인원 · 평균 스택 · 상금을 TV에 띄우는 토너먼트 시계. 내 계정에만 보이고 휴대폰으로 조작합니다." },
  { href: "/tools/rotation", icon: RefreshCwIcon, title: "딜러 로테이션", body: "게임마다 테이블 최대 100개 · 딜러 150명. 간격(예: 20분)마다 누가 몇 번 테이블로 들어가고 쉬는지 시간표로 미리 짭니다." },
  { href: "/tools/seat-draw", icon: ShuffleIcon, title: "싯드로우", body: "진출자 칩을 테이블마다 고르게 나누고 좌석은 무작위로 배정합니다." },
  { href: "/tools/pay", icon: WalletIcon, title: "급여 계산기", body: "일한 날짜·출근·퇴근을 넣으면 세전 금액, 3.3% 공제, 4대보험 공제, 실수령액을 계산합니다." },
];

export default async function ToolsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked />;
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.tools}>매장 관리</BoardTitle>
        <p className="mt-2">대회 현장 운영 도구입니다.{DEALER_TOOLS_OPEN ? " 로테이션은 계정마다 따로 저장되어 다른 사람에게 보이지 않습니다." : " 지금은 마스터 계정만 볼 수 있습니다(제작 중)."}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            data-tool-card
            className="ink-panel group touch-target flex flex-col gap-2 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[#c9a25c] hover:bg-[#241c1e] active:translate-y-0 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c9a25c]/15 text-[#e7c98a] ring-1 ring-[#c9a25c]/40">
                <tool.icon className="size-5" />
              </span>
              <span className="text-lg font-black text-white">{tool.title}</span>
            </span>
            <span className="text-sm leading-6 text-[#D1D5DB]">{tool.body}</span>
            {/* 눌러서 들어가는 곳이라는 표시 */}
            <span className="mt-auto inline-flex min-h-10 w-fit items-center gap-1 rounded-full bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611] transition group-hover:bg-[#e7c98a]">
              열기
              <ChevronRightIcon className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
