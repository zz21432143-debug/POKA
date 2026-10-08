import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GUIDE_ARTICLES, getGuideArticle } from "@/lib/info-pages";

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
    title: `${article.title} — POKA`,
    description: article.summary,
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

  return (
    <article className="flex flex-col gap-4">
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
