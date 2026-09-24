"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="touch-target flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-semibold text-muted-foreground hover:bg-muted"
      onClick={async () => {
        await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "logout" }),
        });
        router.push("/");
        router.refresh();
      }}
    >
      로그아웃
    </button>
  );
}
