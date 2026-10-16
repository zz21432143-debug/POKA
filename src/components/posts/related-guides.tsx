import Link from "next/link";
import { GUIDE_ARTICLES } from "@/lib/info-pages";

const words = (s: string) => new Set((s.match(/[가-힣A-Za-z]{2,}/g) ?? []).map((w) => w.toLowerCase()));

/** 글 제목 · 앞부분과 낱말이 많이 겹치는 딜러 가이드 3편(검색엔진이 서로 이어진 글로 보게) */
export function RelatedGuides({ title, content }: { title: string; content: string }) {
  const mine = words(`${title} ${content.slice(0, 600)}`);
  const scored = GUIDE_ARTICLES.map((g) => {
    let n = 0;
    for (const w of words(`${g.title} ${g.summary}`)) if (mine.has(w)) n += 1;
    return { g, n };
  })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
  const list = scored.length ? scored.map((x) => x.g) : GUIDE_ARTICLES.slice(0, 3);
  return (
    <section aria-label="함께 보면 좋은 딜러 가이드" data-related-guides className="grid gap-1.5 rounded-2xl border border-[#c9a25c]/30 bg-[#17120f] p-3">
      <h2 className="text-sm font-black text-[#e7c98a]">📚 함께 보면 좋은 딜러 가이드</h2>
      <ul className="grid gap-0.5">
        {list.map((g) => (
          <li key={g.slug}>
            <Link href={`/info/guide/${g.slug}`} className="flex min-h-10 items-center text-[15px] text-[#e5e7eb] hover:text-[#e7c98a]">
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
