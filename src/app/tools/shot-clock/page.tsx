import type { Metadata } from "next";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "@/components/ui/link";
import { ShotClock } from "@/components/tools/shot-clock";
import { ToolGuideSection } from "@/components/tools/tool-guide-section";

export const metadata: Metadata = toolMetadata("/tools/shot-clock");

/** 샷클락: 로그인 없이 바로(서버 저장 없음 · 정적 페이지라 서버 비용 0) */
export default function ShotClockPage() {
  return (
    <div className="flex flex-col gap-3">
      <header>
        <Link href="/tools" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 매장 관리
        </Link>
        <h1 className="text-2xl font-black text-white">샷클락</h1>
        <p className="text-xs text-zinc-400">플레이어마다 주는 생각 시간입니다. 밀면 처음부터 다시 흐르고, 누르면 멈춥니다. 0.1초까지 보여요.</p>
      </header>
      <ShotClock />
      <ToolGuideSection path="/tools/shot-clock" />
    </div>
  );
}
