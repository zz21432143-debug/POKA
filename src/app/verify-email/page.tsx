"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState("이메일을 확인하고 있습니다…");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("인증 링크가 올바르지 않습니다.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "verify-email", token, email }),
        });
        const data = (await response.json()) as { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error ?? "인증에 실패했습니다.");
          return;
        }
        setStatus("ok");
        setMessage("이메일 인증이 끝났습니다. 홈으로 이동합니다.");
        router.replace("/");
        router.refresh();
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("네트워크 오류입니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, email, router]);

  return (
    <article className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-semibold">이메일 인증</h1>
      <p className={`mt-3 text-sm leading-6 ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
        {message}
      </p>
      {status === "error" ? (
        <Button className="mt-4" onClick={() => router.push("/login")}>
          로그인으로
        </Button>
      ) : null}
    </article>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">인증 페이지를 여는 중…</p>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
