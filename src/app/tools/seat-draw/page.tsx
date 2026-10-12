import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { SeatDraw } from "@/components/tools/seat-draw";

export const metadata: Metadata = { title: "제작중", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SeatDrawPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked />;
  return (
    <div className="flex flex-col gap-3">
      <header>
        <Link href="/tools" className="text-xs font-bold text-[#c9a25c]">
          ← 딜러 툴
        </Link>
        <h1 className="text-2xl font-black text-white">DAY2 싯드로우</h1>
        <p className="text-xs text-zinc-400">테이블마다 칩 합계·평균이 비슷하도록 나누고, 좌석은 무작위로 배정합니다. 결과는 단톡방용 복사·이미지·인쇄로 저장할 수 있습니다.</p>
      </header>
      <SeatDraw />
    </div>
  );
}
