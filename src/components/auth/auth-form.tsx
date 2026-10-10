"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LegalDetailDialog } from "@/components/legal/legal-detail-dialog";
import {
  ADULT_ONLY_TEXT,
  MEMBER_LIABILITY_TEXT,
  PRIVACY_CONSENT_SECTIONS,
  TERMS_SECTIONS,
} from "@/lib/legal";

type Provider = "kakao" | "google";

export function AuthForm({
  nextPath = "/",
  mode = "login",
}: {
  nextPath?: string;
  mode?: "login" | "signup";
}) {
  const signup = mode === "signup";
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);

  function requireConsents() {
    if (!adult || !terms || !privacy) {
      setError("만 19세 확인, 이용약관 및 작성 책임, 개인정보 수집·이용에 모두 동의해 주세요.");
      return false;
    }
    return true;
  }

  async function startSocial(provider: Provider) {
    setError(null);
    if (signup && !requireConsents()) return;
    const next = nextPath.startsWith("/") ? nextPath : "/";
    const intent = signup ? "signup" : "login";
    setPending(provider);
    try {
      if (signup) {
        const response = await fetch("/api/auth/consent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            adult: true,
            terms: true,
            privacy: true,
            next,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error ?? "동의 저장에 실패했습니다.");
          setPending(null);
          return;
        }
      }
    } catch {
      setError("네트워크 오류입니다.");
      setPending(null);
      return;
    }
    window.location.assign(
      `/api/auth/${provider}?intent=${intent}&next=${encodeURIComponent(next)}`,
    );
  }

  const ready = adult && terms && privacy;

  return (
    <div className="flex flex-col gap-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="touch"
          className="h-12 w-full rounded-xl border-0 bg-[#c59b27] text-base font-semibold text-[#1c1408] hover:bg-[#b38c22]"
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
        {signup && !ready ? (
          <p className="text-xs leading-5 text-muted-foreground">
            아래 필수 항목 3개에 모두 동의한 뒤에 가입이 진행됩니다.
          </p>
        ) : null}
      </div>

      {signup ? (
        <fieldset className="rounded-2xl border border-border bg-muted/40 p-3">
        <legend className="px-1 text-sm font-semibold">필수 동의</legend>
        <p className="text-sm leading-6 text-muted-foreground">{ADULT_ONLY_TEXT}</p>
        <p className="mt-2 text-sm leading-6 text-foreground">{MEMBER_LIABILITY_TEXT}</p>
        <ul className="mt-3 flex flex-col gap-3">
          <li className="flex items-start gap-2">
            <span className="touch-check">
              <input
                id="consent-adult"
                type="checkbox"
                checked={adult}
                onChange={(event) => setAdult(event.target.checked)}
              />
            </span>
            <Label htmlFor="consent-adult" className="text-sm font-medium leading-6">
              [필수] 만 19세 이상입니다
            </Label>
          </li>
          <li className="flex items-start gap-2">
            <span className="touch-check">
              <input
                id="consent-terms"
                type="checkbox"
                checked={terms}
                onChange={(event) => setTerms(event.target.checked)}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Label htmlFor="consent-terms" className="text-sm font-medium leading-6">
                [필수] 이용약관 동의
              </Label>
              <LegalDetailDialog label="상세보기" heading="POKA 이용약관" sections={TERMS_SECTIONS} />
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="touch-check">
              <input
                id="consent-privacy"
                type="checkbox"
                checked={privacy}
                onChange={(event) => setPrivacy(event.target.checked)}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Label htmlFor="consent-privacy" className="text-sm font-medium leading-6">
                [필수] 개인정보 수집 동의
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
      ) : null}

    </div>
  );
}
