"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardSlot, PlayingCard } from "@/components/hand/playing-card";
import { HandViewer } from "@/components/hand/hand-viewer";
import {
  ACTION_LABEL,
  ACTIONS,
  EMPTY_HAND,
  POSITIONS,
  STREET_LABEL_KO,
  STREETS,
  SUITS,
  allCardCodes,
  normalizeHand,
  type ActionId,
  type HandReviewData,
  type SeatId,
  type StreetId,
} from "@/lib/hand-review";
import { POST_EXP } from "@/lib/rewards";

type Slot = "hero" | "board" | SeatId;

export function HandEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hand, setHand] = useState<HandReviewData>(EMPTY_HAND);
  const [slot, setSlot] = useState<Slot>("hero");
  const [street, setStreet] = useState<StreetId>("preflop");
  const [actor, setActor] = useState<string>(EMPTY_HAND.heroPosition);
  const [amount, setAmount] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const normalized = useMemo(() => normalizeHand(hand), [hand]);
  const used = useMemo(() => {
    const cards = normalized.seats.flatMap((seat) => (seat.sitting ? seat.cards : [])).concat(normalized.board);
    return new Set(cards);
  }, [normalized]);

  function patch(next: (prev: HandReviewData) => HandReviewData) {
    setHand((prev) => normalizeHand(next(prev)));
  }

  function addCard(code: string) {
    patch((prev) => {
      if (used.has(code)) return prev;
      if (slot === "hero") {
        if (prev.heroCards.length >= 2) return prev;
        return { ...prev, heroCards: [...prev.heroCards, code] };
      }
      if (slot === "board") {
        if (prev.board.length >= 5) return prev;
        return { ...prev, board: [...prev.board, code] };
      }
      return {
        ...prev,
        seats: prev.seats.map((seat) =>
          seat.id === slot && seat.cards.length < 2
            ? { ...seat, sitting: true, cards: [...seat.cards, code], showCards: true }
            : seat,
        ),
        villainPosition: slot,
        villainCards:
          slot === prev.villainPosition || prev.villainCards.length === 0
            ? [...(slot === prev.villainPosition ? prev.villainCards : []), code].slice(0, 2)
            : prev.villainCards,
      };
    });
  }

  function removeHeroCard(code: string) {
    patch((prev) => ({ ...prev, heroCards: prev.heroCards.filter((row) => row !== code) }));
  }

  function removeBoardCard(code: string) {
    patch((prev) => ({ ...prev, board: prev.board.filter((row) => row !== code) }));
  }

  function toggleSeat(id: SeatId) {
    patch((prev) => {
      if (id === prev.heroPosition) return prev;
      return {
        ...prev,
        seats: prev.seats.map((seat) =>
          seat.id === id ? { ...seat, sitting: !seat.sitting, cards: seat.sitting ? [] : seat.cards } : seat,
        ),
      };
    });
  }

  function setHeroSeat(id: SeatId) {
    patch((prev) => ({
      ...prev,
      heroPosition: id,
      seats: prev.seats.map((seat) => ({
        ...seat,
        sitting: seat.id === id ? true : seat.sitting,
        isHero: seat.id === id,
        showCards: seat.id === id ? true : seat.showCards,
      })),
    }));
    setActor(id);
  }

  function toggleReveal(id: SeatId) {
    patch((prev) => ({
      ...prev,
      villainPosition: id,
      seats: prev.seats.map((seat) =>
        seat.id === id ? { ...seat, showCards: !seat.showCards, sitting: true } : seat,
      ),
    }));
    setSlot(id);
  }

  function pushAction(action: ActionId) {
    const parsedAmount = Number(amount);
    const needsAmount = action === "bet" || action === "raise" || action === "call" || action === "allin";
    patch((prev) => ({
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
    patch((prev) => ({
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
          handReview: normalizeHand(hand),
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
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

  const sitting = normalized.seats.filter((seat) => seat.sitting);

  return (
    <div className="flex max-w-full flex-col gap-6 overflow-x-clip">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        핸드리뷰 작성 시 EXP <strong>+{POST_EXP.HAND_REVIEW}</strong>. 상대 자리의 카드 두 장을 넣고
        <strong> 공개</strong>를 켜면 테이블에 핸드가 보입니다.
      </p>

      <div className="grid gap-3">
        <Label htmlFor="hand-title">제목</Label>
        <Input
          id="hand-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: BTN vs BB AJs 3벳팟"
          className="h-11"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 text-sm font-semibold">테이블 자리</p>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((id) => {
            const seat = normalized.seats.find((row) => row.id === id);
            const on = seat?.sitting;
            const hero = id === normalized.heroPosition;
            return (
              <Button
                key={id}
                type="button"
                size="touch"
                variant={hero ? "default" : on ? "secondary" : "outline"}
                onClick={() => (hero ? undefined : toggleSeat(id))}
              >
                {id}
                {hero ? " · Hero" : on ? " · 참가" : ""}
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">자리를 눌러 참가/퇴장합니다. Hero 자리:</p>
        <select
          className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-base sm:w-48"
          value={normalized.heroPosition}
          onChange={(event) => setHeroSeat(event.target.value as SeatId)}
        >
          {POSITIONS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sitting.map((seat) => (
            <label key={seat.id} className="grid gap-1 text-xs">
              <span className="text-muted-foreground">{seat.isHero ? "Hero" : seat.id} 스택</span>
              <Input
                className="h-10"
                inputMode="decimal"
                value={seat.stackBb}
                onChange={(event) =>
                  patch((prev) => ({
                    ...prev,
                    seats: prev.seats.map((row) =>
                      row.id === seat.id ? { ...row, stackBb: Number(event.target.value) || 0 } : row,
                    ),
                    effectiveBb: seat.isHero ? Number(event.target.value) || prev.effectiveBb : prev.effectiveBb,
                  }))
                }
              />
            </label>
          ))}
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">팟</span>
            <Input
              className="h-10"
              inputMode="decimal"
              value={hand.potBb ?? ""}
              onChange={(event) =>
                patch((prev) => ({ ...prev, potBb: Number(event.target.value) || undefined }))
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" size="touch" variant={slot === "hero" ? "default" : "outline"} onClick={() => setSlot("hero")}>
            내 손패 {normalized.heroCards.length}/2
          </Button>
          <Button type="button" size="touch" variant={slot === "board" ? "default" : "outline"} onClick={() => setSlot("board")}>
            보드 {normalized.board.length}/5
          </Button>
          {sitting
            .filter((seat) => !seat.isHero)
            .map((seat) => (
              <Button
                key={seat.id}
                type="button"
                size="touch"
                variant={slot === seat.id ? "default" : "outline"}
                onClick={() => setSlot(seat.id)}
              >
                {seat.id} {seat.cards.length}/2
              </Button>
            ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Hero</span>
          {normalized.heroCards.map((code) => (
            <PlayingCard key={code} code={code} onClick={() => removeHeroCard(code)} />
          ))}
          {normalized.heroCards.length < 2 ? <CardSlot label="+" onClick={() => setSlot("hero")} /> : null}
          <span className="ml-2 text-xs text-muted-foreground">보드</span>
          {normalized.board.map((code) => (
            <PlayingCard key={code} code={code} onClick={() => removeBoardCard(code)} />
          ))}
          {normalized.board.length < 5 ? <CardSlot label="+" onClick={() => setSlot("board")} /> : null}
        </div>

        {sitting
          .filter((seat) => !seat.isHero)
          .map((seat) => (
            <div key={seat.id} className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{seat.id}</span>
              {seat.cards.map((code) => (
                <PlayingCard
                  key={code}
                  code={code}
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      seats: prev.seats.map((row) =>
                        row.id === seat.id ? { ...row, cards: row.cards.filter((c) => c !== code) } : row,
                      ),
                    }))
                  }
                />
              ))}
              <Button
                type="button"
                size="sm"
                variant={seat.showCards && seat.cards.length === 2 ? "default" : "outline"}
                onClick={() => toggleReveal(seat.id)}
              >
                {seat.showCards && seat.cards.length === 2 ? "공개 중" : "이 핸드 공개"}
              </Button>
            </div>
          ))}

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
        <div className="mb-3 flex flex-wrap gap-2">
          {STREETS.map((id) => (
            <Button
              key={id}
              type="button"
              size="touch"
              variant={street === id ? "default" : "outline"}
              onClick={() => setStreet(id)}
            >
              {STREET_LABEL_KO[id]}
            </Button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {sitting.map((seat) => (
            <Button
              key={seat.id}
              type="button"
              size="touch"
              variant={actor === seat.id ? "default" : "secondary"}
              onClick={() => setActor(seat.id)}
            >
              {seat.isHero ? `Hero (${seat.id})` : seat.id}
            </Button>
          ))}
          <Input
            className="h-11 w-24"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="벳 사이즈"
          />
          <span className="self-center text-xs text-muted-foreground">BB</span>
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
        <div className="mt-3">
          <Label>승자</Label>
          <select
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-base sm:w-56"
            value={normalized.winnerSeat ?? ""}
            onChange={(event) =>
              patch((prev) => ({ ...prev, winnerSeat: event.target.value || null }))
            }
          >
            <option value="">없음</option>
            {sitting.map((seat) => (
              <option key={seat.id} value={seat.id}>
                {seat.isHero ? `Hero (${seat.id})` : seat.id}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold">미리보기</p>
        <HandViewer hand={normalized} />
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
