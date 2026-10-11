"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpToLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 작성자용 끌어올리기 버튼. 다음 가능 시각은 서버가 계산해 넘깁니다. */
export function BumpButton({
  postId,
  nextAt,
  waiting,
}: {
  postId: string;
  nextAt: string | null;
  /** 아직 하루가 안 지났는지. 서버에서 계산합니다. */
  waiting: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function bump() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/posts/${postId}/bump`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "끌어올리지 못했습니다.");
      setMessage("목록 맨 위로 올렸습니다.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "끌어올리지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  const when = nextAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(nextAt))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="touch" variant="outline" disabled={pending || waiting} onClick={() => void bump()}>
        <ArrowUpToLineIcon className="size-4" />
        {pending ? "올리는 중…" : "공고 끌어올리기"}
      </Button>
      <span className="text-xs text-[#9CA3AF]">
        {message ?? (waiting && when ? `${when} 이후 다시 올릴 수 있어요 (하루 1회)` : "하루 1회 목록 맨 위로 올립니다")}
      </span>
    </div>
  );
}
