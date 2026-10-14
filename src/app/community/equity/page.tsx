import type { Metadata } from "next";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import Link from "next/link";
import { EquityCalculator } from "@/components/tools/equity-calculator";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";

const TITLE = "홀덤 승률 계산기 — 내 패 vs 상대 패 프리플랍 · 플랍 · 턴 · 리버";
const DESCRIPTION =
  "내 패와 상대 패, 보드를 고르면 프리플랍부터 리버까지 승률을 정확히 계산합니다. 상대 패를 모를 때도 계산, 예상 승률 맞춰 보기, 팟 오즈로 콜 판단까지. 무료.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/community/equity" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/community/equity" },
};

export default function EquityPage() {
  return (
    <article className="flex flex-col gap-4">
      <header className="board-intro">
        <Link href="/study" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 홀덤 공부
        </Link>
        <BoardTitle sticker={BOARD_STICKER["equity"]}>승률 계산기</BoardTitle>
        <p className="mt-2">내 패 · 상대 패 · 보드를 고르면 스트리트마다 승률이 나와요. 「맞춰 보기」를 켜면 내 예상을 먼저 적고 정답과 비교할 수 있어요.</p>
      </header>
      <EquityCalculator />
      <section aria-label="계산 방법" className="ink-panel grid gap-2 rounded-2xl p-4 text-[15px] leading-7 text-[#ece4d6]">
        <h2 className="text-lg font-black text-[#f3d9a4]">어떻게 계산하나요</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>상대 패를 정하면 남은 보드를 전부 따져 정확하게 계산해요(프리플랍 1,712,304가지 · 플랍 990가지 · 턴 44가지).</li>
          <li>상대 패를 모르면 상대 패와 보드를 무작위로 10만~15만 번 뽑아 계산해요(오차 약 ±0.3%).</li>
          <li>「상위 범위」는 핸드 레인지 순위에서 강한 패부터 X%를 상대 범위로 잡아 계산해요(예: 상위 15% = 77+ · AJ+ · KQ 등).</li>
          <li>족보 판정은 모든 7장 조합 133,784,560가지를 세어 알려진 값과 같은지 확인한 평가기를 써요.</li>
        </ul>
      </section>
      <nav aria-label="함께 보면 좋은 것" className="flex flex-wrap gap-2">
        {[
          { href: "/community/hand-rankings", label: "족보 순위" },
          { href: "/community/hand-ranges", label: "핸드 레인지 순위" },
          { href: "/info/push-fold", label: "GTO 푸시폴드 차트" },
          { href: "/boards/hand-review", label: "핸드리뷰 투표" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
      {/* 구글 광고(하단): 검색으로 많이 들어오는 공부 도구 · 랭킹 */}
      <BoardBottomAd />
    </article>
  );
}
