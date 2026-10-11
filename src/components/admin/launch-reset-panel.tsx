"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RESET_CONFIRM_TEXT, RESET_GROUPS, type ResetGroup } from "@/lib/launch-reset";

export function LaunchResetPanel({ counts }: { counts: Record<ResetGroup, number> }) {
  const router = useRouter();
  const keys = Object.keys(RESET_GROUPS) as ResetGroup[];
  const [picked, setPicked] = useState<ResetGroup[]>(keys);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const total = picked.reduce((sum, key) => sum + (counts[key] ?? 0), 0);

  function toggle(key: ResetGroup) {
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/launch-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: picked, confirm }),
      });
      const payload = (await response.json()) as { deleted?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "삭제에 실패했습니다.");
      setResult(`게시물 ${payload.deleted ?? 0}개를 삭제했습니다.`);
      setConfirm("");
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-destructive/50 bg-[#1a1213] p-4">
      <p className="text-sm leading-6 text-[#f3d7c8]">
        고른 묶음의 게시물을 <strong>모두 삭제</strong>합니다. 댓글·추천·신고·지원 기록도 함께 지워지며{" "}
        <strong>되돌릴 수 없습니다</strong>. 회원 계정, 포인트, 마크는 그대로 남습니다.
      </p>
      <ul className="flex flex-col gap-2">
        {keys.map((key) => (
          <li key={key}>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm">
              <input type="checkbox" className="size-5" checked={picked.includes(key)} onChange={() => toggle(key)} />
              <span className="flex-1 text-[#E5E7EB]">{RESET_GROUPS[key].label}</span>
              <span className="text-xs text-[#9CA3AF]">{counts[key] ?? 0}개</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="grid gap-2">
        <label htmlFor="reset-confirm" className="text-sm text-[#E5E7EB]">
          확인을 위해 <strong className="text-white">{RESET_CONFIRM_TEXT}</strong> 를 입력하세요
        </label>
        <Input id="reset-confirm" className="h-11" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </div>
      <Button
        type="button"
        size="touch"
        variant="destructive"
        disabled={pending || picked.length === 0 || confirm !== RESET_CONFIRM_TEXT}
        onClick={() => void run()}
      >
        {pending ? "삭제 중…" : `고른 게시물 ${total}개 삭제`}
      </Button>
      {result ? <p className="text-sm font-semibold text-white">{result}</p> : null}
    </div>
  );
}
