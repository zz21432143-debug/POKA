"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountWithdrawPanel({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function withdraw() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "탈퇴에 실패했습니다.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "탈퇴에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-destructive/30 bg-card p-4">
      <h2 className="text-lg font-semibold">회원 탈퇴</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        탈퇴하면 소셜 ID·이메일·닉네임은 바로 지웁니다. 작성한 글과 댓글은 남고, 작성자는 탈퇴한 회원으로
        보입니다. 구인 글에 적은 연락처는 삭제합니다.
      </p>
      <div className="mt-3 grid gap-2">
        <Label htmlFor="withdraw-nick">확인을 위해 닉네임 입력</Label>
        <Input
          id="withdraw-nick"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder={nickname}
          autoComplete="off"
        />
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/account"
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 text-base font-medium hover:bg-muted"
        >
          내 정보로 돌아가기
        </Link>
        <Button
          type="button"
          size="touch"
          variant="destructive"
          disabled={pending || confirm !== nickname}
          onClick={() => void withdraw()}
        >
          {pending ? "처리 중…" : "탈퇴하기"}
        </Button>
      </div>
    </section>
  );
}
