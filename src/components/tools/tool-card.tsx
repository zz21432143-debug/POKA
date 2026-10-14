import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRightIcon } from "lucide-react";

/** 눌러서 들어가는 도구 카드(아이콘 · 이름 · 설명 · 「열기 ›」). 매장 관리 · 홀덤 공부에서 같은 모양으로 씁니다. */
export function ToolCard({ href, icon: Icon, title, body, tag }: { href: string; icon: LucideIcon; title: string; body: string; tag?: string }) {
  return (
    <Link
      href={href}
      data-tool-card
      className="ink-panel group touch-target flex h-full flex-col gap-2 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[#c9a25c] hover:bg-[#241c1e] active:translate-y-0 active:scale-[0.99]"
    >
      <span className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c9a25c]/15 text-[#e7c98a] ring-1 ring-[#c9a25c]/40">
          <Icon className="size-5" />
        </span>
        <span className="text-lg font-black text-white">{title}</span>
        {tag ? <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">{tag}</span> : null}
      </span>
      <span className="text-sm leading-6 text-[#D1D5DB]">{body}</span>
      {/* 눌러서 들어가는 곳이라는 표시 */}
      <span className="mt-auto inline-flex min-h-10 w-fit items-center gap-1 rounded-full bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611] transition group-hover:bg-[#e7c98a]">
        열기
        <ChevronRightIcon className="size-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
