"use client";

import { useFormStatus } from "react-dom";
import { logoutAction } from "@/lib/logout-action";

function LogoutSubmit({ variant }: { variant: "button" | "row" }) {
  const { pending } = useFormStatus();
  if (variant === "row") {
    return (
      <button
        type="submit"
        disabled={pending}
        className="touch-target flex min-h-10 w-full items-center justify-between border-t border-[#eee4d2] px-0.5 text-[13px] font-medium text-[#2b271f] hover:text-primary disabled:opacity-60"
      >
        {pending ? "로그아웃 중…" : "로그아웃"}
        <span className="text-[#b8ae9c]" aria-hidden>
          ›
        </span>
      </button>
    );
  }
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

export function LogoutButton({ variant = "button" }: { variant?: "button" | "row" }) {
  return (
    <form action={logoutAction} className="w-full">
      <LogoutSubmit variant={variant} />
    </form>
  );
}
