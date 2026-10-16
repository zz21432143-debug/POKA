"use client";

import { useState } from "react";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "cn";

/** 글 삭제 버튼. 한 번 더 묻고 지운 뒤 목록으로 돌아갑니다. */
export function DeletePostButton({
  postId,
  afterHref,
  label = "삭제",
  className,
  tone = "dark",
}: {
  postId: string;
  /** 지운 뒤 갈 곳. 비우면 지금 화면을 새로 고칩니다. */
  afterHref?: string;
  label?: string;
  className?: string;
  /** dark: 어두운 바탕용, paper: 흰 종이 위용 */
  tone?: "dark" | "paper";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!window.confirm("이 글을 삭제할까요?\n삭제하면 목록과 검색에서 사라집니다.")) return;
    setPending(true);
    const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      window.alert(payload.error ?? "삭제에 실패했습니다.");
      setPending(false);
      return;
    }
    if (afterHref) router.replace(afterHref);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void remove()}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold disabled:opacity-50",
        tone === "paper"
          ? "border-red-600/40 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-rose-500/70 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
        className,
      )}
    >
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
      {label}
    </button>
  );
}

/** 글 상세 위쪽에 크게 보이는 수정·삭제 막대(글쓴이·관리자, 공식 게시판은 POKA 계정에게만 보임) */
export function PostManageBar({ postId, listHref }: { postId: string; listHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="mr-auto text-xs font-semibold text-[#9CA3AF]">내가 관리하는 글</span>
      <Link
        href={`/posts/${postId}/edit`}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#c9a25c]/70 bg-[#c9a25c]/15 px-3 text-sm font-bold text-[#f3dca6] hover:bg-[#c9a25c]/25"
      >
        <PencilIcon className="size-4" />
        수정
      </Link>
      <DeletePostButton postId={postId} afterHref={listHref} />
    </div>
  );
}
