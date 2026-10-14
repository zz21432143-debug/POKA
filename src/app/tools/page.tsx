import type { Metadata } from "next";
import { MonitorPlayIcon, RefreshCwIcon, ShuffleIcon, WalletIcon } from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";
import { toolMetadata } from "@/lib/tool-seo";
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
          <ToolCard key={tool.href} href={tool.href} icon={tool.icon} title={tool.title} body={tool.body} />
        ))}
      </div>
    </div>
  );
}
