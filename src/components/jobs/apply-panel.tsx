"use client";

import { useState } from "react";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** 지원자용. 공고 상세에서 바로 지원하고, 이미 지원했으면 취소할 수 있습니다. */
export function ApplyPanel({
  postId,
  applied,
  loggedIn,
  loginHref,
}: {
  postId: string;
  applied: boolean;
  loggedIn: boolean;
  loginHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(applied);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "DELETE") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/apply`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ message }) : undefined,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "처리에 실패했습니다.");
      setDone(method === "POST");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (!loggedIn) {
    return (
      <Link
        href={loginHref}
        className="touch-target inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8b2222] text-base font-bold text-white hover:bg-[#a12a2a]"
      >
        <SendIcon className="size-4" />
        로그인하고 지원하기
      </Link>
    );
  }

  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-3 py-2.5 text-sm">
        <span className="font-semibold text-emerald-300">지원 완료</span>
        <span className="text-[#D1D5DB]">작성자가 지원 내용을 확인합니다.</span>
        <Button type="button" size="sm" variant="ghost" className="ml-auto" disabled={pending} onClick={() => void send("DELETE")}>
          지원 취소
        </Button>
        {error ? <p className="w-full text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="touch" className="w-full gap-2 text-base font-bold" onClick={() => setOpen(true)}>
        <SendIcon className="size-4" />
        이 공고에 지원하기
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#3a332c] bg-[#141110] p-3">
      <label htmlFor="apply-message" className="text-sm font-semibold text-[#E5E7EB]">
        지원 메시지 <span className="text-xs font-normal text-[#9CA3AF]">작성자에게만 보입니다</span>
      </label>
      <Textarea
        id="apply-message"
        maxLength={500}
        value={message}
        placeholder="경력, 가능한 날짜, 연락 받을 방법(연락처·오픈채팅)을 적어 주세요."
        onChange={(event) => setMessage(event.target.value)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="touch" className="flex-1" disabled={pending} onClick={() => void send("POST")}>
          {pending ? "보내는 중…" : "지원 보내기"}
        </Button>
        <Button type="button" size="touch" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
