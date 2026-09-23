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
      <p className="text-sm text-muted-foreground">
        <Link href="/info/guide" className="hover:text-primary">
          딜러 가이드
        </Link>
        <span className="mx-1">/</span>
        {index + 1}편
      </p>
      <header>
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
      </header>
      <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm">
        <p className="whitespace-pre-line text-sm leading-7 text-foreground/90">{article.body}</p>
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
