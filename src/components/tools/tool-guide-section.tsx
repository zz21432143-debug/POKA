import { TOOL_GUIDES } from "@/lib/tool-guides";
import { jsonLdString } from "@/lib/job-jsonld";

/** 툴 아래 사용법 3단계 · 예시 · 자주 묻는 질문(누구나 읽는 설명 · 검색엔진용) */
export function ToolGuideSection({ path }: { path: string }) {
  const guide = TOOL_GUIDES[path];
  if (!guide) return null;
  return (
    <section data-tool-guide className="ink-panel grid gap-4 rounded-2xl px-4 py-5 sm:px-6">
      <div className="grid gap-2">
        <h2 className="text-lg font-black text-[#f3d9a4]">사용법 3단계</h2>
        <ol className="grid gap-1.5">
          {guide.steps.map((step, i) => (
            <li key={step} className="flex gap-2 text-[15px] leading-7 text-[#ece4d6]">
              <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#c9a25c] text-xs font-black text-[#1d1611]">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-1.5 rounded-xl bg-black/25 p-3">
        <h2 className="text-base font-black text-[#f3d9a4]">{guide.example.title}</h2>
        <p className="text-[15px] leading-7 text-[#D1D5DB]">{guide.example.body}</p>
      </div>
      <div className="grid gap-2">
        <h2 className="text-lg font-black text-[#f3d9a4]">자주 묻는 질문</h2>
        <dl className="grid gap-2">
          {guide.faq.map((row) => (
            <div key={row.q} className="rounded-xl border border-white/10 px-3 py-2.5">
              <dt className="text-[15px] font-bold text-white">Q. {row.q}</dt>
              <dd className="mt-1 text-[15px] leading-7 text-[#D1D5DB]">{row.a}</dd>
            </div>
          ))}
        </dl>
      </div>
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
    </section>
  );
}
