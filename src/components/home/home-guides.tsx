import Link from "next/link";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { LONG_GUIDES } from "@/lib/guide-articles-long";
import { todayKstDate } from "@/lib/dates";

/** 홈 「오늘의 딜러 가이드」: 날마다 3편씩 돌아가며(긴 실무 글 위주) — 가이드 74편으로 들어가는 길 */
export function HomeGuides() {
  const pool = GUIDE_ARTICLES.filter((g) => g.body.length >= 900);
  const list = pool.length ? pool : GUIDE_ARTICLES;
  const day = Math.floor(Date.parse(`${todayKstDate()}T00:00:00Z`) / 86_400_000);
  const start = (day * 3) % list.length;
  const picks = [0, 1, 2].map((k) => list[(start + k) % list.length]);
  return (
    <section data-home-guides aria-label="오늘의 딜러 가이드" className="ink-panel grid gap-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-[#f3d9a4]">📘 오늘의 딜러 가이드</h2>
        <Link href="/info/guide" className="inline-flex min-h-10 items-center text-sm font-bold text-[#e7c98a] hover:underline">
          가이드 {GUIDE_ARTICLES.length}편 모두 보기 →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {picks.map((g) => (
          <li key={g.slug}>
            <Link href={`/info/guide/${g.slug}`} className="flex h-full min-h-20 flex-col rounded-xl border border-white/10 bg-black/25 px-3 py-3 hover:border-[#c9a25c]/60">
              <span className="text-sm font-bold text-white">{g.title}</span>
              <span className="mt-1 line-clamp-2 text-xs leading-5 text-[#c9c1b2]">{g.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[#9CA3AF]">7년 넘게 딜러로 일한 운영자가 현장 경험으로 쓴 실무 글이에요. 처음이라면 「{LONG_GUIDES[0].title}」부터 읽어 보세요.</p>
    </section>
  );
}
