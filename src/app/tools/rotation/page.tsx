import type { Metadata } from "next";
import { cookies } from "next/headers";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "@/components/ui/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { RotationBoard } from "@/components/tools/rotation-board";
import { loadRotation } from "@/lib/rotation-server";
import { LAST_GAME_COOKIE } from "@/lib/rotation";

export const metadata: Metadata = toolMetadata("/tools/rotation");
export const dynamic = "force-dynamic";

export default async function RotationPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return <ToolsLocked next="/tools/rotation" />;
  const { g } = await searchParams;
  // 주소에 게임이 없으면 마지막으로 연 게임(같이 편집하는 게임도 · 내가 열 수 없는 게임이면 내 최근 게임)
  const last = (await cookies()).get(LAST_GAME_COOKIE)?.value;
  const initial = await loadRotation(user.id, g || last || null);
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/tools" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
            ← 매장 관리
          </Link>
          <h1 className="text-2xl font-black text-white">딜러 로테이션</h1>
          {initial.plan ? null : (
            <p className="text-xs text-zinc-400">테이블 · 시작 시각 · 딜러 명단만 넣으면 교대표가 자동으로 만들어져요. 출근 · 퇴근을 누르면 알아서 다시 맞춰요.</p>
          )}
        </div>
      </header>
      <RotationBoard initial={initial} />
    </div>
  );
}
