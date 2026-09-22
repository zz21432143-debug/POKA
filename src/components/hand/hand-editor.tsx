"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardSlot, PlayingCard } from "@/components/hand/playing-card";
import {
  ACTION_LABEL,
  ACTIONS,
  EMPTY_HAND,
  POSITIONS,
  STREET_LABEL,
  STREETS,
  SUITS,
  allCardCodes,
  type ActionId,
  type ActorId,
  type HandReviewData,
  type StreetId,
} from "@/lib/hand-review";
import { POST_EXP } from "@/lib/rewards";

type Slot = "hero" | "villain" | "board";

export function HandEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hand, setHand] = useState<HandReviewData>(EMPTY_HAND);
  const [slot, setSlot] = useState<Slot>("hero");
  const [street, setStreet] = useState<StreetId>("preflop");
  const [actor, setActor] = useState<ActorId>("Hero");
  const [amount, setAmount] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const used = useMemo(
    () => new Set([...hand.heroCards, ...hand.villainCards, ...hand.board]),
    [hand],
  );

  function addCard(code: string) {
    setHand((prev) => {
      const take = (list: string[], max: number) => {
        if (list.includes(code) || used.has(code) || list.length >= max) return list;
        return [...list, code];
      };
      if (slot === "hero") return { ...prev, heroCards: take(prev.heroCards, 2) };
      if (slot === "villain") return { ...prev, villainCards: take(prev.villainCards, 2) };
      return { ...prev, board: take(prev.board, 5) };
    });
  }

  function removeFrom(target: Slot, code: string) {
    setHand((prev) => {
      if (target === "hero") return { ...prev, heroCards: prev.heroCards.filter((c) => c !== code) };
      if (target === "villain") {
        return { ...prev, villainCards: prev.villainCards.filter((c) => c !== code) };
      }
      return { ...prev, board: prev.board.filter((c) => c !== code) };
    });
  }

  function pushAction(action: ActionId) {
    const parsedAmount = Number(amount);
    const needsAmount = action === "bet" || action === "raise";
    setHand((prev) => ({
      ...prev,
      streets: {
        ...prev.streets,
        [street]: [
          ...prev.streets[street],
          {
            actor,
            action,
            amount: needsAmount && Number.isFinite(parsedAmount) ? parsedAmount : undefined,
          },
        ],
      },
    }));
  }

  function popAction() {
    setHand((prev) => ({
      ...prev,
      streets: {
        ...prev.streets,
        [street]: prev.streets[street].slice(0, -1),
      },
    }));
  }

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType: "HAND_REVIEW",
          title,
          content: notes,
          handReview: hand,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string; exp?: number };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "저장에 실패했습니다.");
      }
      router.push(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-full flex-col gap-6 overflow-x-clip">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        핸드리뷰 작성 시 EXP <strong>+{POST_EXP.HAND_REVIEW}</strong> (전체 게시판 중 최고)
      </p>

      <div className="grid gap-3">
        <Label htmlFor="hand-title">제목</Label>
        <Input
          id="hand-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: BTN vs BB AJs 3bet pot"
          className="h-11"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ["hero", `내 손패 ${hand.heroCards.length}/2`],
              ["board", `보드 ${hand.board.length}/5`],
              ["villain", `상대 핸드 ${hand.villainCards.length}/2`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="touch"
              variant={slot === key ? "default" : "outline"}
              onClick={() => setSlot(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="mb-3 flex max-w-full flex-wrap items-center gap-2 overflow-x-clip sm:gap-3">
          <span className="shrink-0 text-xs text-muted-foreground">Hero</span>
          {hand.heroCards.map((code) => (
            <PlayingCard key={code} code={code} onClick={() => removeFrom("hero", code)} />
          ))}
          {hand.heroCards.length < 2 ? <CardSlot label="+" onClick={() => setSlot("hero")} /> : null}
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">보드</span>
          {hand.board.map((code) => (
            <PlayingCard key={code} code={code} onClick={() => removeFrom("board", code)} />
          ))}
          {hand.board.length < 5 ? <CardSlot label="+" onClick={() => setSlot("board")} /> : null}
        </div>
        {hand.villainCards.length > 0 || slot === "villain" ? (
          <div className="mb-3 flex max-w-full flex-wrap items-center gap-2 overflow-x-clip sm:gap-3">
            <span className="text-xs text-muted-foreground">Villain</span>
            {hand.villainCards.map((code) => (
              <PlayingCard key={code} code={code} onClick={() => removeFrom("villain", code)} />
            ))}
          </div>
        ) : null}

        <div className="grid gap-2">
          {SUITS.map((suit) => (
            <div key={suit.code} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm">{suit.label}</span>
              <div className="card-scroller flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">
                {allCardCodes()
                  .filter((code) => code.endsWith(suit.code))
                  .map((code) => (
                    <PlayingCard
                      key={code}
                      code={code}
                      size="sm"
                      selected={used.has(code)}
                      dimmed={used.has(code)}
                      onClick={() => addCard(code)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Hero 포지션</Label>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
              value={hand.heroPosition}
              onChange={(event) => setHand((prev) => ({ ...prev, heroPosition: event.target.value }))}
            >
              {POSITIONS.map((pos) => (
                <option key={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Villain 포지션</Label>
            <select
              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
              value={hand.villainPosition}
              onChange={(event) =>
                setHand((prev) => ({ ...prev, villainPosition: event.target.value }))
              }
            >
              {POSITIONS.map((pos) => (
                <option key={pos}>{pos}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="bb">유효 스택 (bb)</Label>
            <Input
              id="bb"
              className="mt-1 h-11"
              inputMode="numeric"
              value={hand.effectiveBb ?? 100}
              onChange={(event) =>
                setHand((prev) => ({ ...prev, effectiveBb: Number(event.target.value) || undefined }))
              }
            />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {STREETS.map((id) => (
            <Button
              key={id}
              type="button"
              size="touch"
              variant={street === id ? "default" : "outline"}
              onClick={() => setStreet(id)}
            >
              {STREET_LABEL[id]}
            </Button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {(["Hero", "Villain"] as ActorId[]).map((id) => (
            <Button
              key={id}
              type="button"
              size="touch"
              variant={actor === id ? "default" : "secondary"}
              onClick={() => setActor(id)}
            >
              {id}
            </Button>
          ))}
          <Input
            className="h-11 w-24"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="벳 사이즈"
          />
          <span className="self-center text-xs text-muted-foreground">bb / 팟%</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <Button key={action} type="button" size="touch" variant="outline" onClick={() => pushAction(action)}>
              {ACTION_LABEL[action]}
            </Button>
          ))}
          <Button type="button" size="touch" variant="ghost" onClick={popAction}>
            한 줄 지우기
          </Button>
        </div>

        <ol className="mt-4 space-y-2 text-sm">
          {STREETS.map((id) =>
            hand.streets[id].length ? (
              <li key={id}>
                <span className="font-medium text-primary">{STREET_LABEL[id]}</span>
                <span className="ml-2 text-muted-foreground">
                  {hand.streets[id]
                    .map(
                      (row) =>
                        `${row.actor} ${ACTION_LABEL[row.action]}${
                          row.amount != null ? ` ${row.amount}` : ""
                        }`,
                    )
                    .join(" → ")}
                </span>
              </li>
            ) : null,
          )}
        </ol>
      </section>

      <div className="grid gap-3">
        <Label htmlFor="notes">코멘트</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="왜 이 라인을 택했는지, 질문하고 싶은 스팟을 적어 주세요."
          className="min-h-28"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" size="touch" disabled={pending} onClick={submit} className="w-full sm:w-auto">
        {pending ? "등록 중…" : "핸드리뷰 등록"}
      </Button>
    </div>
  );
}
