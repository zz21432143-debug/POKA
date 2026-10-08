"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ForbiddenWordRow = { id: string; word: string; createdAt: string };

export function ForbiddenWordsAdmin({ words }: { words: ForbiddenWordRow[] }) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/forbidden-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "추가에 실패했습니다.");
      setWord("");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setPending(true);
    await fetch(`/api/admin/forbidden-words?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Input
          value={word}
          onChange={(event) => setWord(event.target.value)}
          placeholder="예: 텔레그램, 첫충, 꽁머니"
        />
        <Button type="submit" size="touch" disabled={pending}>
          금지어 추가
        </Button>
      </form>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <p className="text-sm font-medium">현재 금지어 {words.length}개</p>
      {words.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 직접 추가한 단어가 없습니다. 위에서 등록하면 이 목록에 쌓입니다.</p>
      ) : (
        <ul className="grid gap-2">
          {words.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.word}</p>
                <p className="text-xs text-muted-foreground">
                  등록 {new Date(row.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <Button type="button" size="touch" variant="ghost" disabled={pending} onClick={() => void remove(row.id)}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
