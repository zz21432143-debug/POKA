"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [nextNick, setNextNick] = useState("");
  const [nickError, setNickError] = useState<string | null>(null);
  const [nickOk, setNickOk] = useState<string | null>(null);
  const [nickPending, setNickPending] = useState(false);
  const [checkPending, setCheckPending] = useState(false);
  const contact = publicContactEmail();
  const freeLeft = changeCount <= 0;

  async function checkNick() {
    setCheckPending(true);
    setNickError(null);
    setNickOk(null);
    try {
      const response = await fetch(`/api/account/nickname?nickname=${encodeURIComponent(nextNick)}`);
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setNickError(data.error ?? "쓸 수 없는 닉네임입니다.");
        return;
      }
      setNickOk("사용 가능한 닉네임입니다.");
    } catch {
      setNickError("확인할 수 없습니다.");
    } finally {
      setCheckPending(false);
    }
  }

  async function changeNick() {
    setNickPending(true);
    setNickError(null);
    setNickOk(null);
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
          변경권 {tickets}장. POKA·운영자·관리자처럼 운영 계정으로 보이는 이름은 쓸 수 없습니다.
        </p>
        {freeLeft ? (
          <p className="mt-1 text-sm font-medium text-primary">지금 한 번은 무료로 바꿀 수 있습니다.</p>
        ) : null}
        <div className="mt-3 grid gap-2">
          <Label htmlFor="next-nick">새 닉네임</Label>
          <Input
            id="next-nick"
            value={nextNick}
            onChange={(event) => {
              setNextNick(event.target.value);
              setNickError(null);
              setNickOk(null);
            }}
            maxLength={12}
            placeholder="2~12자"
          />
        </div>
        {nickError ? <p className="mt-2 text-sm text-destructive">{nickError}</p> : null}
        {nickOk ? <p className="mt-2 text-sm text-emerald-700">{nickOk}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={checkPending || nextNick.trim().length < 2}
            onClick={() => void checkNick()}
          >
            {checkPending ? "확인 중…" : "중복 확인"}
          </Button>
          <Button
            type="button"
            size="touch"
            disabled={nickPending || nextNick.trim().length < 2}
            onClick={() => void changeNick()}
          >
            {nickPending ? "변경 중…" : freeLeft ? "무료로 변경" : "변경권으로 변경"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">회원 탈퇴</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          탈퇴는 이 화면이 아니라 아래 탈퇴 페이지에서 진행합니다. 탈퇴하면 같은 카카오·구글 계정으로 7일 동안
          다시 가입할 수 없습니다.
        </p>
        <Link
          href="/account/withdraw"
          className="mt-3 inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-border px-4 text-base font-medium hover:bg-muted"
        >
          탈퇴 화면으로
        </Link>
      </section>
    </div>
  );
}
