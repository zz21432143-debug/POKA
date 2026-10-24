import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { HOLDEM_GUIDES, getHoldemGuide } from "@/lib/holdem-guides";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";
import { CourseStepBox } from "@/components/study/course-progress";
import { courseBoxProps } from "@/lib/course-titles";
import { CardText } from "@/components/study/card-text";
import { HOLDEM_STACK_NOTES, STACK_NOTE_BASE } from "@/lib/holdem-stack-notes";

export function generateStaticParams() {
  return HOLDEM_GUIDES.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getHoldemGuide(slug);
  if (!article) return { title: "홀덤 가이드" };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/info/holdem/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.summary, url: `/info/holdem/${article.slug}` },
  };
}

/** 홀덤 가이드(플레이어용 전략) 글 */
export default async function HoldemGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHoldemGuide(slug);
  if (!article) notFound();
  const index = HOLDEM_GUIDES.findIndex((row) => row.slug === slug);
  const prev = index > 0 ? HOLDEM_GUIDES[index - 1] : null;
  const next = index < HOLDEM_GUIDES.length - 1 ? HOLDEM_GUIDES[index + 1] : null;
  const related = HOLDEM_GUIDES.filter((row) => row.slug !== slug).slice(0, 4);
  const base = siteUrl();
  const [uy, um, ud] = article.updated.split("-").map(Number);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: "ko-KR",
    mainEntityOfPage: `${base}/info/holdem/${article.slug}`,
    author: { "@type": "Organization", name: "POKA 운영팀", url: `${base}/operator` },
    datePublished: article.updated,
    dateModified: article.updated,
    publisher: { "@type": "Organization", name: "POKA", logo: { "@type": "ImageObject", url: `${base}/icon.png` } },
  };
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/info/holdem" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 가이드
        </Link>
        <span className="mx-1">/</span>
        {index + 1}편
      </p>
      <header className="board-intro">
        <h1>{article.title}</h1>
        <p className="mt-2">{article.summary}</p>
        <p data-guide-byline className="mt-2 text-xs text-[#9CA3AF]">
          작성{" "}
          <Link href="/operator" className="font-semibold text-[#e7c98a] hover:underline">
            POKA 운영팀
          </Link>{" "}
          (딜러 경력 7년+ · 매장 운영 · 매니저) · 최종 수정 <time dateTime={article.updated}>{uy}년 {um}월 {ud}일</time> · 예시 핸드와 숫자는 POKA가 직접 만든 것입니다
        </p>
      </header>
      <div className="reading-panel">
        <p className="reading-text whitespace-pre-line"><CardText text={article.body} /></p>
      </div>
      {/* 국내 매장 토너먼트에서 흔한 짧은 스택으로 다시 보기 */}
      {HOLDEM_STACK_NOTES[article.slug] ? (
        <section data-stack-note aria-label="스택이 25BB라면" className="reading-panel border-[#c9a25c]/40">
          <h2 className="text-lg font-black text-[#f3d9a4]">📉 스택이 25BB라면?</h2>
          <p className="mt-1 text-xs text-[#b8ab98]">국내 매장 토너먼트처럼 짧은 스택일 때 · {STACK_NOTE_BASE}</p>
          <p className="reading-text mt-3 whitespace-pre-line"><CardText text={HOLDEM_STACK_NOTES[article.slug]} /></p>
        </section>
      ) : null}
      {article.tool ? (
        <Link
          href={article.tool.href}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c9a25c] px-5 text-base font-black text-[#1d1611] hover:bg-[#e7c98a]"
        >
          {article.tool.label} →
        </Link>
      ) : null}
      {(() => {
        const box = courseBoxProps({ kind: "holdem", slug: article.slug });
        return box ? <CourseStepBox {...box} /> : null;
      })()}
      <section aria-label="다른 홀덤 가이드" className="grid gap-2 rounded-2xl border border-white/10 p-4">
        <h2 className="text-base font-black text-[#f3d9a4]">다른 홀덤 가이드</h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {related.map((row) => (
            <li key={row.slug}>
              <Link href={`/info/holdem/${row.slug}`} className="inline-flex min-h-10 items-center text-[15px] text-[#E5E7EB] hover:text-[#e7c98a]">
                {row.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <nav className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
        {prev ? (
          <Link href={`/info/holdem/${prev.slug}`} className="inline-flex min-h-11 items-center text-primary">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/info/holdem/${next.slug}`} className="ml-auto inline-flex min-h-11 items-center text-right text-primary">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
