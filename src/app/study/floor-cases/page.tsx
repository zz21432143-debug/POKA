import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { FLOOR_CASES } from "@/lib/floor-cases";

const TITLE = `홀덤 현장 판정 사례 ${FLOOR_CASES.length}가지 — 미스딜 · 오버칩 · 스트링 베팅 · 언더레이즈`;
const DESCRIPTION = "딜러 · 플로어가 자주 만나는 애매한 상황을 「상황 → 판정 → 이유 → 매장마다 다른 점」으로 정리했어요. TDA 일반 원칙 기준.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study/floor-cases" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/study/floor-cases" },
};

/** 현장 판정 사례(플로어 · 딜러용) */
export default function FloorCasesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/study" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 공부
        </Link>
      </p>
      <header className="board-intro">
        <h1>⚖️ 현장 판정 사례</h1>
        <p className="mt-2">
          테이블에서 자주 생기는 애매한 상황 {FLOOR_CASES.length}가지를 정리했어요. 판정은 TDA 룰의 일반 원칙을 쉬운 말로 옮긴 것이고, 매장 하우스 룰과 플로어 판단이 우선이에요.
        </p>
      </header>
      <nav aria-label="사례 목록" className="grid gap-1 rounded-2xl border border-white/10 bg-black/30 p-3">
        {FLOOR_CASES.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-[15px] text-[#E5E7EB] hover:bg-white/5">
            <span className="w-6 shrink-0 text-center text-xs font-black text-[#c9a25c]">{i + 1}</span>
            {c.title}
          </a>
        ))}
      </nav>
      {FLOOR_CASES.map((c, i) => (
        <article key={c.id} id={c.id} data-case={c.id} className="reading-panel scroll-mt-24 grid gap-3">
          <h2 className="text-lg font-black text-[#f3d9a4]">
            {i + 1}. {c.title}
          </h2>
          <dl className="grid gap-3 text-[16px] leading-8 text-[#e9e4db]">
            <div>
              <dt className="text-sm font-black text-zinc-400">📍 상황</dt>
              <dd>{c.situation}</dd>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2">
              <dt className="text-sm font-black text-emerald-300">⚖️ 판정</dt>
              <dd>{c.ruling}</dd>
            </div>
            <div>
              <dt className="text-sm font-black text-zinc-400">💡 이유</dt>
              <dd>{c.why}</dd>
            </div>
            <div>
              <dt className="text-sm font-black text-amber-300">🏠 매장마다 다른 점</dt>
              <dd>{c.house}</dd>
            </div>
          </dl>
          <p className="flex flex-wrap items-center gap-3 text-sm">
            {c.guide ? (
              <Link href={c.guide.href} className="font-bold text-[#e7c98a] underline underline-offset-4">
                자세히: {c.guide.label} →
              </Link>
            ) : null}
            {c.credit ? <span className="text-xs text-zinc-400">제보 · 답변: {c.credit}</span> : null}
          </p>
        </article>
      ))}
      <section className="grid gap-2 rounded-2xl border border-[#c9a25c]/40 bg-[#c9a25c]/10 p-4">
        <h2 className="text-base font-black text-[#f3d9a4]">📮 이런 상황 있었어요</h2>
        <p className="text-sm leading-6 text-[#E5E7EB]">
          현장에서 겪은 애매한 상황을 룰 Q&amp;A에 올려 주세요. 좋은 답변이 채택된 사례는 매장 · 사람 이름을 지우고 여기에 더해요(제보 · 답변 닉네임 표시).
        </p>
        <Link href="/boards/free/write?type=RULE_QA" className="inline-flex min-h-11 items-center justify-center justify-self-start rounded-xl bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611]">
          룰 Q&amp;A에 상황 올리기
        </Link>
      </section>
    </div>
  );
}
