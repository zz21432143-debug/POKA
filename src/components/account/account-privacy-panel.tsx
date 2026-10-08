"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KAKAO_INQUIRY_ID } from "@/lib/kakao";
import { publicContactEmail } from "@/lib/legal-contact";

export function AccountPrivacyPanel({
  nickname,
  email,
  changeCount,
  tickets,
}: {
  nickname: string;
  email: string | null;
  changeCount: number;
  tickets: number;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [nextNick, setNextNick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nickError, setNickError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [nickPending, setNickPending] = useState(false);
  const contact = publicContactEmail();
  const freeLeft = changeCount <= 0;

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

  async function changeNick() {
    setNickPending(true);
    setNickError(null);
    try {
      const response = await fetch("/api/account/nickname", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: nextNick }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "닉네임을 바꾸지 못했습니다.");
      setNextNick("");
      router.refresh();
    } catch (err) {
      setNickError(err instanceof Error ? err.message : "닉네임을 바꾸지 못했습니다.");
    } finally {
      setNickPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">내 정보</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">닉네임</dt>
            <dd className="break-words font-medium">{nickname}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">이메일</dt>
            <dd className="break-all">{email || "소셜 제공자가 이메일을 주지 않았습니다."}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          이 화면의 이메일은 본인만 보입니다. 정정·삭제는 {contact} 또는 카카오톡 ID {KAKAO_INQUIRY_ID}로 요청해
          주세요.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">닉네임 변경</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          최초 1회는 무료입니다. 그다음부터는 상점에서 닉네임 변경권(500P)을 산 뒤 바꿀 수 있습니다. 보유
          변경권 {tickets}장.
        </p>
        {freeLeft ? (
          <p className="mt-1 text-sm font-medium text-primary">지금 한 번은 무료로 바꿀 수 있습니다.</p>
        ) : null}
        <div className="mt-3 grid gap-2">
          <Label htmlFor="next-nick">새 닉네임</Label>
          <Input
            id="next-nick"
            value={nextNick}
            onChange={(event) => setNextNick(event.target.value)}
            maxLength={12}
            placeholder="2~12자"
          />
        </div>
        {nickError ? <p className="mt-2 text-sm text-destructive">{nickError}</p> : null}
        <Button
          type="button"
          size="touch"
          className="mt-3"
          disabled={nickPending || nextNick.trim().length < 2}
          onClick={() => void changeNick()}
        >
          {nickPending ? "변경 중…" : freeLeft ? "무료로 변경" : "변경권으로 변경"}
        </Button>
      </section>

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
        <Button
          type="button"
          size="touch"
          variant="destructive"
          className="mt-3"
          disabled={pending || confirm !== nickname}
          onClick={() => void withdraw()}
        >
          {pending ? "처리 중…" : "탈퇴하기"}
        </Button>
      </section>
    </div>
  );
}
