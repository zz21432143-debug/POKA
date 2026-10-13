import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { DealerPractice } from "@/components/tools/dealer-practice";

export const metadata: Metadata = { title: "딜러 연습장", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked next="/tools/practice" />;
  return (
    <div className="flex flex-col gap-3">
      <header>
        <Link href="/tools" className="text-xs font-bold text-[#c9a25c]">
          ← 딜러 툴
        </Link>
        <h1 className="text-2xl font-black text-white">딜러 연습장</h1>
        <p className="text-xs text-zinc-400">현장에서 바로 쓰는 사이드팟 계산기와, 사이드팟·칩 세기 연습 문제(10문제 기록·랭킹)입니다.</p>
      </header>
      <DealerPractice />
    </div>
  );
}
