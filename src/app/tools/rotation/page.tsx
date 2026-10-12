import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { RotationBoard } from "@/components/tools/rotation-board";
import { loadRotation } from "@/lib/rotation-server";

export const metadata: Metadata = { title: "딜러 로테이션", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RotationPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!canUseDealerTools(user)) return <ToolsLocked />;
  const initial = await loadRotation();
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/tools" className="text-xs font-bold text-[#c9a25c]">
            ← 딜러 툴
          </Link>
          <h1 className="text-2xl font-black text-white">딜러 로테이션</h1>
          <p className="text-xs text-zinc-400">시작·끝 시각과 간격을 정하고 로테이션을 짜 두면, 몇 시 몇 분에 누가 몇 번 테이블로 들어가는지 미리 보입니다. 다른 기기에도 바로 반영됩니다.</p>
        </div>
      </header>
      <RotationBoard initial={initial} />
    </div>
  );
}
