import Link from "next/link";
import { CheckIcon, LockIcon } from "lucide-react";
import { DEALER_TOOLS_OPEN } from "@/lib/dealer-tools-access";
import { toolIntro } from "@/lib/tool-seo";
import { GameBoardDemo } from "@/components/tools/game-board-demo";
import { TOOL_GUIDES } from "@/lib/tool-guides";
import { jsonLdString } from "@/lib/job-jsonld";

/** 로그인 전 툴 소개: 무엇을 하는 툴인지 보여 주고 로그인으로 안내(검색엔진도 이 소개를 읽습니다) */
export function ToolsLocked({ next = "/tools" }: { next?: string }) {
  const intro = toolIntro(next);
  const guide = TOOL_GUIDES[intro.path] ?? null;
  if (!DEALER_TOOLS_OPEN) {
    return (
      <section className="ink-panel mx-auto grid max-w-lg justify-items-center gap-3 rounded-2xl px-5 py-10 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#2a2017] text-[#e7c98a]">
          <LockIcon className="size-7" />
        </span>
        <h1 className="text-xl font-black text-white">제작중</h1>
        <p className="text-sm leading-6 text-[#D1D5DB]">새 기능을 만들고 있습니다. 완성되면 공지로 알려 드릴게요.</p>
      </section>
    );
  }
  return (
    <section data-tool-intro className="ink-panel mx-auto grid w-full max-w-2xl gap-4 rounded-2xl px-5 py-7 sm:px-7">
      <div className="grid gap-1.5">
        <p className="text-xs font-black tracking-wide text-[#c9a25c]">POKA 매장 관리 · 회원 무료</p>
        <h1 className="text-2xl font-black text-white">{intro.heading}</h1>
        <p className="text-[15px] leading-7 text-[#D1D5DB]">{intro.description}</p>
      </div>
      {next === "/tools/board" ? <GameBoardDemo /> : null}
      <ul className="grid gap-2">
        {intro.points.map((point) => (
          <li key={point} className="flex gap-2 text-[15px] leading-7 text-[#ece4d6]">
            <CheckIcon className="mt-1.5 size-4 shrink-0 text-[#e7c98a]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <Link
        href={`/login?tab=login&next=${encodeURIComponent(next)}`}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#8b2222] px-5 text-base font-black text-white hover:bg-[#a12a2a]"
      >
        로그인하고 무료로 쓰기
      </Link>
      <p className="text-center text-xs text-[#9CA3AF]">회원가입은 1분이면 끝나요. 내 기록은 내 계정에만 저장됩니다.</p>
      {guide ? (
        <div data-tool-guide className="grid gap-4 border-t border-white/10 pt-4">
          <section className="grid gap-2">
            <h2 className="text-lg font-black text-[#f3d9a4]">사용법 3단계</h2>
            <ol className="grid gap-1.5">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-2 text-[15px] leading-7 text-[#ece4d6]">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#c9a25c] text-xs font-black text-[#1d1611]">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="grid gap-1.5 rounded-xl bg-black/25 p-3">
            <h2 className="text-base font-black text-[#f3d9a4]">{guide.example.title}</h2>
            <p className="text-[15px] leading-7 text-[#D1D5DB]">{guide.example.body}</p>
          </section>
          <section className="grid gap-2">
            <h2 className="text-lg font-black text-[#f3d9a4]">자주 묻는 질문</h2>
            <dl className="grid gap-2">
              {guide.faq.map((row) => (
                <div key={row.q} className="rounded-xl border border-white/10 px-3 py-2.5">
                  <dt className="text-[15px] font-bold text-white">Q. {row.q}</dt>
                  <dd className="mt-1 text-[15px] leading-7 text-[#D1D5DB]">{row.a}</dd>
                </div>
              ))}
            </dl>
          </section>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdString({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: guide.faq.map((row) => ({ "@type": "Question", name: row.q, acceptedAnswer: { "@type": "Answer", text: row.a } })),
              }),
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
