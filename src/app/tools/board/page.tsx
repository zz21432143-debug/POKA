import type { Metadata } from "next";
import { toolMetadata } from "@/lib/tool-seo";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canUseDealerTools } from "@/lib/dealer-tools-access";
import { listBoards, loadBoard } from "@/lib/game-board-server";
import { ToolsLocked } from "@/components/tools/tools-locked";
import { GameBoardPanel } from "@/components/tools/game-board-panel";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

export const metadata: Metadata = toolMetadata("/tools/board");
export const dynamic = "force-dynamic";

export default async function GameBoardPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !canUseDealerTools(user)) return <ToolsLocked next="/tools/board" />;
  const { id } = await searchParams;
  const boards = await listBoards(user.id);
  const pick = (id && boards.find((b) => b.id === id)?.id) || boards[0]?.id;
  const board = pick ? await loadBoard(user.id, pick) : null;
  return (
    <div className="flex flex-col gap-3">
      <header className="board-intro">
        <Link href="/tools" className="text-xs font-bold text-[#c9a25c]">
          ← 매장 관리
        </Link>
        <BoardTitle sticker={BOARD_STICKER.board}>게임 현황판</BoardTitle>
        <p className="mt-2">TV에 띄우는 토너먼트 시계. 휴대폰으로 조작하면 TV에 바로 반영돼요.</p>
      </header>
      <GameBoardPanel initialBoards={boards} initialBoard={board} />
    </div>
  );
}
