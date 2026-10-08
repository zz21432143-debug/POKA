"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SANCTION_BUTTONS, type SanctionAction } from "@/lib/sanctions";

export type SanctionUser = {
  id: string;
  nickname: string;
  email?: string | null;
  signupIp?: string | null;
  status: string;
  suspendedUntil: string | null;
  banReason: string | null;
};

export function SanctionAdmin({
  restricted,
  initialMatches,
  initialQuery,
}: {
  restricted: SanctionUser[];
  initialMatches: SanctionUser[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [matches, setMatches] = useState(initialMatches);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function search() {
    const response = await fetch(`/api/admin/sanctions?q=${encodeURIComponent(query)}`);
    const data = (await response.json()) as { matches?: SanctionUser[]; error?: string };
    setMatches(data.matches ?? []);
    if (data.error) setMessage(data.error);
  }

  async function apply(userId: string, action: SanctionAction) {
    setPending(`${userId}:${action}`);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/sanctions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "처리에 실패했습니다.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  function actions(user: SanctionUser) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {SANCTION_BUTTONS.map((item) => (
          <Button
            key={item.action}
            type="button"
            size="touch"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void apply(user.id, item.action)}
          >
            {item.label}
          </Button>
        ))}
        {user.status !== "ACTIVE" ? (
          <Button
            type="button"
            size="touch"
            disabled={pending !== null}
            onClick={() => void apply(user.id, "lift")}
          >
            정지 해제
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">회원 검색·제재</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="닉네임, 이메일, IP"
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
          />
          <Button type="button" size="touch" onClick={() => void search()}>
            검색
          </Button>
        </div>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="ban-reason">제재 사유</Label>
          <Input
            id="ban-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="예: 반복 비방, 불법 홍보"
          />
        </div>
        {message ? <p className="mt-2 text-sm text-destructive">{message}</p> : null}
        {matches.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">검색 결과가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {matches.map((user) => (
              <li key={user.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{user.nickname}</p>
                <p className="text-xs text-muted-foreground">
                  {user.email ?? "이메일 없음"}
                  {user.signupIp ? ` · 가입 IP ${user.signupIp}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.status}
                  {user.banReason ? ` · ${user.banReason}` : ""}
                  {user.suspendedUntil ? ` · ${new Date(user.suspendedUntil).toLocaleString("ko-KR")}` : ""}
                </p>
                {actions(user)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">정지된 회원</h2>
        {restricted.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">현재 정지된 회원이 없습니다.</p>
        ) : (
          <>
          <ul className="mt-3 grid gap-3 md:hidden">
            {restricted.map((user) => (
              <li key={user.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="break-words font-medium">{user.nickname}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {user.status === "BANNED" ? "영구 정지" : "기간 정지"}
                  {user.banReason ? ` · ${user.banReason}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.status === "BANNED"
                    ? "만료 없음"
                    : user.suspendedUntil
                      ? new Date(user.suspendedUntil).toLocaleString("ko-KR")
                      : "—"}
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    size="touch"
                    disabled={pending !== null}
                    onClick={() => void apply(user.id, "lift")}
                  >
                    정지 해제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3">닉네임</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">사유</th>
                  <th className="py-2 pr-3">만료일</th>
                  <th className="py-2">처리</th>
                </tr>
              </thead>
              <tbody>
                {restricted.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="max-w-[10rem] break-words py-2 pr-3 font-medium">{user.nickname}</td>
                    <td className="py-2 pr-3">{user.status === "BANNED" ? "영구 정지" : "기간 정지"}</td>
                    <td className="max-w-[14rem] break-words py-2 pr-3">{user.banReason ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {user.status === "BANNED"
                        ? "없음"
                        : user.suspendedUntil
                          ? new Date(user.suspendedUntil).toLocaleString("ko-KR")
                          : "—"}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        size="touch"
                        disabled={pending !== null}
                        onClick={() => void apply(user.id, "lift")}
                      >
                        정지 해제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
