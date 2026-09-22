"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ContactReveal({
  postId,
  hasContact,
  loggedIn,
}: {
  postId: string;
  hasContact: boolean;
  loggedIn: boolean;
}) {
  const [contact, setContact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!hasContact) {
    return <p className="text-sm text-muted-foreground">등록된 연락처가 없습니다.</p>;
  }

  if (!loggedIn) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        비회원에게는 연락처를 보여 주지 않습니다. 로그인 후 확인해 주세요.
      </p>
    );
  }

  if (contact) {
    return (
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 font-medium">
        {contact}
      </p>
    );
  }

  async function reveal() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/contact`);
      const payload = (await response.json()) as { contact?: string; error?: string };
      if (!response.ok || !payload.contact) {
        throw new Error(payload.error ?? "연락처를 불러오지 못했습니다.");
      }
      setContact(payload.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "연락처를 불러오지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="touch" variant="outline" disabled={pending} onClick={() => void reveal()}>
        {pending ? "불러오는 중…" : "로그인 후 연락처 보기"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
