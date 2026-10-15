import type { Metadata } from "next";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import Link from "next/link";
import { PushFoldChart } from "@/components/tools/push-fold-chart";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";
import { StudyAd } from "@/components/ads/board-bottom-ad";

const TITLE = "GTO 푸시폴드 차트 — 포지션별 · 헤즈업 올인 / 콜 범위 (6인 · 9인)";
const DESCRIPTION =
  "UTG부터 SB까지 포지션별 올인 범위와 뒤 자리 콜 범위, 헤즈업 SB 올인 · BB 콜 범위를 GTO(내시 균형)로 보여 줍니다. 169개 패 승률을 직접 계산해 구한 무료 숏스택 GTO 차트.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/info/push-fold" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/info/push-fold" },
};

const FAQ = [
  {
    q: "푸시 폴드 차트가 뭔가요?",
    a: "스택이 짧을 때(대략 15bb 이하) 레이즈 대신 올인(푸시)하거나 폴드만 하는 전략표입니다. 이 차트는 모두가 서로 최선을 다할 때의 균형, 즉 내시 균형(GTO)을 포지션별로 보여 줍니다.",
  },
  {
    q: "내시 균형 = GTO인가요?",
    a: "푸시/폴드처럼 선택지가 올인과 폴드뿐인 상황에서는 내시 균형이 곧 GTO(게임 이론상 최적) 전략입니다. 상대가 어떻게 하든 크게 손해 보지 않는 기준선이에요. 상대가 너무 타이트하거나 루즈하면 거기에 맞춰 더 넓히거나 좁히는 게 더 이득일 수 있습니다.",
  },
  {
    q: "숫자표의 숫자는 뭔가요?",
    a: "그 패로 올인(또는 콜)해도 되는 가장 큰 유효 스택(bb)입니다. 예를 들어 SB 표에서 K2o가 11.5라면, 유효 스택 11.5bb 이하에서는 K2o를 올인하는 게 내시 전략입니다.",
  },
  {
    q: "토너먼트 버블에서도 그대로 쓰면 되나요?",
    a: "포지션별 · 헤즈업 차트는 칩 기준(chip EV)입니다. 버블 · 파이널 테이블처럼 상금 압박이 클 때는 「ICM(버블·파이널)」 탭에서 실제 스택과 상금을 넣어 계산하세요. 보통 콜 범위가 크게 좁아지고, 그만큼 먼저 올인하는 쪽은 넓어집니다.",
  },
];

export default function PushFoldPage() {
  const base = siteUrl();
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "POKA GTO 푸시폴드 차트",
      url: `${base}/info/push-fold`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((row) => ({ "@type": "Question", name: row.q, acceptedAnswer: { "@type": "Answer", text: row.a } })),
    },
  ];
  return (
    <article className="flex flex-col gap-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <header className="board-intro">
        <Link href="/study" className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]">
          ← 홀덤 공부
        </Link>
        <BoardTitle sticker={BOARD_STICKER["push-fold"]}>GTO 푸시폴드 차트</BoardTitle>
        <p className="mt-2">포지션과 유효 스택을 고르면 올인할 패, 뒤 자리가 콜할 패가 바로 보여요. 칸을 누르면 그 패를 몇 bb까지 올인 · 콜하는지 알려 줘요.</p>
      </header>

      <PushFoldChart />
      {/* 구글 광고: 계산 결과 바로 아래(가장 오래 보는 자리) */}
      <StudyAd />

      <section aria-label="어떻게 계산했나요" className="ink-panel grid gap-2 rounded-2xl p-4 text-[15px] leading-7 text-[#ece4d6]">
        <h2 className="text-lg font-black text-[#f3d9a4]">어떻게 계산했나요 (정확도)</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>169개 시작 패끼리 올인했을 때의 승률을 모든 조합(1만 4천여 쌍)마다 30만 판씩 직접 돌려 계산했습니다. 오차는 약 ±0.1%포인트입니다.</li>
          <li>카드가 겹치는 경우(예: AK를 들면 상대가 AA일 조합이 줄어듦)까지 반영했습니다.</li>
          <li>헤즈업: 그 승률로 SB 올인 · BB 콜의 내시 균형을 0.1bb 간격(1~25bb)으로 풀었습니다. 균형에서 한쪽만 전략을 바꿔 얻을 수 있는 이득이 0.002bb 아래(사실상 0)인 것까지 확인했습니다.</li>
          <li>포지션별: 6인 · 9인 테이블에서 먼저 올인하는 자리와 뒤 자리 전원의 전략을 함께 맞춰(2~25bb, 0.5bb 간격) 풀었습니다. 같은 SB 대 BB 상황은 헤즈업 차트와 똑같이 나오고, 차트 1,222칸 전부에서 한 사람만 바꿔 얻는 이득이 평균 0.001bb · 최대 0.02bb(스택의 0.1% 미만)인 것까지 확인했습니다.</li>
        </ol>
        <h3 className="mt-1 font-black text-white">이 차트의 조건</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>올인 아니면 폴드만 하는 숏스택 상황입니다. 앞사람이 모두 폴드한 뒤 처음 올인하는 경우예요.</li>
          <li>포지션별 차트는 모두 같은 스택으로 보고, 한 명이 콜하면 나머지는 폴드한다고 계산했습니다(오버콜은 아주 강한 패뿐이라 숏스택 차트에서 흔히 쓰는 근사).</li>
          <li>「BB 앤티」는 BB가 1bb를 앤티로 따로 내는 방식(죽은 돈)입니다.</li>
          <li>포지션별 · 헤즈업 차트는 칩 기준(chip EV)입니다. 버블 · 파이널은 「ICM(버블·파이널)」 탭에서 실제 스택 · 상금으로 계산하세요(상금 가치로 손익을 따진 균형).</li>
        </ul>
      </section>

      <section aria-label="자주 묻는 질문" className="ink-panel grid gap-3 rounded-2xl p-4">
        <h2 className="text-lg font-black text-[#f3d9a4]">자주 묻는 질문</h2>
        {FAQ.map((row) => (
          <div key={row.q} className="grid gap-1">
            <h3 className="font-bold text-white">{row.q}</h3>
            <p className="text-[15px] leading-7 text-[#d1c7b5]">{row.a}</p>
          </div>
        ))}
      </section>

      <nav aria-label="함께 쓰면 좋은 도구" className="flex flex-wrap gap-2">
        {[
          { href: "/info/icm", label: "ICM 계산기" },
          { href: "/tools/practice", label: "팟 계산 연습" },
          { href: "/boards/hand-review", label: "핸드리뷰 투표" },
          { href: "/info/guide/tournament-terms", label: "토너먼트 용어 정리" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
