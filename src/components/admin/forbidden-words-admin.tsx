"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ForbiddenWordRow = { id: string; word: string; jobAllowed?: boolean };
export type BaseWordGroup = { category: string; label: string; words: string[] };

const CHIP = "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors";

export function ForbiddenWordsAdmin({
  words,
  base,
  disabled,
}: {
  words: ForbiddenWordRow[];
  base: BaseWordGroup[];
  disabled: string[];
}) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [off, setOff] = useState(() => new Set(disabled));
  const [jobOk, setJobOk] = useState(() => new Set(words.filter((w) => w.jobAllowed).map((w) => w.id)));

  // 구인 게시판에서는 허용(「문자지원」처럼 공고에 늘 나오는 말 속 단어)
  async function toggleJob(id: string) {
    const allow = !jobOk.has(id);
    const next = new Set(jobOk);
    if (allow) next.add(id);
    else next.delete(id);
    setJobOk(next);
    setMessage(null);
    const response = await fetch("/api/admin/forbidden-words", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, jobAllowed: allow }),
    }).catch(() => null);
    if (!response?.ok) {
      setJobOk(jobOk);
      setMessage("바꾸지 못했습니다. 다시 시도해 주세요.");
    }
  }

  const baseTotal = base.reduce((sum, group) => sum + group.words.length, 0);

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

  async function toggle(target: string) {
    const enabled = off.has(target);
    const next = new Set(off);
    if (enabled) next.delete(target);
    else next.add(target);
    setOff(next);
    setMessage(null);
    const response = await fetch("/api/admin/forbidden-words", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: target, enabled }),
    }).catch(() => null);
    if (!response?.ok) {
      setOff(off);
      setMessage("바꾸지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
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

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">직접 추가한 금지어 {words.length}개</p>
        <p className="mb-2 text-xs text-muted-foreground">「구인 허용」을 누르면 구인 게시판(공고 · 지원 메시지)에서는 막지 않습니다. 다른 게시판 · 댓글 · 닉네임은 그대로 막습니다.</p>
        {words.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 없습니다. 위에서 추가하면 여기에 쌓입니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {words.map((row) => (
              <li key={row.id}>
                <span className={cn(CHIP, "border-primary/40 bg-primary/10 pr-1")}>
                  {row.word}
                  <button
                    type="button"
                    data-job-allow={row.id}
                    onClick={() => void toggleJob(row.id)}
                    aria-pressed={jobOk.has(row.id)}
                    className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", jobOk.has(row.id) ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground")}
                  >
                    {jobOk.has(row.id) ? "구인 허용 ✓" : "구인 허용"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void remove(row.id)}
                    aria-label={`${row.word} 삭제`}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">
          기본 금지어 {baseTotal - off.size}개 적용 중{off.size ? ` · 끔 ${off.size}개` : ""}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          단어를 누르면 끄고 켭니다. 끈 단어는 줄이 그어져 보입니다. 숫자 은어(18놈 등)·단축 링크(t.me, bit.ly 등)는 항상 막습니다.
          운영진 사칭 단어는 닉네임에만 적용됩니다.
        </p>
        <div className="grid gap-3">
          {base.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-xs font-bold text-muted-foreground">
                {group.label} <span className="font-normal">({group.words.length})</span>
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {group.words.map((item) => {
                  const isOff = off.has(item);
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => void toggle(item)}
                        aria-pressed={!isOff}
                        title={isOff ? "꺼짐 · 눌러서 켜기" : "적용 중 · 눌러서 끄기"}
                        className={cn(
                          CHIP,
                          isOff
                            ? "border-dashed border-border text-muted-foreground line-through opacity-60"
                            : "border-border bg-muted/40 hover:border-destructive/50",
                        )}
                      >
                        {item}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
