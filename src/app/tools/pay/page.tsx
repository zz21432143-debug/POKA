import type { Metadata } from "next";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "@/components/ui/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { Oni } from "@/components/brand/oni";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { PayCalculator } from "@/components/tools/pay-calculator";

export const metadata: Metadata = toolMetadata("/tools/pay");
export const dynamic = "force-dynamic";

export default async function PayPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked next="/tools/pay" />;
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
        <Link href="/tools" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 매장 관리
        </Link>
        <h1 className="text-2xl font-black text-white">급여 계산기</h1>
        <p className="text-xs text-zinc-400">일한 날짜와 출근·퇴근 시간을 넣으면 세전 금액, 3.3% 공제, 4대보험 공제, 실수령액을 바로 계산합니다.</p>
        </div>
        <Oni pose="side" className="h-20 shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,.6)] sm:h-24" />
      </header>
      <PayCalculator />
    </div>
  );
}
