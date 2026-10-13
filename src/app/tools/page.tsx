import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools, DEALER_TOOLS_OPEN } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";

export const metadata: Metadata = { title: "딜러 툴", robots: { index: false } };
export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/tools/rotation", title: "딜러 로테이션", body: "게임마다 테이블 최대 100개 · 딜러 150명. 간격(예: 20분)마다 누가 몇 번 테이블로 들어가고 쉬는지 시간표로 미리 짭니다." },
  { href: "/tools/seat-draw", title: "싯드로우", body: "진출자 칩을 테이블마다 고르게 나누고 좌석은 무작위로 배정합니다." },
  { href: "/tools/pay", title: "급여 계산기", body: "일한 날짜·출근·퇴근을 넣으면 세전 금액, 3.3% 공제, 4대보험 공제, 실수령액을 계산합니다." },
];

export default async function ToolsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked />;
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>딜러 툴</h1>
        <p className="mt-2">대회 현장 운영 도구입니다.{DEALER_TOOLS_OPEN ? " 로테이션은 계정마다 따로 저장되어 다른 사람에게 보이지 않습니다." : " 지금은 마스터 계정만 볼 수 있습니다(제작 중)."}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="ink-panel rounded-2xl p-4 hover:border-[#c9a25c]">
            <p className="text-lg font-black text-white">{tool.title}</p>
            <p className="mt-1 text-sm leading-6 text-[#D1D5DB]">{tool.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
