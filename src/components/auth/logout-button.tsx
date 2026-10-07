"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/lib/logout-action";

function LogoutSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="touch-target flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction} className="w-full">
      <LogoutSubmit />
    </form>
  );
}
