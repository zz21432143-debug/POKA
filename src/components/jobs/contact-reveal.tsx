"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ContactReveal({
  contact,
  loggedIn,
}: {
  contact: string | null;
  loggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!contact) {
    return <p className="text-sm text-muted-foreground">등록된 연락처가 없습니다.</p>;
  }

  if (!loggedIn) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        비회원에게는 연락처를 보여 주지 않습니다. 로그인 후 확인해 주세요.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="touch" variant="outline" onClick={() => setOpen(true)}>
        로그인 후 연락처 보기
      </Button>
    );
  }

  return (
    <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 font-medium">
      {contact}
    </p>
  );
}
