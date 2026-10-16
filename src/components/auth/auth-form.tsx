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
          data-login-kakao
          className="h-12 w-full gap-2 rounded-xl border-0 bg-[#FEE500] text-base font-bold text-black/85 hover:bg-[#f5dc00]"
          disabled={pending !== null}
          onClick={() => void startSocial("kakao")}
        >
          {/* 카카오 말풍선(카카오 로그인 버튼 모양) */}
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-black/85">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.88 5.37 4.71 6.78-.2.74-.74 2.7-.85 3.12-.13.52.19.51.4.37.17-.11 2.66-1.8 3.73-2.53.65.09 1.32.14 2.01.14 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
          </svg>
          {pending === "kakao" ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          data-login-google
          className="h-12 w-full gap-2 rounded-xl border-[#dadce0] bg-white text-base font-semibold text-[#1f1f1f] hover:bg-[#f5f5f5] hover:text-[#1f1f1f]"
          disabled={pending !== null}
          onClick={() => void startSocial("google")}
        >
          {/* 구글 G 로고 */}
          <svg aria-hidden viewBox="0 0 48 48" className="size-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
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
