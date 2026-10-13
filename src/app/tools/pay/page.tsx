import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { PayCalculator } from "@/components/tools/pay-calculator";

export const metadata: Metadata = { title: "급여 계산기", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked next="/tools/pay" />;
  return (
    <div className="flex flex-col gap-3">
      <header>
        <Link href="/tools" className="text-xs font-bold text-[#c9a25c]">
          ← 딜러 툴
        </Link>
        <h1 className="text-2xl font-black text-white">급여 계산기</h1>
        <p className="text-xs text-zinc-400">일한 날짜와 출근·퇴근 시간을 넣으면 세전 금액, 3.3% 공제, 4대보험 공제, 실수령액을 바로 계산합니다.</p>
      </header>
      <PayCalculator />
    </div>
  );
}
