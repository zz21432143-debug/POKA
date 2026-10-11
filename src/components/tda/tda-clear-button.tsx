"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";

/** TDA 룰 게시판 글 모두 삭제(마스터 전용). "전체 삭제"를 직접 입력해야 지워집니다. */
export function TdaClearButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function clear() {
    const typed = window.prompt(`TDA 룰 글 ${count}개를 모두 삭제합니다.\n계속하려면 "전체 삭제"를 입력하세요.`);
    if (typed === null) return;
    if (typed.trim() !== "전체 삭제") {
      window.alert("확인 문구가 달라 삭제하지 않았습니다.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/tda/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "전체 삭제" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; count?: number };
    setPending(false);
    if (!response.ok) {
      window.alert(payload.error ?? "삭제에 실패했습니다.");
      return;
    }
    window.alert(`${payload.count ?? 0}개를 삭제했습니다.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending || count === 0}
      onClick={() => void clear()}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-500/70 bg-rose-500/10 px-3 text-sm font-bold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
    >
      <Trash2Icon className="size-4" />
      TDA 글 전체 삭제
    </button>
  );
}
