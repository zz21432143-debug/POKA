"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CardSlot, PlayingCard } from "@/components/hand/playing-card";
import { HandTable } from "@/components/hand/hand-table";
import {
  ACTION_LABEL,
  ACTIONS,
  EMPTY_HAND,
  POSITION_LABEL,
  POSITIONS,
  STREET_LABEL_KO,
  STREETS,
  SUITS,
  actorLabel,
  allCardCodes,
  defaultBlinds,
  formatActionLine,
  formatBb,
  normalizeHand,
  type ActionId,
  type HandReviewData,
  type SeatId,
  type StreetId,
} from "@/lib/hand-review";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";

type Slot = "hero" | "board" | SeatId;

const AMOUNT_ACTIONS: ActionId[] = ["call", "bet", "raise", "allin"];

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
  const [multi, setMulti] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const normalized = useMemo(() => normalizeHand(hand), [hand]);
  const sitting = normalized.seats.filter((seat) => seat.sitting);
  const villains = sitting.filter((seat) => !seat.isHero);
  const used = useMemo(() => {
    const cards = normalized.seats.flatMap((seat) => (seat.sitting ? seat.cards : [])).concat(normalized.board);
    return new Set(cards);
  }, [normalized]);

  function patch(next: (prev: HandReviewData) => HandReviewData) {
    setHand((prev) => normalizeHand(next(prev)));
  }

  function setHeadsUp(hero: SeatId, villain: SeatId) {
    const other = hero === villain ? (hero === "BB" ? "BTN" : "BB") : villain;
    patch((prev) => ({
      ...prev,
      heroPosition: hero,
      villainPosition: other,
      blinds: defaultBlinds([hero, other]),
      seats: prev.seats.map((seat) => ({
        ...seat,
        sitting: seat.id === hero || seat.id === other,
        isHero: seat.id === hero,
        showCards: seat.id === hero ? true : seat.id === other ? seat.showCards : false,
        cards: seat.id === hero || seat.id === other ? seat.cards : [],
        stackBb: prev.effectiveBb ?? seat.stackBb,
      })),
    }));
    setActor(hero);
    setMulti(false);
  }

  function setSixMax(hero: SeatId) {
    patch((prev) => ({
      ...prev,
      heroPosition: hero,
      blinds: defaultBlinds([...POSITIONS]),
      seats: prev.seats.map((seat) => ({
        ...seat,
        sitting: true,
        isHero: seat.id === hero,
        showCards: seat.id === hero ? true : seat.showCards,
        stackBb: prev.effectiveBb ?? seat.stackBb,
      })),
    }));
    setActor(hero);
    setMulti(true);
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

  function pushAction(action: ActionId) {
    const parsedAmount = Number(amount);
    const needsAmount = AMOUNT_ACTIONS.includes(action);
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

  function removeStreetAction(index: number) {
    patch((prev) => ({
      ...prev,
      streets: {
        ...prev.streets,
        [street]: prev.streets[street].filter((_, i) => i !== index),
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
      router.replace(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  const villainSeat = (villains[0]?.id ?? "BTN") as SeatId;
  const streetLines = normalized.streets[street];

  return (
    <div className="ink-panel flex max-w-full flex-col gap-5 overflow-x-clip rounded-2xl p-4 sm:p-5">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        자리 → 카드 → 액션 순서로만 채우면 됩니다. 등록 시 EXP <strong>+{POST_EXP.HAND_REVIEW}</strong> ·
        포인트 <strong>+{POST_POINTS.HAND_REVIEW}P</strong>,
        글에 폴드/체크/콜/레이즈 투표가 붙습니다.
      </p>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]">
        <p className="px-3 pt-3 text-xs text-zinc-400">미리보기 · 글을 읽는 사람 화면과 같습니다</p>
        <HandTable hand={normalized} revealOpponents />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hand-title">제목</Label>
        <Input
          id="hand-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 버튼에서 AJs 3벳 콜"
          className="h-11"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">1. 자리</p>
        <p className="mt-0.5 text-xs text-muted-foreground">기본은 나 vs 상대 한 명입니다.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="touch" variant={multi ? "outline" : "default"} onClick={() => setHeadsUp(normalized.heroPosition as SeatId, villainSeat)}>
            헤즈업 2인
          </Button>
          <Button
            type="button"
            size="touch"
            variant={multi ? "default" : "outline"}
            onClick={() => setSixMax(normalized.heroPosition as SeatId)}
          >
            멀티 테이블
          </Button>
        </div>

        <p className="mt-3 text-xs font-medium text-muted-foreground">내 자리</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {POSITIONS.map((id) => (
            <Button
              key={`hero-${id}`}
              type="button"
              size="touch"
              variant={normalized.heroPosition === id ? "default" : "outline"}
              onClick={() => (multi ? setSixMax(id) : setHeadsUp(id, villainSeat === id ? (id === "BB" ? "BTN" : "BB") : villainSeat))}
            >
              {id}
            </Button>
          ))}
        </div>

        {multi ? (
          <>
            <p className="mt-3 text-xs font-medium text-muted-foreground">참가 자리 · 꺼진 자리는 폴드 아웃</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {POSITIONS.map((id) => {
                const on = sitting.some((seat) => seat.id === id);
                const hero = id === normalized.heroPosition;
                return (
                  <Button
                    key={`sit-${id}`}
                    type="button"
                    size="touch"
                    variant={hero ? "default" : on ? "secondary" : "outline"}
                    disabled={hero}
                    onClick={() =>
                      patch((prev) => {
                        const seats = prev.seats.map((seat) =>
                          seat.id === id ? { ...seat, sitting: !seat.sitting, cards: seat.sitting ? [] : seat.cards } : seat,
                        );
                        return {
                          ...prev,
                          seats,
                          blinds: defaultBlinds(seats.filter((seat) => seat.sitting).map((seat) => seat.id)),
                        };
                      })
                    }
                  >
                    {id}
                    {hero ? " 나" : on ? "" : " 없음"}
                  </Button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-xs font-medium text-muted-foreground">상대 자리</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {POSITIONS.filter((id) => id !== normalized.heroPosition).map((id) => (
                <Button
                  key={`vil-${id}`}
                  type="button"
                  size="touch"
                  variant={villainSeat === id ? "default" : "outline"}
                  onClick={() => setHeadsUp(normalized.heroPosition as SeatId, id)}
                >
                  {POSITION_LABEL[id]}
                </Button>
              ))}
            </div>
          </>
        )}

        <label className="mt-3 grid max-w-xs gap-1 text-xs">
          <span className="text-muted-foreground">유효 스택</span>
          <div className="flex items-center gap-2">
            <Input
              className="h-11"
              inputMode="decimal"
              value={normalized.effectiveBb ?? 100}
              onChange={(event) => {
                const value = Number(event.target.value) || 0;
                patch((prev) => ({
                  ...prev,
                  effectiveBb: value,
                  seats: prev.seats.map((seat) => ({ ...seat, stackBb: value })),
                }));
              }}
            />
            <span className="text-muted-foreground">BB</span>
          </div>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">2. 카드</p>
        <p className="mt-0.5 text-xs text-muted-foreground">넣는 곳을 고른 뒤 아래 덱을 탭하세요. 카드를 다시 누르면 빼집니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="touch" variant={slot === "hero" ? "default" : "outline"} onClick={() => setSlot("hero")}>
            내 손패 {normalized.heroCards.length}/2
          </Button>
          <Button type="button" size="touch" variant={slot === "board" ? "default" : "outline"} onClick={() => setSlot("board")}>
            보드 {normalized.board.length}/5
          </Button>
          {villains.map((seat) => (
            <Button
              key={seat.id}
              type="button"
              size="touch"
              variant={slot === seat.id ? "default" : "outline"}
              onClick={() => setSlot(seat.id)}
            >
              {actorLabel(seat.id, normalized)} {seat.cards.length}/2
            </Button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">나</span>
          {normalized.heroCards.map((code) => (
            <PlayingCard
              key={code}
              code={code}
              onClick={() => patch((prev) => ({ ...prev, heroCards: prev.heroCards.filter((row) => row !== code) }))}
            />
          ))}
          {normalized.heroCards.length < 2 ? <CardSlot label="+" onClick={() => setSlot("hero")} /> : null}
          <span className="ml-1 text-xs text-muted-foreground">보드</span>
          {normalized.board.map((code) => (
            <PlayingCard
              key={code}
              code={code}
              onClick={() => patch((prev) => ({ ...prev, board: prev.board.filter((row) => row !== code) }))}
            />
          ))}
          {normalized.board.length < 5 ? <CardSlot label="+" onClick={() => setSlot("board")} /> : null}
        </div>

        {villains
          .filter((seat) => seat.cards.length > 0 || slot === seat.id)
          .map((seat) => (
            <div key={seat.id} className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{actorLabel(seat.id, normalized)}</span>
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
              {seat.cards.length < 2 ? <CardSlot label="+" onClick={() => setSlot(seat.id)} /> : null}
            </div>
          ))}

        <div className="mt-3 grid gap-2">
          {SUITS.map((suit) => (
            <div key={suit.code} className="flex items-center gap-2">
              <span className="w-5 text-center text-sm">{suit.label}</span>
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
        <p className="text-sm font-semibold">3. 액션</p>
        <p className="mt-0.5 text-xs text-muted-foreground">스트리트 → 누가 → 무엇을. 사이즈는 벳·레이즈·콜·올인에만 씁니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STREETS.map((id) => (
            <Button
              key={id}
              type="button"
              size="touch"
              variant={street === id ? "default" : "outline"}
              onClick={() => setStreet(id)}
            >
              {STREET_LABEL_KO[id]}
              {normalized.streets[id].length ? ` ${normalized.streets[id].length}` : ""}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sitting.map((seat) => (
            <Button
              key={seat.id}
              type="button"
              size="touch"
              variant={actor === seat.id ? "default" : "secondary"}
              onClick={() => setActor(seat.id)}
            >
              {actorLabel(seat.id, normalized)}
            </Button>
          ))}
        </div>
        <label className="mt-3 flex max-w-xs items-center gap-2 text-xs">
          <span className="text-muted-foreground">사이즈</span>
          <Input className="h-11" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="벳 사이즈" />
          <span className="text-muted-foreground">BB</span>
        </label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ACTIONS.map((action) => (
            <Button key={action} type="button" size="touch" variant="outline" className="ink-btn" onClick={() => pushAction(action)}>
              {ACTION_LABEL[action]}
            </Button>
          ))}
        </div>
        <ul className="mt-3 grid gap-1">
          {streetLines.length === 0 ? (
            <li className="text-xs text-muted-foreground">{STREET_LABEL_KO[street]} 액션이 없습니다. 블라인드는 자동입니다.</li>
          ) : (
            streetLines.map((row, index) => (
              <li key={`${street}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-sm">
                <span>{formatActionLine(row, normalized)}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeStreetAction(index)}>
                  삭제
                </Button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-semibold">4. 코멘트 · 등록</p>
        <div className="mt-3 grid gap-3">
          <Label htmlFor="notes">질문이나 생각한 라인</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="왜 이 라인을 택했는지, 확인하고 싶은 스팟을 적어 주세요."
            className="min-h-28"
          />
        </div>
        <button
          type="button"
          className="mt-3 text-xs text-muted-foreground underline"
          onClick={() => setShowExtra((value) => !value)}
        >
          {showExtra ? "추가 옵션 닫기" : "승자 · 팟 직접 입력"}
        </button>
        {showExtra ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">승자</span>
              <select
                className="h-11 rounded-lg border border-input bg-background px-2 text-base"
                value={normalized.winnerSeat ?? ""}
                onChange={(event) => patch((prev) => ({ ...prev, winnerSeat: event.target.value || null }))}
              >
                <option value="">없음</option>
                {sitting.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {actorLabel(seat.id, normalized)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              <span className="text-muted-foreground">최종 팟 ({formatBb(normalized.potBb)})</span>
              <Input
                className="h-11"
                inputMode="decimal"
                value={hand.potBb ?? ""}
                onChange={(event) => patch((prev) => ({ ...prev, potBb: Number(event.target.value) || undefined }))}
              />
            </label>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" size="touch" disabled={pending} onClick={submit} className="w-full sm:w-auto">
        {pending ? "등록 중…" : "핸드리뷰 등록"}
      </Button>
    </div>
  );
}
