import Link from "next/link";
import { LockIcon } from "lucide-react";

/** 딜러 툴 준비 중 안내(마스터 계정 외) */
export function ToolsLocked() {
  return (
    <section className="ink-panel mx-auto grid max-w-lg justify-items-center gap-3 rounded-2xl px-5 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[#2a2017] text-[#e7c98a]">
        <LockIcon className="size-7" />
      </span>
      <h1 className="text-xl font-black text-white">딜러 툴 준비 중</h1>
      <p className="text-sm leading-6 text-[#D1D5DB]">
        딜러 로테이션 관리와 DAY2 싯드로우 기능을 만들고 있습니다. 완성되면 공지로 알려 드릴게요.
      </p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-[#8b2222] px-5 text-sm font-bold text-white hover:bg-[#a12a2a]">
        홈으로
      </Link>
    </section>
  );
}
