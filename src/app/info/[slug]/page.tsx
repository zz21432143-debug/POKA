import { notFound } from "next/navigation";
import { INFO_PAGES, type InfoKey } from "@/lib/info-pages";

const TITLES: Record<InfoKey, { title: string; body: string }> = {
  guide: { title: "딜러 가이드", body: "입문 딜러를 위한 매너와 테이블 운영." },
  tips: { title: "팁 & 노하우", body: "현장에서 바로 쓰는 실전 팁." },
  news: { title: "업계 뉴스", body: "룸·펍·토너먼트 소식." },
};

export default async function InfoArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const key = slug as InfoKey;
  const meta = TITLES[key];
  const rows = INFO_PAGES[key];
  if (!meta || !rows) notFound();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.body} · {rows.length}편
        </p>
      </header>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {rows.map((row, index) => (
          <li key={row.title} className="px-4 py-4">
            <p className="font-medium">
              {index + 1}. {row.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{row.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
