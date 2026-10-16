import type { Metadata } from "next";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import Link from "@/components/ui/link";
import { IcmCalculator } from "@/components/tools/icm-calculator";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";
import { StudyAd } from "@/components/ads/board-bottom-ad";

const TITLE = "ICM 계산기 — 홀덤 토너먼트 파이널 딜 계산 (무료)";
const DESCRIPTION =
  "남은 플레이어 칩과 순위별 상금만 넣으면 ICM(Independent Chip Model)으로 각자의 상금 가치와 공정한 딜 금액을 바로 계산합니다. 칩 비율 딜과 비교, 우승 확률까지. 로그인 없이 무료.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/info/icm" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/info/icm" },
};

const FAQ = [
  {
    q: "ICM이 뭔가요?",
    a: "Independent Chip Model의 줄임말로, 토너먼트 칩을 실제 상금 가치로 바꿔 계산하는 방법입니다. 칩이 많을수록 높은 순위로 끝날 확률이 칩 비율만큼이라고 보고, 순위별 확률 × 상금을 더해 각자의 가치를 구합니다.",
  },
  {
    q: "왜 칩 비율대로 나누면 안 되나요?",
    a: "토너먼트는 칩을 다 따도 1위 상금만 받기 때문에, 칩 2배가 상금 가치 2배가 아닙니다. 칩 비율대로 나누면 칩 리더가 너무 많이 가져가고 숏스택은 손해를 봅니다. 그래서 파이널 딜은 보통 ICM 금액을 기준으로 이야기합니다.",
  },
  {
    q: "딜은 꼭 ICM대로 해야 하나요?",
    a: "아닙니다. ICM은 기준일 뿐이고, 실제 딜은 남은 플레이어 전원이 합의해야 하며 대회 규정에 따라 허용되지 않을 수도 있습니다. 실력 차이 · 블라인드 크기 · 다음 핸드 상황은 ICM에 들어가지 않습니다.",
  },
  {
    q: "몇 명까지 계산되나요?",
    a: "15명까지 바로 계산됩니다. 상금이 없는 순위(버블 아래)는 비워 두면 됩니다.",
  },
];

export default function IcmPage() {
  const base = siteUrl();
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "POKA ICM 계산기",
      url: `${base}/info/icm`,
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
        <BoardTitle sticker={BOARD_STICKER["icm"]}>ICM 계산기</BoardTitle>
        <p className="mt-2">파이널 테이블 딜, 공정하게 나누세요. 남은 사람 칩과 순위별 상금만 넣으면 각자의 상금 가치(ICM 금액)가 바로 나와요. 로그인 없이 무료.</p>
      </header>

      <IcmCalculator />
      {/* 구글 광고: 계산 결과 바로 아래(가장 오래 보는 자리) */}
      <StudyAd />

      <section aria-label="ICM 사용법" className="ink-panel grid gap-2 rounded-2xl p-4 text-[15px] leading-7 text-[#ece4d6]">
        <h2 className="text-lg font-black text-[#f3d9a4]">이렇게 쓰세요</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>남은 플레이어의 칩을 적습니다(이름은 비워도 돼요).</li>
          <li>상금표를 대회 전체 순위로 적습니다. 「총상금 × 비율(%)」로 적거나 「순위별 금액」으로 적을 수 있어요.</li>
          <li>남은 인원보다 아래 순위(이미 탈락한 사람 몫)는 자동으로 빠지고, 남은 사람끼리 걸린 상금으로만 계산돼요.</li>
          <li>「ICM 금액」이 각자의 공정한 딜 기준입니다. 「결과 복사」로 단톡방에 바로 붙여넣을 수 있어요.</li>
        </ol>
        <p className="text-sm text-[#b7ab97]">
          예) 3명 남음 · 칩 50만/30만/20만 · 상금 500만/300만/200만 → ICM 금액 약 384만/328만/289만. 칩 비율로 나누면 500만/300만/200만이라 숏스택이 89만 손해예요.
        </p>
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
          { href: "/info/push-fold", label: "GTO 푸시폴드 차트" },
          { href: "/tools/board", label: "게임 현황판(대회 타이머)" },
          { href: "/tools/seat-draw", label: "싯드로우" },
          { href: "/info/guide/tournament-terms", label: "토너먼트 용어 정리" },
          { href: "/boards/schedule", label: "대회 캘린더" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-3.5 text-sm font-bold text-[#d1c7b5] hover:border-[#c9a25c] hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
