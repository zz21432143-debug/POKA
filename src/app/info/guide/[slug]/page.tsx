import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GUIDE_ARTICLES, getGuideArticle } from "@/lib/info-pages";
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
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: "ko-KR",
    mainEntityOfPage: `${base}/info/guide/${article.slug}`,
    author: { "@type": "Organization", name: "POKA", url: base },
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
      </header>
      <div className="ink-panel rounded-2xl px-4 py-5">
        <p className="whitespace-pre-line text-base leading-7 text-[#E5E7EB]">{article.body}</p>
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
      <nav className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
        {prev ? (
          <Link href={`/info/guide/${prev.slug}`} className="text-primary">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/info/guide/${next.slug}`} className="ml-auto text-primary">
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
