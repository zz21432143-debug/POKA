"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import {
  ArcadeBanner,
  OmokHud,
  BigWinCutIn,
} from "@/components/games/omok-hud";
import {
  BLACK,
  WHITE,
  aiMove,
  boardFrom,
  colorOfMove,
  forbiddenCells,
  play,
  winTip,
  type Stone,
} from "@/lib/omok";
import {
  OMOK_OPPONENTS,
  PLAYER_LINES,
  pickOmokLine,
  yokaiVoice,
  type OmokLineKind,
} from "@/lib/omok-lines";
import {
  cutInSound,
  fightSound,
  omokSoundOn,
  readySound,
  resultSound,
  setOmokSound,
  stoneClick,
} from "@/lib/omok-sound";
import type { YokaiSpecies } from "@/lib/yokai";

type Me = {
  nickname: string;
  yokai: { species: YokaiSpecies; stage: number } | null;
};

/** 요괴 AI 대전(아케이드 · 휴대폰 안에서 계산 · 전적에는 안 들어감) */
export function OmokAi({
  opponent: opponentIndex,
  me,
}: {
  opponent: number;
  me: Me;
}) {
  const opp = OMOK_OPPONENTS[opponentIndex] ?? OMOK_OPPONENTS[0];
  const oppYokai = { species: opp.species, stage: opp.stage };
  const [human, setHuman] = useState<Stone | 0>(0);
  const [moves, setMoves] = useState<number[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [line, setLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<Stone | "draw" | null>(null);
  const [resigned, setResigned] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [aiSay, setAiSay] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [meSay, setMeSay] = useState<{ text: string; key: number } | null>(
    null,
  );
  const [banner, setBanner] = useState<{
    text: string;
    sub?: string;
    tone?: "gold" | "red" | "cyan";
    key: number;
  } | null>(null);
  const [bigWin, setBigWin] = useState<{
    key: number;
    side: "left" | "right";
    yokai: { species: YokaiSpecies; stage: number } | null;
    title: string;
    tip: string;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  /** 결과 화면 「다른 요괴」: 이 자리에서 바로 상대 고르기 */
  const [picker, setPicker] = useState(false);
  const [jump, setJump] = useState<{ me: number; ai: number }>({
    me: 0,
    ai: 0,
  });
  const [sound, setSound] = useState(true);
  const seed = useRef(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 1200);
    return () => window.clearTimeout(t);
  }, [banner]);
  useEffect(() => {
    if (!aiSay && !meSay) return;
    const t = window.setTimeout(() => {
      setAiSay(null);
      setMeSay(null);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [aiSay, meSay]);

  const ai: Stone = human === BLACK ? WHITE : BLACK;
  const turn = colorOfMove(moves.length);
  const playing = human !== 0 && winner === null;
  const myTurn = playing && turn === human;
  const forbidden = useMemo(
    () => (myTurn && human === BLACK ? forbiddenCells(boardFrom(moves)) : []),
    [moves, myTurn, human],
  );

  function line4(who: "ai" | "me", kind: OmokLineKind) {
    seed.current += 7;
    return who === "ai"
      ? pickOmokLine(opp.lines[kind], seed.current)
      : kind === "think"
        ? ""
        : pickOmokLine(PLAYER_LINES[kind], seed.current);
  }
  function say(who: "ai" | "me", kind: OmokLineKind) {
    const text = line4(who, kind);
    if (!text) return;
    if (who === "ai") setAiSay({ text, key: seed.current });
    else setMeSay({ text, key: seed.current });
  }
  /** 끝: 5목이면 이긴 요괴가 화면을 덮고 훈수 → 결과(기권 · 무승부는 바로 결과) */
  function finish(w: Stone | "draw", byResign = false, finalMoves?: number[]) {
    setWinner(w);
    setResigned(byResign);
    setShowResult(false);
    let wait = 300;
    if (w !== "draw") {
      const humanWon = w === human;
      resultSound(humanWon);
      say(humanWon ? "ai" : "me", "lose");
      if (finalMoves) {
        const t = winTip(finalMoves);
        cutInSound();
        setBigWin({
          key: Date.now(),
          side: humanWon ? "left" : "right",
          yokai: humanWon ? me.yokai : oppYokai,
          title: t.dir ? `${t.dir} 5목!` : "5목 완성!",
          // 요괴가 이기면 자기 대사 + 훈수, 내가 이기면 훈수만
          tip: humanWon
            ? yokaiVoice(me.yokai?.species, t.tip)
            : `${line4("ai", "win")} ${t.tip}`,
        });
        wait = 3800;
      }
    }
    window.setTimeout(() => {
      setBigWin(null);
      setShowResult(true);
    }, wait);
  }

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
    setJump((j) => ({ ...j, [by]: Date.now() }));
    if (r.winner) {
      setLine(r.line);
      finish(r.winner, false, r.moves);
    } else if (r.draw) finish("draw");
    // 4목이어도 아무 말 안 함(게임에 영향 없게)
    return true;
  }

  // AI 차례: 잠깐 생각하는 척 후 둠
  useEffect(() => {
    if (!playing || turn !== ai) return;
    const timer = window.setTimeout(
      () => {
        const p = aiMove(moves, opp.level);
        if (p >= 0) apply(p, "ai");
        else finish("draw");
      },
      moves.length ? 420 + Math.random() * 520 : 1500,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 수가 바뀔 때만
  }, [moves, playing, turn, ai]);

  function start(color: Stone) {
    setHuman(color);
    setMoves([]);
    setLine(null);
    setWinner(null);
    setResigned(false);
    setPreview(null);
    setNote(null);
    setShowResult(false);
    seed.current = Math.floor(Math.random() * 1000);
    say("ai", "start");
    setMeSay(null);
    readySound();
    setBanner({
      text: "READY",
      sub: color === BLACK ? "내가 흑 · 먼저 둬요" : "내가 백 · 요괴가 먼저",
      key: seed.current,
    });
    window.setTimeout(() => {
      fightSound();
      setBanner({ text: "FIGHT!", tone: "red", key: seed.current + 1 });
    }, 900);
  }

  function pick(p: number) {
    if (!myTurn) return;
    if (boardFrom(moves)[p] !== 0) return;
    if (forbidden.includes(p)) {
      setNote("흑은 삼삼(열린 3이 두 줄)에 둘 수 없어요.");
      setPreview(null);
      return;
    }
    if (preview !== p) {
      setPreview(p);
      setNote("같은 곳을 한 번 더 누르거나 「착수」 버튼을 눌러요");
      return;
    }
    apply(p, "me");
  }

  /** 휴대폰 돋보기로 맞추고 손을 떼면 바로 착수 */
  function placeNow(p: number) {
    if (!myTurn) return;
    if (boardFrom(moves)[p] !== 0) return;
    if (forbidden.includes(p)) {
      setNote("흑은 삼삼(열린 3이 두 줄)에 둘 수 없어요.");
      return;
    }
    setPreview(null);
    try {
      navigator.vibrate?.(30);
    } catch {
      /* 진동 없는 기기 */
    }
    apply(p, "me");
  }

  function undo() {
    if (!human || winner !== null) return;
    const back = turn === human ? 2 : 1;
    const next = moves.slice(0, Math.max(0, moves.length - back));
    if (human === WHITE && next.length === 0) return;
    setMoves(next);
    setPreview(null);
    setNote(null);
    setNote("↩ 한 수 물렀어요");
  }

  /* ── 돌 고르기(도전자 화면) ── */
  if (!human) {
    return (
      <div data-omok-ai-pick className="arcade-panel grid gap-4 p-5">
        <p className="arcade-px neon-gold text-center text-sm">CHALLENGER</p>
        <div className="grid justify-items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 상대 요괴 */}
          <img
            src={`/yokai/${opp.species}-${opp.stage}.webp`}
            alt=""
            draggable={false}
            className="arcade-bob size-40 object-contain drop-shadow-[0_0_18px_rgba(190,110,255,.6)]"
          />
          <p className="arcade-kr text-3xl text-white">{opp.title}</p>
          <p
            className="rounded-full px-3 py-0.5 text-sm font-black text-black"
            style={{ background: opp.tone }}
          >
            난이도 {opp.tier}
          </p>
          <p className="rounded-xl border-2 border-[#0a0614] bg-[#fff7e0] px-4 py-2 text-base font-black text-[#2a1a10] shadow-[3px_3px_0_#0a0614]">
            {opp.lines.start[0]}
          </p>
        </div>
        <p className="arcade-kr text-center text-xl text-[#ffcf4a]">
          돌을 고르세요
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-omok-start="b"
            onClick={() => start(BLACK)}
            className="arcade-btn min-h-16 bg-gradient-to-b from-[#4a4a4a] to-[#050505] text-lg text-white"
          >
            ⚫ 흑 · 먼저
          </button>
          <button
            type="button"
            data-omok-start="w"
            onClick={() => start(WHITE)}
            className="arcade-btn min-h-16 bg-gradient-to-b from-white to-[#cfc6b4] text-lg text-black"
          >
            ⚪ 백 · 나중
          </button>
        </div>
        <p className="text-center text-sm text-[#d6cdee]">
          흑은 삼삼 금지 · 요괴 연습은 전적에 안 들어가요
        </p>
      </div>
    );
  }

  const humanWon = winner !== null && winner !== "draw" && winner === human;
  const resultTitle =
    winner === "draw" ? "DRAW" : humanWon ? "YOU WIN!" : "YOU LOSE";
  return (
    <div data-omok-ai className="grid gap-2.5">
      <OmokHud
        left={{
          name: me.nickname,
          yokai: me.yokai,
          color: human as 1 | 2,
          tag: "나",
          active: myTurn,
          bubble: meSay,
          jumpKey: jump.me,
          result:
            winner === null || winner === "draw"
              ? null
              : humanWon
                ? "win"
                : "lose",
        }}
        right={{
          name: opp.title,
          yokai: oppYokai,
          color: ai as 1 | 2,
          tag: "요괴",
          record: `난이도 ${opp.tier}`,
          active: playing && turn === ai,
          bubble: aiSay,
          jumpKey: jump.ai,
          result:
            winner === null || winner === "draw"
              ? null
              : humanWon
                ? "lose"
                : "win",
        }}
      />
      <div className="relative mt-1">
        <OmokBoard
          moves={moves}
          forbidden={forbidden}
          line={line}
          preview={preview}
          previewColor={human as 1 | 2}
          onPick={pick}
          onTouchPlace={placeNow}
          disabled={!myTurn}
        />
        {bigWin ? (
          <BigWinCutIn
            key={bigWin.key}
            yokai={bigWin.yokai}
            title={bigWin.title}
            tip={bigWin.tip}
            side={bigWin.side}
          />
        ) : null}
        {banner ? (
          <ArcadeBanner
            key={banner.key}
            text={banner.text}
            sub={banner.sub}
            tone={banner.tone}
          />
        ) : null}
        {winner !== null && showResult ? (
          <div
            data-omok-result
            className="arcade-overlay absolute inset-0 z-20 grid place-items-center rounded-[14px] p-4 text-center"
          >
            <div className="grid w-full justify-items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- 이긴 쪽 요괴 */}
              <img
                src={
                  humanWon && me.yokai
                    ? `/yokai/${me.yokai.species}-${me.yokai.stage}.webp`
                    : `/yokai/${opp.species}-${opp.stage}.webp`
                }
                alt=""
                draggable={false}
                className="arcade-bob size-28 object-contain drop-shadow-[0_0_16px_rgba(255,200,60,.75)]"
              />
              <p
                className={cn(
                  "arcade-px arcade-pop text-3xl sm:text-4xl",
                  humanWon
                    ? "neon-gold"
                    : winner === "draw"
                      ? "neon-cyan"
                      : "neon-red",
                )}
              >
                {resultTitle}
              </p>
              <p className="arcade-kr text-lg text-white">
                {resigned
                  ? "기권"
                  : winner === "draw"
                    ? "무승부"
                    : humanWon
                      ? `${opp.title}을(를) 이겼어요!`
                      : `${opp.title}의 승리`}
              </p>
              <div className="mt-1 grid w-full max-w-xs gap-2">
                <button
                  type="button"
                  data-omok-again
                  onClick={() => start(human === BLACK ? WHITE : BLACK)}
                  className="arcade-btn btn-main"
                >
                  🔁 흑백 바꿔 한 판 더
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResult(false)}
                    className="arcade-btn btn-dark"
                  >
                    판 보기
                  </button>
                  <button
                    type="button"
                    data-omok-other
                    onClick={() => setPicker(true)}
                    className="arcade-btn btn-dark grid place-items-center"
                  >
                    다른 요괴
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {picker ? (
          <div
            data-omok-picker
            className="arcade-overlay absolute inset-0 z-30 grid place-items-center overflow-y-auto rounded-[14px] p-3 text-center"
          >
            <div className="grid w-full max-w-md gap-2">
              <p className="arcade-kr text-xl text-white">👹 어떤 요괴와 둘까요?</p>
              <div
                className="grid grid-cols-2 gap-2"
                // 같은 요괴를 고르면(주소가 같아 이동이 없으니) 바로 새 판
                onClickCapture={(e) => {
                  const card = (e.target as HTMLElement).closest("[data-omok-opponent]");
                  if (card?.getAttribute("data-omok-opponent") === opp.species) {
                    e.preventDefault();
                    setPicker(false);
                    start(human);
                  }
                }}
              >
                {OMOK_OPPONENTS.map((o, i) => (
                  <OpponentCard key={o.species} index={i} href={`/games/omok/ai?vs=${i}`} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPicker(false)} className="arcade-btn btn-dark">
                  닫기
                </button>
                <Link href="/games/omok" className="arcade-btn btn-dark grid place-items-center">
                  오목 대기실로
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {myTurn ? (
        <button
          type="button"
          data-omok-place
          disabled={preview === null}
          onClick={() => {
            if (preview !== null) apply(preview, "me");
          }}
          className={cn("arcade-btn min-h-14 text-xl", preview !== null ? "btn-gold" : "btn-dark")}
        >
          {preview !== null ? "✅ 여기에 착수" : "👆 놓을 자리를 눌러 주세요"}
        </button>
      ) : null}
      <p
        role="status"
        className={cn(
          "min-h-7 text-center text-base font-black",
          note?.includes("삼삼")
            ? "text-[#ff5d6c]"
            : myTurn
              ? "text-[#ffcf4a]"
              : "text-[#d6cdee]",
        )}
      >
        {winner === null
          ? (note ??
            (myTurn
              ? "▶ 내 차례! 자리를 누르고 한 번 더(또는 착수)"
              : `${opp.title} 생각 중…`))
          : ""}
      </p>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        {winner === null ? (
          <>
            <button
              type="button"
              data-omok-undo
              onClick={undo}
              disabled={!moves.length || !myTurn}
              className="arcade-btn btn-dark"
            >
              ↩ 물리기
            </button>
            <button
              type="button"
              onClick={() => finish(ai, true)}
              className="arcade-btn btn-dark !text-[#ff9aa4]"
            >
              🏳 기권
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowResult(true)}
            className="arcade-btn btn-dark col-span-2"
          >
            결과 다시 보기
          </button>
        )}
        <button
          type="button"
          aria-pressed={sound}
          aria-label={sound ? "효과음 끄기" : "효과음 켜기"}
          onClick={() => {
            setOmokSound(!sound);
            setSound(!sound);
          }}
          className="arcade-btn btn-dark px-4"
        >
          {sound ? "🔊" : "🔈"}
        </button>
      </div>
    </div>
  );
}

/** 상대 요괴 카드(로비 캐릭터 선택) */
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
      <span className="hud-portrait relative grid size-24 place-items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- 요괴 픽셀 그림 */}
        <img
          src={`/yokai/${o.species}-${o.stage}.webp`}
          alt=""
          className="size-full object-contain"
          draggable={false}
        />
      </span>
      <b className="text-center text-base leading-tight font-black text-white">
        {o.title}
      </b>
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-black text-black"
        style={{ background: o.tone }}
      >
        {o.tier}
      </span>
    </>
  );
  return href ? (
    <Link
      href={href}
      data-omok-opponent={o.species}
      className="hud-plate grid justify-items-center gap-2 p-3 transition hover:brightness-125 active:scale-95"
    >
      {body}
    </Link>
  ) : (
    <div className="hud-plate grid justify-items-center gap-2 p-3">{body}</div>
  );
}
