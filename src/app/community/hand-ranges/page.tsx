import type { Metadata } from "next";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import Link from "next/link";
import { HandRangeRanking } from "@/components/tools/hand-range-ranking";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";

const TITLE = "홀덤 핸드 레인지 순위 — 169개 시작 패 강한 순서 · 상위 X% 범위";
const DESCRIPTION =
  "AA부터 32o까지 169개 시작 패를 승률 순으로 정리. 상대 1명 · 2명 · 5명 · 8명일 때 순위가 어떻게 달라지는지, 상위 10% · 15% · 20% 범위에 어떤 패가 드는지 표로 확인하세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/community/hand-ranges" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/community/hand-ranges" },
};

export default function HandRangesPage() {
  return (
    <article className="flex flex-col gap-4">
      <header className="board-intro">
        <Link href="/study" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 홀덤 공부
        </Link>
        <BoardTitle sticker={BOARD_STICKER["hand-ranges"]}>핸드 레인지 순위</BoardTitle>
        <p className="mt-2">169개 시작 패를 강한 순서로 줄 세웠어요. 상대 수를 바꾸면 순위가 달라지고, 「상위 X%」를 고르면 그 범위에 드는 패가 표에 표시돼요.</p>
      </header>
      <HandRangeRanking />
      {/* 구글 광고: 계산 결과 바로 아래(가장 오래 보는 자리) */}
      <BoardBottomAd />
      <section aria-label="어떻게 정했나요" className="ink-panel grid gap-2 rounded-2xl p-4 text-[15px] leading-7 text-[#ece4d6]">
        <h2 className="text-lg font-black text-[#f3d9a4]">순위는 어떻게 정했나요</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>그 패를 들고 무작위 패를 든 상대들과 리버까지 갔을 때(아무도 폴드하지 않을 때) 팟을 가져가는 비율 순서예요. 무승부는 나눠서 셉니다.</li>
          <li>상대 1명: 169×169 승률표(쌍마다 30만 판)로 정확히 계산 · 2명 · 5명 · 8명: 패마다 20만 판씩 돌려 계산했어요.</li>
          <li>상대가 많아질수록 수딧 커넥터 · 작은 페어가 올라가고, 오프수딧 큰 카드(예: KJo)는 내려가요.</li>
          <li>「상위 X%」는 1,326개 조합 중 강한 패부터 X%까지예요. 실전 오픈 범위(포지션 · 스택)는 GTO 푸시폴드 차트를 함께 보세요.</li>
        </ul>
      </section>
      <nav aria-label="함께 보면 좋은 것" className="flex flex-wrap gap-2">
        {[
          { href: "/community/equity", label: "승률 계산기(상대 범위)" },
          { href: "/info/push-fold", label: "GTO 푸시폴드 차트" },
          { href: "/community/hand-rankings", label: "족보 순위" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
