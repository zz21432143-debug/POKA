import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_ARTICLES } from "@/lib/info-pages";

export const metadata: Metadata = {
  title: "홀덤 딜러 가이드 — POKA",
  description: "홀덤 딜러가 테이블에서 바로 쓰는 기본 룰 10편.",
};

export default function GuideHubPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>홀덤 딜러 가이드</h1>
        <p className="mt-2">
          검색으로 들어오는 상설 글 {GUIDE_ARTICLES.length}편입니다. 하우스 룰이 있으면 플로어 판정이
          우선입니다.
        </p>
      </header>
      <ol className="grid gap-3">
        {GUIDE_ARTICLES.map((row, index) => (
          <li key={row.slug}>
            <Link
              href={`/info/guide/${row.slug}`}
              className="ink-panel touch-target flex min-h-20 flex-col rounded-2xl px-4 py-4 hover:bg-[#241c1e]"
            >
              <span className="text-sm font-bold text-white">
                {index + 1}. {row.title}
              </span>
              <span className="mt-1 text-sm text-[#D1D5DB]">{row.summary}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
