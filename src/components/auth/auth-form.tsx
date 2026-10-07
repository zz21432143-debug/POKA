"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADULT_ONLY_TEXT, MEMBER_LIABILITY_TEXT } from "@/lib/legal";

type Mode = "login" | "register" | "forgot" | "reset";

export function AuthForm({
  nextPath = "/",
  initialEmail = "",
  initialVerifyFail = false,
}: {
  nextPath?: string;
  initialEmail?: string;
  initialVerifyFail?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaPrompt, setCaptchaPrompt] = useState("문제를 불러오는 중…");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [terms, setTerms] = useState<"agree" | "disagree" | null>(null);
  const [adult, setAdult] = useState<"agree" | "disagree" | null>(null);
  const [error, setError] = useState<string | null>(
    initialVerifyFail ? "이메일 인증에 실패했습니다. 코드를 다시 받거나 링크를 다시 열어 주세요." : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(initialVerifyFail && Boolean(initialEmail));
  const [pending, setPending] = useState(false);

  async function loadCaptcha() {
    try {
      const response = await fetch("/api/auth/captcha", { cache: "no-store" });
      const data = (await response.json()) as { token?: string; prompt?: string };
      setCaptchaToken(data.token ?? "");
      setCaptchaPrompt(data.prompt ?? "1 + 1 = ?");
      setCaptchaAnswer("");
    } catch {
      setCaptchaPrompt("문제를 다시 받아 주세요.");
    }
  }

  useEffect(() => {
    if (mode === "register") void loadCaptcha();
  }, [mode]);

  function applyVerify(data: { hint?: string; verifyUrl?: string; verifyCode?: string; email?: string; needsVerify?: boolean }) {
    if (data.email) setEmail(data.email);
    if (data.hint) setInfo(data.hint);
    setVerifyUrl(data.verifyUrl ?? null);
    setVerifyCode(data.verifyCode ?? null);
    if (data.needsVerify || data.verifyUrl || data.verifyCode) setNeedsVerify(true);
  }

  async function submit() {
    setPending(true);
    setError(null);
    setInfo(null);
    if (mode === "register") {
      setVerifyUrl(null);
      setVerifyCode(null);
    }
    try {
      if (mode === "register") {
        if (adult !== "agree") {
          setError("가입하려면 ‘만 19세 이상입니다’를 선택하세요.");
          return;
        }
        if (terms !== "agree") {
          setError("미동의 시 회원가입할 수 없습니다. 동의를 선택하세요.");
          return;
        }
      }
      const action = mode === "forgot" ? "forgot" : mode === "reset" ? "reset" : mode;
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          nickname,
          password,
          newPassword,
          code,
          company,
          website,
          email,
          captchaToken,
          captchaAnswer,
          termsAccepted: terms === "agree",
          adultConfirmed: adult === "agree",
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        hint?: string;
        needsVerify?: boolean;
        verifyUrl?: string;
        verifyCode?: string;
        email?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "처리할 수 없습니다.");
        applyVerify(data);
        if (mode === "register") void loadCaptcha();
        return;
      }
      if (mode === "forgot" && data.code) {
        setInfo(`${data.hint ?? ""} 코드: ${data.code}`);
        setMode("reset");
        setCode(data.code);
        return;
      }
      if (data.needsVerify) {
        applyVerify(data);
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch {
      setError("네트워크 오류입니다.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!email.trim()) {
      setError("인증 메일을 다시 받으려면 이메일을 입력하세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resend-verify", email }),
      });
      const data = (await response.json()) as {
        error?: string;
        hint?: string;
        verifyUrl?: string;
        verifyCode?: string;
        email?: string;
        needsVerify?: boolean;
      };
      if (!response.ok) {
        setError(data.error ?? "다시 보낼 수 없습니다.");
        return;
      }
      applyVerify(data);
    } catch {
      setError("네트워크 오류입니다.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCode() {
    const secret = (code.trim() || verifyCode || "").trim();
    if (!email.trim() || !secret) {
      setError("이메일과 인증 코드를 입력하세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify-email", email, token: secret, code: secret }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "인증에 실패했습니다.");
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch {
      setError("네트워크 오류입니다.");
    } finally {
      setPending(false);
    }
  }

  const showVerifyPanel = needsVerify || Boolean(verifyUrl) || Boolean(verifyCode) || Boolean(info && mode === "register");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {mode === "login" || mode === "register" ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-sm font-medium ${mode === "login" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-sm font-medium ${mode === "register" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            onClick={() => setMode("register")}
          >
            가입
          </button>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          autoComplete="username"
          maxLength={12}
        />
      </div>
      <div className="hidden" aria-hidden>
        <Label htmlFor="company">회사</Label>
        <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off" />
        <Label htmlFor="website">웹사이트</Label>
        <Input id="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </div>
      {mode === "register" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
      ) : null}
      {mode === "login" || mode === "register" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
      ) : null}
      {mode === "register" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="captcha">봇 확인 · {captchaPrompt}</Label>
            <div className="flex gap-2">
              <Input
                id="captcha"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value)}
                autoComplete="off"
              />
              <Button type="button" variant="outline" onClick={() => void loadCaptcha()}>
                새로
              </Button>
            </div>
          </div>
          <fieldset className="rounded-2xl border border-border bg-muted/40 p-3">
            <legend className="px-1 text-sm font-semibold">연령 확인</legend>
            <p className="text-sm leading-6">{ADULT_ONLY_TEXT}</p>
            <button
              type="button"
              className={`mt-3 min-h-11 rounded-full px-4 text-sm font-semibold ${
                adult === "agree" ? "bg-primary text-white" : "border border-border bg-white"
              }`}
              onClick={() => setAdult(adult === "agree" ? null : "agree")}
            >
              만 19세 이상입니다
            </button>
          </fieldset>
          <fieldset className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
            <legend className="px-1 text-sm font-semibold text-amber-950">작성 책임 동의</legend>
            <p className="text-sm leading-6 text-amber-950">{MEMBER_LIABILITY_TEXT}</p>
            <p className="mt-1 text-xs text-amber-800">미동의 시 회원가입할 수 없습니다.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  terms === "agree" ? "bg-primary text-white" : "border border-border bg-white"
                }`}
                onClick={() => setTerms("agree")}
              >
                동의
              </button>
              <button
                type="button"
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  terms === "disagree" ? "bg-destructive text-white" : "border border-border bg-white"
                }`}
                onClick={() => setTerms("disagree")}
              >
                미동의
              </button>
            </div>
          </fieldset>
        </>
      ) : null}
      {mode === "reset" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="code">재설정 코드</Label>
            <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
        </>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-primary">{info}</p> : null}
      {showVerifyPanel ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">이메일 인증</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            지금은 인증 메일이 자동으로 도착하지 않을 수 있습니다. 링크를 열거나 6자리 코드를 입력하세요.
          </p>
          {mode === "login" ? (
            <div className="mt-2 grid gap-1.5">
              <Label htmlFor="verify-email">인증 이메일</Label>
              <Input
                id="verify-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
          ) : null}
          {verifyCode ? (
            <p className="mt-2 text-center font-mono text-2xl font-semibold tracking-[0.35em] text-foreground">{verifyCode}</p>
          ) : null}
          <div className="mt-2 grid gap-1.5">
            <Label htmlFor="verify-code">인증 코드</Label>
            <Input
              id="verify-code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={verifyCode ?? "6자리"}
              autoComplete="one-time-code"
            />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {verifyUrl ? (
              <Link
                href={verifyUrl}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground"
              >
                이메일 인증 링크 열기
              </Link>
            ) : null}
            <Button type="button" variant={verifyUrl ? "outline" : "default"} size="touch" disabled={pending} onClick={() => void confirmCode()}>
              코드로 인증 완료
            </Button>
            <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => void resend()}>
              인증 메일·코드 다시 받기
            </button>
          </div>
        </div>
      ) : null}
      <Button
        type="submit"
        size="touch"
        disabled={pending || (mode === "register" && terms === "disagree")}
      >
        {pending
          ? "처리 중…"
          : mode === "login"
            ? "로그인"
            : mode === "register"
              ? "가입하고 이메일 인증"
              : mode === "forgot"
                ? "재설정 코드 받기"
                : "비밀번호 바꾸기"}
      </Button>
      {mode === "login" ? (
        <div className="flex flex-col items-start gap-1">
          <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
            비밀번호를 잊었어요
          </button>
        </div>
      ) : (
        <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
          로그인으로
        </button>
      )}
    </form>
  );
}
