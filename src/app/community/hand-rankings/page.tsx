import type { Metadata } from "next";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import Link from "next/link";
import { CardRow } from "@/components/cards/poker-card";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";

const TITLE = "홀덤 족보 순위 — 카드로 보는 핸드 랭킹 10가지와 확률";
const DESCRIPTION =
  "로열 플러시부터 하이카드까지 텍사스 홀덤 족보 10가지를 카드 그림으로 정리. 같은 족보일 때 이기는 법(키커), 헷갈리는 상황, 7장 기준 실제 확률까지.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/community/hand-rankings" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/community/hand-rankings" },
};

/**
 * 족보 10가지. 개수는 직접 전부 세어 확인한 값(scripts/pushfold/hand-freq.cjs)
 * 5장: 2,598,960가지 · 7장(내 패 2 + 보드 5 중 가장 좋은 5장): 133,784,560가지
 */
const RANKINGS = [
  { ko: "로열 플러시", en: "Royal Flush", cards: ["As", "Ks", "Qs", "Js", "Ts"], hl: [0, 1, 2, 3, 4], desc: "같은 무늬의 A-K-Q-J-10. 가장 높은 족보입니다.", five: 4, seven: 4324 },
  { ko: "스트레이트 플러시", en: "Straight Flush", cards: ["9h", "8h", "7h", "6h", "5h"], hl: [0, 1, 2, 3, 4], desc: "같은 무늬로 숫자 5개가 이어짐. 높은 숫자가 큰 쪽이 이깁니다.", five: 36, seven: 37260 },
  { ko: "포카드", en: "Four of a Kind", cards: ["Qc", "Qd", "Qh", "Qs", "7d"], hl: [0, 1, 2, 3], desc: "같은 숫자 4장. 같은 포카드면 남은 1장(키커)으로 가립니다.", five: 624, seven: 224848 },
  { ko: "풀하우스", en: "Full House", cards: ["Jh", "Jd", "Jc", "4s", "4h"], hl: [0, 1, 2, 3, 4], desc: "트리플 + 원페어. 트리플 숫자가 먼저, 같으면 페어 숫자로 비교합니다.", five: 3744, seven: 3473184 },
  { ko: "플러시", en: "Flush", cards: ["Ad", "Jd", "8d", "6d", "2d"], hl: [0, 1, 2, 3, 4], desc: "같은 무늬 5장(숫자는 상관없음). 가장 높은 카드부터 차례로 비교합니다.", five: 5108, seven: 4047644 },
  { ko: "스트레이트", en: "Straight", cards: ["Tc", "9d", "8s", "7h", "6c"], hl: [0, 1, 2, 3, 4], desc: "숫자 5개가 이어짐(무늬 상관없음). A는 A-K-Q-J-10에도, A-2-3-4-5에도 쓸 수 있어요.", five: 10200, seven: 6180020 },
  { ko: "트리플(셋 · 트립스)", en: "Three of a Kind", cards: ["8c", "8h", "8d", "Ks", "3d"], hl: [0, 1, 2], desc: "같은 숫자 3장. 내 패 페어 + 보드 1장이면 '셋', 내 패 1장 + 보드 페어면 '트립스'라고 불러요.", five: 54912, seven: 6461620 },
  { ko: "투페어", en: "Two Pair", cards: ["Ah", "As", "9c", "9d", "Kh"], hl: [0, 1, 2, 3], desc: "페어 2개. 높은 페어 → 낮은 페어 → 키커 순서로 비교합니다.", five: 123552, seven: 31433400 },
  { ko: "원페어", en: "One Pair", cards: ["Kd", "Kc", "Js", "7h", "4c"], hl: [0, 1], desc: "같은 숫자 2장. 페어가 같으면 남은 3장을 높은 것부터 비교합니다.", five: 1098240, seven: 58627800 },
  { ko: "하이카드", en: "High Card", cards: ["Ac", "Qd", "9h", "6s", "3c"], hl: [0], desc: "아무것도 없을 때. 가장 높은 카드부터 차례로 비교합니다.", five: 1302540, seven: 23294460 },
] as const;

const FIVE_TOTAL = 2598960;
const SEVEN_TOTAL = 133784560;
const percent = (n: number, total: number) => {
  const p = (n / total) * 100;
  return p >= 1 ? `${p.toFixed(1)}%` : p >= 0.01 ? `${p.toFixed(3)}%` : `${p.toFixed(4)}%`;
};

const TRICKY = [
  {
    title: "보드가 이기는 패면 무승부",
    hole: [["Kc", "2d"], ["Qh", "3s"]],
    board: ["As", "Ks", "Qs", "Js", "Ts"],
    text: "보드에 로열 플러시가 깔리면 두 사람 모두 보드 5장을 쓰므로 팟을 나눕니다(찹).",
  },
  {
    title: "휠(A-2-3-4-5)은 가장 낮은 스트레이트",
    hole: [["Ah", "2c"], ["6d", "7c"]],
    board: ["3s", "4h", "5d", "Kc", "Qs"],
    text: "A-2-3-4-5는 5가 가장 높은 카드인 스트레이트예요. 3-4-5-6-7(7 하이)이 이깁니다.",
  },
  {
    title: "투페어가 세 개면 가장 높은 두 개만",
    hole: [["Kh", "Kd"], ["Qh", "8c"]],
    board: ["Qs", "8d", "4c", "4s", "2h"],
    text: "오른쪽은 QQ · 88 · 44 페어가 세 개지만 가장 높은 두 개(QQ + 88)만 써요. 왼쪽은 KK + 44. 가장 높은 페어 K가 Q보다 높으니 왼쪽이 이깁니다.",
  },
  {
    title: "키커가 승부를 가름",
    hole: [["Ah", "Kd"], ["As", "Qc"]],
    board: ["Ac", "9d", "7s", "4h", "2c"],
    text: "둘 다 A 원페어. 남은 카드 중 가장 높은 키커 K가 Q보다 높아 왼쪽이 이깁니다.",
  },
];

export default function HandRankingsPage() {
  const base = siteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    inLanguage: "ko-KR",
    mainEntityOfPage: `${base}/community/hand-rankings`,
    author: { "@type": "Organization", name: "POKA", url: base },
    publisher: { "@type": "Organization", name: "POKA", logo: { "@type": "ImageObject", url: `${base}/icon.png` } },
  };
  return (
    <article className="flex flex-col gap-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <header className="board-intro">
        <Link href="/study" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 홀덤 공부
        </Link>
        <BoardTitle sticker={BOARD_STICKER["hand-rankings"]}>홀덤 족보 순위</BoardTitle>
        <p className="mt-2">위에서부터 강한 순서예요. 홀덤은 내 패 2장 + 보드 5장, 총 7장 중 가장 좋은 5장으로 겨룹니다.</p>
      </header>

      <ol className="grid gap-3">
        {RANKINGS.map((row, i) => (
          <li key={row.en} data-rank={i + 1} className="ink-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-black text-[#c9a25c]">{i + 1}위</span>
                <span className="text-xl font-black text-white">{row.ko}</span>
                <span className="text-xs font-bold text-[#9CA3AF]">{row.en}</span>
              </p>
              <p className="text-[15px] leading-7 text-[#ece4d6]">{row.desc}</p>
              <p className="text-xs text-[#9CA3AF]">
                최종 7장에서 나올 확률 <b className="text-[#f3d9a4]">{percent(row.seven, SEVEN_TOTAL)}</b> · 5장만 받았을 때 {percent(row.five, FIVE_TOTAL)}
              </p>
            </div>
            <CardRow cards={[...row.cards]} hl={[...row.hl]} />
          </li>
        ))}
      </ol>

      {/* 구글 광고: 족보 카드 바로 아래(가장 오래 보는 자리) */}
      <BoardBottomAd />
      <section aria-label="헷갈리는 상황" className="grid gap-3">
        <h2 className="text-lg font-black text-[#f3d9a4]">헷갈리는 상황 4가지</h2>
        {TRICKY.map((row) => (
          <div key={row.title} className="ink-panel grid gap-2 rounded-2xl p-4">
            <h3 className="font-black text-white">{row.title}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid gap-1">
                <span className="text-[11px] font-bold text-[#9CA3AF]">플레이어 1</span>
                <CardRow cards={row.hole[0]} size="sm" />
              </span>
              <span className="grid gap-1">
                <span className="text-[11px] font-bold text-[#9CA3AF]">플레이어 2</span>
                <CardRow cards={row.hole[1]} size="sm" />
              </span>
              <span className="grid gap-1">
                <span className="text-[11px] font-bold text-[#9CA3AF]">보드</span>
                <CardRow cards={row.board} size="sm" />
              </span>
            </div>
            <p className="text-[15px] leading-7 text-[#d1c7b5]">{row.text}</p>
          </div>
        ))}
      </section>

      <section aria-label="알아 두면 좋은 것" className="ink-panel grid gap-2 rounded-2xl p-4 text-[15px] leading-7 text-[#ece4d6]">
        <h2 className="text-lg font-black text-[#f3d9a4]">알아 두면 좋은 것</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>무늬(♠♥♦♣)에는 높고 낮음이 없어요. 같은 족보 · 같은 숫자면 팟을 나눕니다.</li>
          <li>내 패 2장을 다 쓰지 않아도 돼요. 7장 중 가장 좋은 5장이면 됩니다.</li>
          <li>확률은 7장 133,784,560가지를 전부 세어 확인한 값이에요.</li>
        </ul>
      </section>

      <nav aria-label="함께 보면 좋은 것" className="flex flex-wrap gap-2">
        {[
          { href: "/community/equity", label: "승률 계산기" },
          { href: "/info/push-fold", label: "GTO 푸시폴드 차트" },
          { href: "/tools/practice", label: "딜러 연습장" },
          { href: "/info/guide/showdown", label: "쇼다운 순서" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
