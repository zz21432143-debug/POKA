import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { GLOSSARY, glossaryGroups } from "@/lib/glossary";
import { GlossaryList } from "@/components/study/glossary-list";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";

const TITLE = `홀덤 용어 사전 — ㄱ~ㅎ ${GLOSSARY.length}개 (딜러 · 토너먼트 · 전략 용어)`;
const DESCRIPTION = "넛 · 사이드팟 · c벳 · 3벳 · 리바인 · 애드온 · ICM · SPR까지 홀덤 용어를 한 줄로 쉽게. 자세한 설명은 POKA 가이드로 바로 이어져요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study/glossary" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/study/glossary" },
};

/** 홀덤 · 딜러 용어 사전 */
export default function GlossaryPage() {
  const base = siteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "POKA 홀덤 용어 사전",
    inLanguage: "ko-KR",
    url: `${base}/study/glossary`,
    hasDefinedTerm: GLOSSARY.map((t) => ({ "@type": "DefinedTerm", name: t.term, alternateName: t.en, description: t.def })),
  };
  return (
    <div className="flex flex-col gap-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/study" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 공부
        </Link>
      </p>
      <header className="board-intro">
        <h1>📖 홀덤 용어 사전</h1>
        <p className="mt-2">
          홀덤 · 딜러 · 토너먼트 용어 {GLOSSARY.length}개를 한 줄로 정리했어요. 「자세히」를 누르면 예시가 있는 가이드로 이어져요. 규칙 용어는 매장 하우스 룰이 우선이에요.
        </p>
      </header>
      <GlossaryList groups={glossaryGroups()} />
      <p className="text-sm text-[#d1c7b5]">
        빠진 용어가 있으면{" "}
        <Link href="/boards/suggestions" className="font-bold text-[#f3d9a4] underline underline-offset-4">
          건의사항
        </Link>
        에 남겨 주세요.
      </p>
    </div>
  );
}
