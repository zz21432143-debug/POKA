"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
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
        }),
      });
      const data = (await response.json()) as { error?: string; code?: string; hint?: string };
      if (!response.ok) {
        setError(data.error ?? "처리할 수 없습니다.");
        return;
      }
      if (mode === "forgot" && data.code) {
        setInfo(`${data.hint ?? ""} 코드: ${data.code}`);
        setMode("reset");
        setCode(data.code);
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

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <a
        href="/api/auth/kakao"
        className="touch-target flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-bold text-[#191919] hover:bg-[#f5dc00]"
      >
        카카오로 시작하기
      </a>
      <p className="text-center text-[11px] text-muted-foreground">또는 닉네임으로</p>
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
        <Input id="company" value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} />
      </div>
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
      <Button type="submit" size="touch" disabled={pending}>
        {pending
          ? "처리 중…"
          : mode === "login"
            ? "로그인"
            : mode === "register"
              ? "가입하고 시작"
              : mode === "forgot"
                ? "재설정 코드 받기"
                : "비밀번호 바꾸기"}
      </Button>
      {mode === "login" ? (
        <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
          비밀번호를 잊었어요
        </button>
      ) : (
        <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
          로그인으로
        </button>
      )}
    </form>
  );
}
