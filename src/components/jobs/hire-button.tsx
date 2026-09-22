"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function HireButton({ postId, filled }: { postId: string; filled: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(filled);
  const [pending, setPending] = useState(false);

  async function mark() {
    setPending(true);
    try {
      const response = await fetch(`/api/posts/${postId}/filled`, { method: "POST" });
      if (!response.ok) throw new Error("실패");
      setDone(true);
      router.refresh();
    } catch {
      setDone(false);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <p className="text-sm text-primary">채용이 완료된 공고입니다.</p>;
  }

  return (
    <Button type="button" size="touch" variant="outline" disabled={pending} onClick={() => void mark()}>
      {pending ? "처리 중…" : "채용 완료"}
    </Button>
  );
}
