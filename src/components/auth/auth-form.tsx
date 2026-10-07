"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalDetailDialog } from "@/components/legal/legal-detail-dialog";
import {
  ADULT_ONLY_TEXT,
  MEMBER_LIABILITY_TEXT,
  PRIVACY_CONSENT_SECTIONS,
  TERMS_SECTIONS,
} from "@/lib/legal";

type Provider = "kakao" | "google";

export function AuthForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | "ops" | null>(null);
  const [opsNickname, setOpsNickname] = useState("");
  const [opsPassword, setOpsPassword] = useState("");

  function requireConsents() {
    if (!adult || !terms || !privacy) {
      setError("만 19세 확인, 이용약관 및 작성 책임, 개인정보 수집·이용에 모두 동의해 주세요.");
      return false;
    }
    return true;
  }

  async function startSocial(provider: Provider) {
    setError(null);
    if (!requireConsents()) return;
    setPending(provider);
    try {
      const response = await fetch("/api/auth/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adult: true,
          terms: true,
          privacy: true,
          next: nextPath,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "동의 저장에 실패했습니다.");
        return;
      }
      const next = nextPath.startsWith("/") ? nextPath : "/";
      window.location.assign(`/api/auth/${provider}?next=${encodeURIComponent(next)}`);
    } catch {
      setError("네트워크 오류입니다.");
    } finally {
      setPending(null);
    }
  }

  async function opsLogin() {
    setError(null);
    setPending("ops");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "login",
          nickname: opsNickname,
          password: opsPassword,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "운영 계정으로 들어갈 수 없습니다.");
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch {
      setError("네트워크 오류입니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="rounded-2xl border border-border bg-muted/40 p-3">
        <legend className="px-1 text-sm font-semibold">필수 동의</legend>
        <p className="text-sm leading-6 text-muted-foreground">{ADULT_ONLY_TEXT}</p>
        <p className="mt-2 text-sm leading-6 text-foreground">{MEMBER_LIABILITY_TEXT}</p>
        <ul className="mt-3 flex flex-col gap-3">
          <li className="flex items-start gap-2">
            <input
              id="consent-adult"
              type="checkbox"
              className="mt-1 size-4"
              checked={adult}
              onChange={(event) => setAdult(event.target.checked)}
            />
            <Label htmlFor="consent-adult" className="text-sm font-medium leading-6">
              만 19세 이상입니다
            </Label>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="consent-terms"
              type="checkbox"
              className="mt-1 size-4"
              checked={terms}
              onChange={(event) => setTerms(event.target.checked)}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Label htmlFor="consent-terms" className="text-sm font-medium leading-6">
                이용약관 및 작성 책임 동의
              </Label>
              <LegalDetailDialog label="상세보기" heading="이용약관" sections={TERMS_SECTIONS} />
            </div>
          </li>
          <li className="flex items-start gap-2">
            <input
              id="consent-privacy"
              type="checkbox"
              className="mt-1 size-4"
              checked={privacy}
              onChange={(event) => setPrivacy(event.target.checked)}
            />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Label htmlFor="consent-privacy" className="text-sm font-medium leading-6">
                개인정보 수집 및 이용 동의
              </Label>
              <LegalDetailDialog
                label="상세보기"
                heading="개인정보 수집 및 이용"
                sections={PRIVACY_CONSENT_SECTIONS}
              />
            </div>
          </li>
        </ul>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="touch"
          className="h-12 w-full rounded-xl border-0 bg-[#FEE500] text-base font-semibold text-[#191919] hover:bg-[#F6DC00]"
          disabled={pending !== null}
          onClick={() => void startSocial("kakao")}
        >
          {pending === "kakao" ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={pending !== null}
          onClick={() => void startSocial("google")}
        >
          {pending === "google" ? "구글로 이동 중…" : "구글로 시작하기"}
        </Button>
      </div>

      <details className="rounded-2xl border border-dashed border-border p-3">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">운영 계정</summary>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void opsLogin();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ops-nickname">닉네임</Label>
            <Input
              id="ops-nickname"
              value={opsNickname}
              onChange={(event) => setOpsNickname(event.target.value)}
              autoComplete="username"
              maxLength={12}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ops-password">비밀번호</Label>
            <Input
              id="ops-password"
              type="password"
              value={opsPassword}
              onChange={(event) => setOpsPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" size="touch" variant="secondary" disabled={pending !== null}>
            {pending === "ops" ? "처리 중…" : "운영 계정으로 들어가기"}
          </Button>
        </form>
      </details>
    </div>
  );
}
