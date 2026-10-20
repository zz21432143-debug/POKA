import type { Metadata } from "next";
import { ClipboardListIcon, MonitorPlayIcon, RefreshCwIcon, ShuffleIcon, TimerIcon, WalletIcon } from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolGuideSection } from "@/components/tools/tool-guide-section";
import Link from "@/components/ui/link";
import { toolMetadata } from "@/lib/tool-seo";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools, DEALER_TOOLS_OPEN } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = toolMetadata("/tools");
export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/tools/board", title: "게임 현황판", icon: MonitorPlayIcon, body: "블라인드 레벨 · 남은 시간 · 인원 · 평균 스택 · 프라이즈를 TV에 띄우는 토너먼트 시계. 휴대폰으로 조작하고, 링크로 손님 휴대폰에서도 볼 수 있습니다." },
  { href: "/tools/rotation", icon: RefreshCwIcon, title: "딜러 로테이션", body: "테이블 · 시작 시각 · 딜러 명단만 넣으면 교대 시간표가 자동으로. 6자리 코드로 다른 매니저와 같이 보고 고칠 수 있습니다." },
  { href: "/tools/seat-draw", icon: ShuffleIcon, title: "싯드로우", body: "진출자 칩을 테이블마다 고르게 나누고 좌석은 무작위로 배정합니다." },
  { href: "/tools/shot-clock", icon: TimerIcon, title: "샷클락", body: "플레이어마다 생각 시간(초). 0.1초까지 크게 · 밀면 다시 시작 · 누르면 멈춤. 로그인 없이 바로." },
  { href: "/tools/pay", icon: WalletIcon, title: "급여 계산기", body: "일한 날짜·출근·퇴근을 넣으면 세전 금액, 3.3% 공제, 4대보험 공제, 실수령액을 계산합니다." },
  { href: "/boards/jobs/mine", icon: ClipboardListIcon, title: "내 공고 관리", body: "매장 로고 · 날짜 줄 마감 · 끌어올리기. 올린 구인 공고를 한곳에서 관리합니다." },
];

export default async function ToolsPage() {
  const user = await getCurrentUser().catch(() => null);
  // 로그인 전에도 도구 목록은 보여 줌(샷클락은 바로 쓰고, 나머지는 눌러서 들어가면 로그인 안내)
  const guest = !user && DEALER_TOOLS_OPEN;
  if (!guest && !canUseDealerTools(user)) return <ToolsLocked />;
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.tools}>매장 관리</BoardTitle>
        <p className="mt-2">대회 현장 운영 도구입니다.{DEALER_TOOLS_OPEN ? " 만든 내용은 내 계정에 저장되고, 로테이션 · 현황판은 원할 때만 코드 · 링크로 함께 볼 수 있습니다." : " 지금은 마스터 계정만 볼 수 있습니다(제작 중)."}</p>
        {guest ? (
          <p className="mt-2 text-sm">
            샷클락은 로그인 없이 바로, 나머지 도구는 회원 무료입니다.{" "}
            <Link href="/login?tab=login&next=%2Ftools" className="font-bold text-[#e7c98a] underline">
              로그인하고 무료로 쓰기
            </Link>
          </p>
        ) : null}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} href={tool.href} icon={tool.icon} title={tool.title} body={tool.body} />
        ))}
      </div>
      {guest ? <ToolGuideSection path="/tools" /> : null}
    </div>
  );
}
