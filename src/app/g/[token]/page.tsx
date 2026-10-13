import type { Metadata } from "next";
import { loadSharedBoard } from "@/lib/game-board-server";
import { GameBoardViewer } from "@/components/tools/game-board-viewer";

export const metadata: Metadata = { title: "게임 현황판", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** 보기 전용 게임 현황판(로그인 없이 링크로 TV에 띄움). 주인이 링크를 끄면 열리지 않습니다. */
export default async function SharedGameBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const initial = await loadSharedBoard(token).catch(() => null);
  if (!initial) {
    return (
      <section className="ink-panel mx-auto grid max-w-lg gap-2 rounded-2xl px-5 py-10 text-center">
        <h1 className="text-xl font-black text-white">현황판을 볼 수 없습니다</h1>
        <p className="text-sm text-[#D1D5DB]">보기 링크가 꺼졌거나 잘못된 링크입니다. 담당자에게 새 링크를 받아 주세요.</p>
      </section>
    );
  }
  return <GameBoardViewer token={token} initial={initial} />;
}
