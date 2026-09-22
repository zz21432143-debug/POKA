import { notFound, redirect } from "next/navigation";
import { INFO_PAGES } from "@/lib/info-pages";

export default async function InfoArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "news" || slug === "tips") redirect("/info/guide");
  if (slug !== "guide") notFound();
  const rows = INFO_PAGES.guide;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">딜러 가이드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          홀덤 딜러가 테이블에서 바로 쓰는 기본 룰입니다. 하우스 룰이 있으면 플로어 판정이 우선입니다.
        </p>
      </header>
      <ol className="grid gap-4">
        {rows.map((row, index) => (
          <li key={row.title} className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm">
            <h2 className="text-base font-semibold">
              {index + 1}. {row.title}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground/90">{row.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
