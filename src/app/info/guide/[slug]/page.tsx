import type { Metadata } from "next";
import { OperatorPosts } from "@/components/posts/operator-posts";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { GUIDE_ARTICLES, GUIDE_UPDATED_DEFAULT, getGuideArticle } from "@/lib/info-pages";
import { linkGuideTerms } from "@/lib/guide-links";
import { jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideArticle(slug);
  if (!article) return { title: "딜러 가이드" };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/info/guide/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.summary, url: `/info/guide/${article.slug}` },
  };
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getGuideArticle(slug);
  if (!article) notFound();
  const index = GUIDE_ARTICLES.findIndex((row) => row.slug === slug);
  const prev = index > 0 ? GUIDE_ARTICLES[index - 1] : null;
  const next = index >= 0 && index < GUIDE_ARTICLES.length - 1 ? GUIDE_ARTICLES[index + 1] : null;
  // 다른 가이드 4편(이 글 다음부터 돌아가며)
  const related = Array.from({ length: Math.min(4, GUIDE_ARTICLES.length - 1) }, (_, i) => GUIDE_ARTICLES[(index + 2 + i) % GUIDE_ARTICLES.length]).filter((row) => row.slug !== slug);
  const base = siteUrl();
  const updated = article.updated ?? GUIDE_UPDATED_DEFAULT;
  const [uy, um, ud] = updated.split("-").map(Number);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: "ko-KR",
    mainEntityOfPage: `${base}/info/guide/${article.slug}`,
    author: { "@type": "Organization", name: "POKA 운영팀", url: `${base}/operator` },
    datePublished: updated,
    dateModified: updated,
    publisher: { "@type": "Organization", name: "POKA", logo: { "@type": "ImageObject", url: `${base}/icon.png` } },
  };

  return (
    <article className="flex flex-col gap-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/info/guide" className="text-[#E5E7EB] hover:text-[#C59B27]">
          딜러 가이드
        </Link>
        <span className="mx-1">/</span>
        {index + 1}편
      </p>
      <header className="board-intro">
        <h1>{article.title}</h1>
        <p className="mt-2">{article.summary}</p>
        {/* 누가 · 언제 쓴 글인지(검색 신뢰도) */}
        <p data-guide-byline className="mt-2 text-xs text-[#9CA3AF]">
          작성{" "}
          <Link href="/operator" className="font-semibold text-[#e7c98a] hover:underline">
            POKA 운영팀
          </Link>{" "}
          (딜러 경력 7년+ · 매장 운영 · 매니저) · 최종 수정 <time dateTime={updated}>{uy}년 {um}월 {ud}일</time> · 매장 하우스 룰이 있으면 그 룰이 우선입니다
        </p>
      </header>
      <div className="ink-panel rounded-2xl px-4 py-5">
        {/* 본문 용어는 관련 가이드로 이어짐(글마다 처음 나온 곳 하나) */}
        <p className="whitespace-pre-line text-base leading-7 text-[#E5E7EB]">{linkGuideTerms(article.body, article.slug)}</p>
      </div>
      {article.tool ? (
        <Link
          href={article.tool.href}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#c9a25c] px-5 text-base font-black text-[#1d1611] hover:bg-[#e7c98a]"
        >
          {article.tool.label} →
        </Link>
      ) : null}
      <section aria-label="다른 딜러 가이드" className="grid gap-2 rounded-2xl border border-white/10 p-4">
        <h2 className="text-base font-black text-[#f3d9a4]">다른 딜러 가이드</h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {related.map((row) => (
            <li key={row.slug}>
              <Link href={`/info/guide/${row.slug}`} className="inline-flex min-h-10 items-center text-[15px] text-[#E5E7EB] hover:text-[#e7c98a]">
                {row.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <OperatorPosts />
      <nav className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
        {prev ? (
          <Link href={`/info/guide/${prev.slug}`} className="inline-flex min-h-11 items-center text-primary">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/info/guide/${next.slug}`} className="ml-auto inline-flex min-h-11 items-center text-right text-primary">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
