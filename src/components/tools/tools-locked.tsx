import Link from "next/link";
import { LockIcon } from "lucide-react";
import { DEALER_TOOLS_OPEN } from "@/lib/dealer-tools-access";

/** 딜러 툴 안내: 공개 중이면 로그인 안내, 비공개면 제작 중 안내 */
export function ToolsLocked({ next = "/tools" }: { next?: string }) {
  return (
    <section className="ink-panel mx-auto grid max-w-lg justify-items-center gap-3 rounded-2xl px-5 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[#2a2017] text-[#e7c98a]">
        <LockIcon className="size-7" />
      </span>
      <h1 className="text-xl font-black text-white">{DEALER_TOOLS_OPEN ? "로그인하면 쓸 수 있어요" : "제작중"}</h1>
      <p className="text-sm leading-6 text-[#D1D5DB]">
        {DEALER_TOOLS_OPEN
          ? "딜러 로테이션 · 싯드로우 · 급여 계산기는 POKA 회원이면 무료로 쓸 수 있습니다."
          : "새 기능을 만들고 있습니다. 완성되면 공지로 알려 드릴게요."}
      </p>
      <Link
        href={DEALER_TOOLS_OPEN ? `/login?tab=login&next=${encodeURIComponent(next)}` : "/"}
        className="inline-flex min-h-11 items-center rounded-xl bg-[#8b2222] px-5 text-sm font-bold text-white hover:bg-[#a12a2a]"
      >
        {DEALER_TOOLS_OPEN ? "로그인 / 회원가입" : "홈으로"}
      </Link>
    </section>
  );
}
