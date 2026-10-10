"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockPostForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "비밀번호가 맞지 않습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호가 맞지 않습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#c59b27]/30 bg-[#1A1617] p-4 text-[#E5E7EB]">
      <h2 className="text-lg font-semibold">비밀글입니다</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        작성자와 관리자가 아니면 비밀번호를 입력해야 본문을 볼 수 있습니다.
      </p>
      <div className="mt-3 grid gap-2">
        <Label htmlFor="unlock-password">비밀번호</Label>
        <Input
          id="unlock-password"
          type="password"
          minLength={4}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" className="mt-3" disabled={pending} onClick={() => void submit()}>
        {pending ? "확인 중…" : "본문 열기"}
      </Button>
    </div>
  );
}
