import type { Metadata } from "next";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { Oni } from "@/components/brand/oni";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { DealerPractice } from "@/components/tools/dealer-practice";

export const metadata: Metadata = toolMetadata("/tools/practice");
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked next="/tools/practice" />;
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
        <Link href="/study" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 홀덤 공부
        </Link>
        <h1 className="text-2xl font-black text-white">딜러 연습장</h1>
        <p className="text-xs text-zinc-400">팟 계산 연습(풀이 · 기록 · 랭킹)과 현장에서 바로 쓰는 사이드팟 계산기.</p>
        </div>
        <Oni pose="front" className="h-20 shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,.6)] sm:h-24" />
      </header>
      <DealerPractice />
    </div>
  );
}
