import type { Metadata } from "next";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { RotationBoard } from "@/components/tools/rotation-board";
import { loadRotation } from "@/lib/rotation-server";

export const metadata: Metadata = toolMetadata("/tools/rotation");
export const dynamic = "force-dynamic";

export default async function RotationPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return <ToolsLocked next="/tools/rotation" />;
  const { g } = await searchParams;
  const initial = await loadRotation(user.id, g);
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/tools" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
            ← 매장 관리
          </Link>
          <h1 className="text-2xl font-black text-white">딜러 로테이션</h1>
          <p className="text-xs text-zinc-400">딜러 탭에서 딜러를 등록하고, 설정 탭에서 시작 시간·테이블을 정한 뒤 운영 탭의 Auto를 누르면 교대 시간표가 짜집니다. 공유 탭에서 링크·QR로 딜러들에게 보여 줄 수 있습니다.</p>
        </div>
      </header>
      <RotationBoard initial={initial} />
    </div>
  );
}
