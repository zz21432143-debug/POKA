"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ nextPath = "/" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: mode, nickname, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "처리할 수 없습니다.");
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="touch" disabled={pending}>
        {pending ? "처리 중…" : mode === "login" ? "로그인" : "가입하고 시작"}
      </Button>
    </form>
  );
}
