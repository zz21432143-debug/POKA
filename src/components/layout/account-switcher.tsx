"use client";

import { useRouter } from "next/navigation";
import type { SwitchAccount } from "@/lib/switch-account";

export function AccountSwitcher({
  current,
  accounts,
}: {
  current: string;
  accounts: SwitchAccount[];
}) {
  const router = useRouter();

  async function switchTo(nickname: string) {
    if (nickname === current) return;
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    router.refresh();
  }

  return (
    <label className="mt-3 block text-xs text-muted-foreground">
      계정 전환 (관리자)
      <select
        className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-2 text-sm text-foreground"
        value={current}
        onChange={(event) => void switchTo(event.target.value)}
      >
        {accounts.map((account) => (
          <option key={account.nickname} value={account.nickname}>
            {account.nickname} · Lv.{account.level} · {account.points.toLocaleString()}P
          </option>
        ))}
      </select>
    </label>
  );
}
