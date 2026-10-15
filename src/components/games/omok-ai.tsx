"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import { OmokPlayer } from "@/components/games/omok-player";
import {
  BLACK,
  WHITE,
  aiMove,
  boardFrom,
  colorOfMove,
  forbiddenCells,
  makesFour,
  play,
  type Stone,
} from "@/lib/omok";
import {
  OMOK_OPPONENTS,
  PLAYER_LINES,
  pickOmokLine,
  type OmokLineKind,
} from "@/lib/omok-lines";
import {
  omokSoundOn,
  resultSound,
  setOmokSound,
  stoneClick,
} from "@/lib/omok-sound";
import type { YokaiSpecies } from "@/lib/yokai";

type Me = {
  nickname: string;
  yokai: { species: YokaiSpecies; stage: number } | null;
};

/** 요괴 AI 대전(휴대폰 안에서 계산) */
export function OmokAi({
  opponent: opponentIndex,
  me,
}: {
  opponent: number;
  me: Me;
}) {
  const opp = OMOK_OPPONENTS[opponentIndex] ?? OMOK_OPPONENTS[0];
  const [human, setHuman] = useState<Stone | 0>(0);
  const [moves, setMoves] = useState<number[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [line, setLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<Stone | "draw" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [aiSay, setAiSay] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [meSay, setMeSay] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [sound, setSound] = useState(true);
  const seed = useRef(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  const ai: Stone = human === BLACK ? WHITE : BLACK;
  const turn = colorOfMove(moves.length);
  const playing = human !== 0 && winner === null;
  const myTurn = playing && turn === human;
  const forbidden = useMemo(
    () => (myTurn && human === BLACK ? forbiddenCells(boardFrom(moves)) : []),
    [moves, myTurn, human],
  );

  function say(who: "ai" | "me", kind: OmokLineKind) {
    seed.current += 7;
    const text =
      who === "ai"
        ? pickOmokLine(opp.lines[kind], seed.current)
        : kind === "think"
          ? ""
          : pickOmokLine(PLAYER_LINES[kind], seed.current);
    if (!text) return;
    if (who === "ai") setAiSay({ text, key: seed.current });
    else setMeSay({ text, key: seed.current });
  }

  /** 한 수 반영(사람 · AI 공통) */
  function apply(p: number, by: "ai" | "me") {
    const r = play(moves, p);
    if (!r.ok) {
      setNote(r.error);
      return false;
    }
    stoneClick();
    setMoves(r.moves);
    setPreview(null);
    setNote(null);
    if (r.winner) {
      setLine(r.line);
      setWinner(r.winner);
      const humanWon = r.winner === human;
      resultSound(humanWon);
      say("ai", humanWon ? "lose" : "win");
      say("me", humanWon ? "win" : "lose");
    } else if (r.draw) {
      setWinner("draw");
    } else if (makesFour(r.moves)) {
      say(by, "four");
      say(by === "ai" ? "me" : "ai", "danger");
    }
    return true;
  }

  // AI 차례: 잠깐 생각하는 척 후 둠
  useEffect(() => {
    if (!playing || turn !== ai) return;
    const timer = window.setTimeout(
      () => {
        const p = aiMove(moves, opp.level);
        if (p >= 0) apply(p, "ai");
        else setWinner("draw");
      },
      moves.length ? 380 + Math.random() * 520 : 500,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 수가 바뀔 때만
  }, [moves, playing, turn, ai]);

  function start(color: Stone) {
    setHuman(color);
    setMoves([]);
    setLine(null);
    setWinner(null);
    setPreview(null);
    setNote(null);
    seed.current = Math.floor(Math.random() * 1000);
    say("ai", "start");
    setMeSay(null);
  }

  function pick(p: number) {
    if (!myTurn) return;
    if (boardFrom(moves)[p] !== 0) return;
    if (forbidden.includes(p)) {
      setNote("흑은 삼삼(열린 3이 두 줄)에 둘 수 없어요.");
      setPreview(null);
      return;
    }
    // 한 번 누르면 미리보기, 같은 곳을 한 번 더 누르면 둠
    if (preview !== p) {
      setPreview(p);
      setNote("같은 곳을 한 번 더 누르면 둬요");
      return;
    }
    apply(p, "me");
  }

  function undo() {
    if (!human || winner !== null) return;
    // 내 마지막 수까지 되돌림(AI 수 + 내 수)
    const back = turn === human ? 2 : 1;
    const next = moves.slice(0, Math.max(0, moves.length - back));
    if (human === WHITE && next.length === 0) return;
    setMoves(next);
    setPreview(null);
    setNote(null);
  }

  if (!human) {
    return (
      <div data-omok-ai-pick className="grid gap-4">
        <OpponentCard index={opponentIndex} />
        <p className="text-center text-sm text-[#d1c7b5]">
          돌을 고르세요. 흑이 먼저 두고, 흑은 삼삼에 둘 수 없어요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-omok-start="b"
            onClick={() => start(BLACK)}
            className="min-h-12 rounded-xl bg-[#111] text-sm font-black text-white ring-1 ring-white/20"
          >
            ⚫ 흑(먼저 두기)
          </button>
          <button
            type="button"
            data-omok-start="w"
            onClick={() => start(WHITE)}
            className="min-h-12 rounded-xl bg-[#f6efe2] text-sm font-black text-black"
          >
            ⚪ 백(나중에 두기)
          </button>
        </div>
      </div>
    );
  }

  const humanWon = winner !== null && winner !== "draw" && winner === human;
  return (
    <div data-omok-ai className="grid gap-2">
      <OmokPlayer
        name={opp.title}
        yokai={{ species: opp.species, stage: opp.stage }}
        color={ai as 1 | 2}
        active={playing && turn === ai}
        label={opp.tier}
        bubble={aiSay?.text}
        bubbleKey={aiSay?.key}
        result={
          winner === null || winner === "draw"
            ? null
            : humanWon
              ? "lose"
              : "win"
        }
      />
      <OmokBoard
        moves={moves}
        forbidden={forbidden}
        line={line}
        preview={preview}
        previewColor={human as 1 | 2}
        onPick={pick}
        disabled={!myTurn}
      />
      <OmokPlayer
        name={me.nickname}
        yokai={me.yokai}
        color={human as 1 | 2}
        active={myTurn}
        label="나"
        bubble={meSay?.text ?? (myTurn ? "내 차례!" : null)}
        bubbleKey={meSay?.key}
        result={
          winner === null || winner === "draw"
            ? null
            : humanWon
              ? "win"
              : "lose"
        }
      />
      <p
        role="status"
        className={cn(
          "min-h-5 text-center text-sm font-bold",
          note?.includes("삼삼") ? "text-rose-300" : "text-[#e7c98a]",
        )}
      >
        {winner === "draw"
          ? "무승부예요!"
          : winner
            ? humanWon
              ? `🏆 승리! ${opp.title}을(를) 이겼어요!`
              : `패배… ${opp.title}의 승리`
            : note}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {winner !== null ? (
          <>
            <button
              type="button"
              data-omok-again
              onClick={() => start(human === BLACK ? WHITE : BLACK)}
              className="min-h-11 rounded-xl bg-[#7a1c22] px-4 text-sm font-black text-[#f6efe2]"
            >
              흑백 바꿔 한 판 더
            </button>
            <Link
              href="/games/omok"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-black text-[#f3d9a4]"
            >
              다른 상대 고르기
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={undo}
              disabled={!moves.length || !myTurn}
              className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-zinc-200 disabled:opacity-40"
            >
              ↩ 무르기
            </button>
            <button
              type="button"
              onClick={() => setWinner(ai)}
              className="min-h-11 rounded-xl border border-rose-400/40 px-4 text-sm font-bold text-rose-200"
            >
              🏳 기권
            </button>
          </>
        )}
        <button
          type="button"
          aria-pressed={sound}
          onClick={() => {
            setOmokSound(!sound);
            setSound(!sound);
          }}
          className="min-h-11 rounded-xl border border-white/20 px-3 text-sm font-bold text-zinc-300"
        >
          {sound ? "🔊" : "🔇"}
        </button>
      </div>
    </div>
  );
}

/** 상대 요괴 소개 카드 */
export function OpponentCard({
  index,
  href,
}: {
  index: number;
  href?: string;
}) {
  const o = OMOK_OPPONENTS[index];
  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 요괴 픽셀 그림 */}
      <img
        src={`/yokai/${o.species}-${o.stage}.webp`}
        alt=""
        className="size-16 shrink-0 object-contain"
        draggable={false}
      />
      <span className="grid min-w-0 gap-0.5 text-left">
        <span className="flex items-center gap-1.5">
          <b className="truncate text-sm font-black text-white">{o.title}</b>
          <span
            className="shrink-0 rounded-full px-1.5 text-[10px] font-black text-black"
            style={{ background: o.tone }}
          >
            {o.tier}
          </span>
        </span>
        <span className="truncate text-xs text-zinc-300">
          「{o.lines.start[0]}」
        </span>
      </span>
    </>
  );
  return href ? (
    <Link
      href={href}
      data-omok-opponent={o.species}
      className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-2 hover:border-[#c9a25c]/60"
    >
      {body}
    </Link>
  ) : (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-[#c9a25c]/40 bg-black/40 p-2">
      {body}
    </div>
  );
}
