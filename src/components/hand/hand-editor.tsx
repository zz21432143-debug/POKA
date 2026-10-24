"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StickySubmit } from "@/components/ui/sticky-submit";
import { useLocalDraft } from "@/lib/use-local-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPT_POINTS, QUESTION_TEMPLATES } from "@/lib/accept-answer";
import { CardSlot, PlayingCard } from "@/components/hand/playing-card";
import { HandTable } from "@/components/hand/hand-table";
import {
  EMPTY_HAND,
  POSITION_LABEL,
  POSITIONS,
  STREET_LABEL_KO,
  STREETS,
  SUITS,
  actorLabel,
  allCardCodes,
  defaultBlinds,
  formatBb,
  normalizeHand,
  type HandReviewData,
  type SeatId,
  type StreetAction,
  type StreetId,
} from "@/lib/hand-review";
import { aggressiveAction, legalActions, nextTurn, replayHand, sizePresets } from "@/lib/hand-engine";
import { ActionLog } from "@/components/hand/action-log";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import { cn } from "cn";

type Slot = "hero" | "board" | SeatId;

const EMPTY_STREETS: HandReviewData["streets"] = { preflop: [], flop: [], turn: [], river: [] };

function StepTitle({ n, title, done, hint }: { n: number; title: string; done?: boolean; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full text-sm font-black",
          done ? "bg-emerald-500 text-white" : "bg-[#c9a25c] text-[#1d1611]",
        )}
      >
        {done ? "✓" : n}
      </span>
      <h2 className="text-base font-black text-[#f3eadb]">{title}</h2>
      {hint ? <span className="text-xs text-[#b8ab98]">{hint}</span> : null}
    </div>
  );
}

export function HandEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [hand, setHand] = useState<HandReviewData>(EMPTY_HAND);
  // 제목 · 설명 임시 저장(휴대폰 안에만)
  const draft = useLocalDraft("poka-draft-hand", { title, notes }, (d) => {
    setTitle(d.title ?? "");
    setNotes(d.notes ?? "");
  });
  const [slot, setSlot] = useState<Slot>("hero");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [multi, setMulti] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  // 최종 팟을 직접 입력했을 때만 그 값을 씁니다(아니면 액션으로 계산).
  const [potEdited, setPotEdited] = useState(false);

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
    // 자리가 바뀌면 행동 순서가 달라지므로 넣어 둔 액션은 비웁니다.
    patch((prev) => ({
      ...prev,
      heroPosition: hero,
      villainPosition: other,
      streets: EMPTY_STREETS,
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
    setMulti(false);
  }

  function setSixMax(hero: SeatId) {
    patch((prev) => ({
      ...prev,
      heroPosition: hero,
      streets: EMPTY_STREETS,
      blinds: defaultBlinds([...POSITIONS]),
      seats: prev.seats.map((seat) => ({
        ...seat,
        sitting: true,
        isHero: seat.id === hero,
        showCards: seat.id === hero ? true : seat.showCards,
        stackBb: prev.effectiveBb ?? seat.stackBb,
      })),
    }));
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

  // 다음 차례(누가 · 어느 스트리트) — 넣어 둔 액션을 처음부터 다시 계산합니다.
  const turn = useMemo(() => nextTurn(normalized), [normalized]);
  const acting = turn.toAct;
  const legal = acting ? legalActions(turn.state, acting) : [];
  const presets = acting ? sizePresets(turn.state, acting) : [];
  const raiseAction = aggressiveAction(turn.state);
  const allInTotal = acting ? (turn.state.committed[acting] ?? 0) + (turn.state.remaining[acting] ?? 0) : 0;
  const lastStreet = [...STREETS].reverse().find((id) => normalized.streets[id].length > 0) ?? null;

  function addAction(row: StreetAction) {
    if (!turn.street) return;
    const target: StreetId = turn.street;
    patch((prev) => ({ ...prev, streets: { ...prev.streets, [target]: [...prev.streets[target], row] } }));
    setAmount("");
  }

  function raiseTo(total: number) {
    if (!acting) return;
    if (total >= allInTotal) addAction({ actor: acting, action: "allin", amount: allInTotal });
    else addAction({ actor: acting, action: raiseAction, amount: total });
  }

  /** 마지막 액션 하나 되돌리기 */
  function undo() {
    if (!lastStreet) return;
    patch((prev) => ({ ...prev, streets: { ...prev.streets, [lastStreet]: prev.streets[lastStreet].slice(0, -1) } }));
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
          // 팟은 액션으로 계산해서 함께 저장합니다(직접 넣은 최종 팟이 있으면 그 값).
          handReview: (() => {
            const full = normalizeHand(hand);
            const replay = replayHand(full);
            return { ...full, potBb: potEdited && hand.potBb ? hand.potBb : replay.pot, streetPots: replay.potAtStart };
          })(),
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "저장에 실패했습니다.");
      }
      draft.clear();
      router.replace(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  const villainSeat = (villains[0]?.id ?? "BTN") as SeatId;

  return (
    <div className="ink-panel flex max-w-full flex-col gap-5 overflow-x-clip rounded-2xl p-4 sm:p-5">
      {draft.restored ? (
        <p data-draft-loaded className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          📝 쓰다 만 내용을 불러왔어요.
          <button
            type="button"
            className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs font-bold"
            onClick={() => {
              draft.clear();
              setTitle("");
              setNotes("");
              draft.dismiss();
            }}
          >
            지우고 새로 쓰기
          </button>
        </p>
      ) : null}
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm leading-6">
        <b>① 자리 → ② 카드 → ③ 액션 → ④ 제목</b> 순서로 채우면 됩니다. 액션은 차례가 자동으로 넘어가고 콜 금액·팟도
        자동 계산됩니다. 등록 시 EXP <strong>+{POST_EXP.HAND_REVIEW}</strong> · 포인트{" "}
        <strong>+{POST_POINTS.HAND_REVIEW}P</strong>, 글에 폴드/체크/콜/레이즈 투표가 붙습니다.
      </p>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]">
        <p className="px-3 pt-3 text-xs text-zinc-400">미리보기 · 글을 읽는 사람 화면과 같습니다</p>
        <HandTable hand={normalized} revealOpponents />
      </div>

      <section className="rounded-xl border border-border bg-card p-3">
        <StepTitle n={1} title="자리" done hint="기본은 나 vs 상대 한 명입니다" />
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
                          streets: EMPTY_STREETS,
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
        <StepTitle
          n={2}
          title="카드"
          done={normalized.heroCards.length === 2}
          hint="넣는 곳을 고른 뒤 아래 덱을 누르세요 · 넣은 카드를 다시 누르면 빠집니다"
        />
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
          {/* 무늬별 한 줄에 13장이 다 보이게(옆으로 밀지 않아도 됨). 이미 쓴 카드는 흐리게. */}
          {SUITS.map((suit) => {
            const red = suit.code === "h" || suit.code === "d";
            return (
              <div key={suit.code} className="flex items-center gap-1.5">
                <span className={cn("w-5 shrink-0 text-center text-lg leading-none", red ? "text-[#ff5a5a]" : "text-white")}>
                  {suit.label}
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
                  {allCardCodes()
                    .filter((code) => code.endsWith(suit.code))
                    .map((code) => {
                      const taken = used.has(code);
                      const rank = code[0] === "T" ? "10" : code[0];
                      return (
                        <button
                          key={code}
                          type="button"
                          aria-label={`${rank}${suit.label}`}
                          aria-pressed={taken}
                          onClick={() => addCard(code)}
                          className={cn(
                            "flex h-11 items-center justify-center rounded-md bg-white text-[13px] font-black leading-none tracking-tighter sm:text-sm",
                            red ? "text-[#d42a2a]" : "text-zinc-900",
                            taken ? "opacity-20" : "hover:ring-2 hover:ring-[#c9a25c]",
                          )}
                        >
                          {rank}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <StepTitle n={3} title="액션" hint="차례가 자동으로 넘어갑니다 · 질문하고 싶은 곳에서 멈추면 됩니다" />

        <div className="mt-3 rounded-xl border-2 border-[#c9a25c]/60 bg-[#1d1611] p-3">
          {turn.done ? (
            <p className="text-sm font-semibold text-[#f3eadb]">
              {turn.done === "fold"
                ? "한 명만 남아 핸드가 끝났습니다."
                : turn.done === "allin"
                  ? "모두 올인했습니다. 남은 보드 카드만 넣으면 됩니다."
                  : "리버까지 액션을 다 넣었습니다."}
            </p>
          ) : turn.needBoard > 0 && turn.street ? (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-[#f3eadb]">
                {STREET_LABEL_KO[turn.street]} 액션을 넣으려면 보드 카드 {turn.needBoard}장을 더 넣어 주세요.
              </p>
              <Button type="button" size="touch" variant="outline" onClick={() => setSlot("board")} className="justify-self-start">
                ② 카드에서 보드 넣기
              </Button>
            </div>
          ) : acting && turn.street ? (
            <div className="grid gap-3">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-bold text-[#e7c98a]">{STREET_LABEL_KO[turn.street]}</span>
                <span className="text-base font-black text-white">{actorLabel(acting, normalized)} 차례</span>
                <span className="ml-auto text-xs text-[#b8ab98]">팟 {formatBb(turn.state.pot)}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {legal.map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    size="touch"
                    variant={option.action === "fold" ? "outline" : "secondary"}
                    className="text-base font-bold"
                    onClick={() => addAction({ actor: acting, action: option.action, amount: option.amount })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {legal.some((option) => option.action === "allin") ? null : (
                <div className="grid gap-2">
                  <p className="text-xs font-semibold text-[#b8ab98]">
                    {raiseAction === "bet" ? "벳" : "레이즈"} 크기 (총액)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <Button key={preset.label} type="button" size="touch" className="bg-[#e6b325] font-bold text-zinc-900 hover:bg-[#f0c43a]" onClick={() => raiseTo(preset.total)}>
                        {preset.label} · {formatBb(preset.total)}
                      </Button>
                    ))}
                    <Button type="button" size="touch" className="bg-[#d42a2a] font-bold text-white hover:bg-[#e03a3a]" onClick={() => raiseTo(allInTotal)}>
                      올인 {formatBb(allInTotal)}
                    </Button>
                  </div>
                  <div className="flex max-w-sm items-center gap-2">
                    <Input
                      className="h-11"
                      inputMode="decimal"
                      value={amount}
                      placeholder="직접 입력"
                      aria-label="벳·레이즈 총액"
                      onChange={(event) => setAmount(event.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">BB</span>
                    <Button
                      type="button"
                      size="touch"
                      variant="outline"
                      disabled={!(Number(amount) > turn.state.currentBet)}
                      onClick={() => raiseTo(Number(amount))}
                    >
                      {raiseAction === "bet" ? "벳" : "레이즈"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">액션을 넣을 차례가 없습니다.</p>
          )}
          {lastStreet ? (
            <button type="button" onClick={undo} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#e7c98a] underline">
              ↶ 마지막 액션 되돌리기
            </button>
          ) : null}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
          <p className="bg-[#1f2126] px-3 pt-2 text-xs text-zinc-400">베팅 라인 미리보기</p>
          <ActionLog hand={normalized} compact />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-3">
        <StepTitle n={4} title="제목 · 질문" />
        <div className="mt-3 grid gap-2">
          <Label htmlFor="hand-title" className="write-label">제목</Label>
          <Input
            id="hand-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 버튼에서 AJs 3벳 콜"
            className="write-title-input"
          />
        </div>
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="notes" className="write-label">질문이나 생각한 라인</Label>
            <button
              type="button"
              data-question-template
              onClick={() => setNotes((v) => (v.trim() ? `${v.trimEnd()}\n\n${QUESTION_TEMPLATES.HAND_REVIEW}` : (QUESTION_TEMPLATES.HAND_REVIEW ?? "")))}
              className="min-h-10 rounded-lg border border-[#c9a25c]/60 px-3 text-xs font-black text-[#e7c98a]"
            >
              📝 질문 틀 넣기
            </button>
          </div>
          <Textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="왜 이 라인을 택했는지, 확인하고 싶은 스팟을 적어 주세요."
            className="write-body-input"
          />
          <p className="text-xs text-[#b8ab98]">도움이 된 댓글은 「채택」해 주세요. 답변자에게 +{ACCEPT_POINTS}P와 요괴 밥 1번이 가요.</p>
        </div>
        <button
          type="button"
          className="mt-2 inline-flex min-h-10 items-center text-xs text-muted-foreground underline"
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
              <span className="text-muted-foreground">최종 팟 (비우면 자동 {formatBb(turn.state.pot)})</span>
              <Input
                className="h-11"
                inputMode="decimal"
                placeholder={String(turn.state.pot)}
                value={potEdited ? (hand.potBb ?? "") : ""}
                onChange={(event) => {
                  setPotEdited(true);
                  patch((prev) => ({ ...prev, potBb: Number(event.target.value) || undefined }));
                }}
              />
            </label>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <StickySubmit>
        <Button type="button" size="touch" disabled={pending} onClick={submit} className="w-full sm:w-auto">
          {pending ? "등록 중…" : "핸드리뷰 등록"}
        </Button>
      </StickySubmit>
    </div>
  );
}
