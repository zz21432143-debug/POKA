"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import {
  ArcadeBanner,
  BigWinCutIn,
  OmokHud,
  Spectators,
  YokaiCutIn,
  type CutInData,
  type HudSeat,
} from "@/components/games/omok-hud";
import {
  BLACK,
  TURN_SECONDS,
  WHITE,
  boardFrom,
  colorOfMove,
  forbiddenCells,
  makesFour,
  winTip,
  type Stone,
} from "@/lib/omok";
import type { YokaiSpecies } from "@/lib/yokai";
import { PLAYER_LINES, pickOmokLine } from "@/lib/omok-lines";
import {
  bellSound,
  cutInSound,
  fightSound,
  omokSoundOn,
  readySound,
  resultSound,
  setOmokSound,
  stoneClick,
  warnBeep,
} from "@/lib/omok-sound";
import type { OmokRecord, OmokView } from "@/lib/omok-server";

const EMOTES = ["👍", "😮", "😈", "🔥", "😭", "🙏"];
const END_TEXT: Record<string, string> = {
  five: "5목 완성!",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
  "draw-agree": "합의 무승부",
  cancel: "방이 닫혔어요",
};

/** 「3승 1패 1기권」(패에는 기권 빼고) */
export function recordText(r: OmokRecord | null | undefined) {
  if (!r) return null;
  return `${r.wins}승 ${r.losses - r.resigns}패${r.resigns ? ` ${r.resigns}기권` : ""}${r.draws ? ` ${r.draws}무` : ""}`;
}

type Banner = {
  text: string;
  sub?: string;
  tone?: "gold" | "red" | "cyan";
  key: number;
};

/**
 * 친구 대전 방(아케이드): 방 코드로 초대 → 오목판 앞 대기실(방장 · 손님 자리, 둘 다 READY면 시작) → READY · FIGHT →
 * 대국(물리기 · 기권 · 이모티콘 · 요괴 컷인) → 결과 · 한 판 더. 링크나 코드가 있으면 누구나 관전(관전자 닉네임 표시).
 */
export function OmokRoom({
  initial,
  loggedIn,
  hasYokai,
  shareUrl,
}: {
  initial: OmokView;
  loggedIn: boolean;
  hasYokai: boolean;
  shareUrl: string;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [records, setRecords] = useState(initial.records ?? null);
  const [offset, setOffset] = useState(() => initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [preview, setPreview] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmKick, setConfirmKick] = useState(false);
  const [say, setSay] = useState<Record<number, { text: string; key: number }>>(
    {},
  );
  const [emoteWait, setEmoteWait] = useState(0);
  const [sound, setSound] = useState(true);
  const [numbers, setNumbers] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [cutIn, setCutIn] = useState<CutInData | null>(null);
  const [bigWin, setBigWin] = useState<{
    key: number;
    side: "left" | "right";
    yokai: { species: YokaiSpecies; stage: number } | null;
    title: string;
    tip: string;
  } | null>(null);
  const [plateEmote, setPlateEmote] = useState<{
    by: Stone;
    e: string;
    key: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(initial.status === "done");
  const [jump, setJump] = useState<Record<number, number>>({});
  const [watching, setWatching] = useState({
    count: initial.watchers ?? 0,
    names: initial.watcherNames ?? [],
  });
  const [watchKey] = useState(() =>
    Math.random().toString(36).slice(2, 14).padEnd(10, "0"),
  );
  const versionRef = useRef(initial.version);
  const seatedRef = useRef(Boolean(initial.me || initial.seat));
  const prev = useRef(initial);
  const lastBeep = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  function receive(next: OmokView) {
    versionRef.current = next.version;
    seatedRef.current = Boolean(next.me || next.seat);
    if (next.watchers !== undefined)
      setWatching({ count: next.watchers, names: next.watcherNames ?? [] });
    if (next.records) setRecords(next.records);
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(화면을 안 보면 5초) 바뀐 것만 · 관전자는 4번에 1번 「보고 있어요」
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tick = 0;
    const loop = async () => {
      tick += 1;
      const watch =
        !seatedRef.current && tick % 4 === 1 ? `&w=${watchKey}` : "";
      try {
        const res = await fetch(
          `/api/games/omok/${initial.id}?v=${versionRef.current}${watch}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as {
            same: boolean;
            view?: OmokView;
            watchers?: number;
            watcherNames?: string[];
          };
          if (alive && !json.same && json.view) receive(json.view);
          if (alive && json.same && json.watchers !== undefined)
            setWatching({
              count: json.watchers,
              names: json.watcherNames ?? [],
            });
        }
      } catch {
        /* 다음에 다시 */
      }
      if (alive) timer = window.setTimeout(loop, document.hidden ? 5000 : 1000);
    };
    timer = window.setTimeout(loop, 700);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [initial.id, watchKey]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const leftColor: Stone = view.me || BLACK;

  // 판이 바뀌면: 소리 · 컷인 · 말풍선 · READY/FIGHT · 결과 · 물리기 · 이모티콘(서버에서 받은 변화에 맞춰 화면을 바꿈)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    const seed = view.version * 13 + view.moves.length;
    const lc: Stone = view.me || BLACK;
    const sideOf = (c: Stone): "left" | "right" =>
      c === lc ? "left" : "right";
    const yokaiOf = (c: Stone) =>
      (c === BLACK ? view.black : view.white)?.yokai ?? null;
    const cut = (c: CutInData) => {
      cutInSound();
      setCutIn(c);
    };
    // 대기실: 손님이 앉음 · READY
    if (view.status === "waiting") {
      if (view.guest && !before.guest) {
        bellSound();
        cut({
          key: seed,
          side: view.seat === "guest" ? "left" : "right",
          yokai: view.guest.yokai,
          text: "도전자 등장!",
          tone: "green",
        });
      }
      if (
        (view.hostReady && !before.hostReady) ||
        (view.guestReady && !before.guestReady)
      )
        readySound();
    }
    // 시작
    if (view.status === "playing" && before.status === "waiting") {
      readySound();
      setBanner({ text: "READY", sub: "흑이 먼저 둬요", key: seed });
      window.setTimeout(() => {
        fightSound();
        setBanner({ text: "FIGHT!", tone: "red", key: seed + 1 });
      }, 1000);
      setSay({
        [BLACK]: { text: pickOmokLine(PLAYER_LINES.start, seed), key: seed },
        [WHITE]: {
          text: pickOmokLine(PLAYER_LINES.start, seed + 1),
          key: seed + 1,
        },
      });
    }
    // 돌: 소리 · 둔 사람 요괴 점프 · 4목이면 말풍선만(판은 가리지 않음)
    if (view.moves.length > before.moves.length) {
      stoneClick();
      setPreview(null);
      const by = colorOfMove(view.moves.length - 1);
      setJump((j) => ({ ...j, [by]: seed }));
      if (view.status === "playing" && makesFour(view.moves)) {
        setSay({
          [by]: { text: pickOmokLine(PLAYER_LINES.four, seed), key: seed },
          [by === BLACK ? WHITE : BLACK]: {
            text: pickOmokLine(PLAYER_LINES.danger, seed),
            key: seed + 1,
          },
        });
      }
    }
    if (view.moves.length < before.moves.length && view.status === "playing") {
      setNote("↩ 한 수 물렀어요");
      setPreview(null);
    }
    // 끝: 5목이면 큰 요괴가 화면을 덮고 훈수 → 결과
    if (view.status === "done" && before.status !== "done") {
      setShowResult(false);
      let wait = 300;
      if (view.winner) {
        const loser = view.winner === BLACK ? WHITE : BLACK;
        setSay({
          [loser]: {
            text: pickOmokLine(PLAYER_LINES.lose, seed),
            key: seed + 1,
          },
        });
        resultSound(view.me ? view.winner === view.me : true);
        if (view.endReason === "five") {
          cutInSound();
          const t = winTip(view.moves);
          setBigWin({
            key: seed,
            side: sideOf(view.winner),
            yokai: yokaiOf(view.winner),
            title: t.dir ? `${t.dir} 5목!` : "5목 완성!",
            tip: t.tip,
          });
          wait = 3800;
        }
      }
      window.setTimeout(() => {
        setBigWin(null);
        setShowResult(true);
      }, wait);
      if (!view.records)
        void fetch(`/api/games/omok/${view.id}?rec=1`, { cache: "no-store" })
          .then((r) => r.json() as Promise<{ view?: OmokView }>)
          .then((j) => j.view?.records && setRecords(j.view.records))
          .catch(() => undefined);
    }
    if (
      view.undo.deniedAt &&
      view.undo.deniedAt !== before.undo.deniedAt &&
      view.undo.deniedBy === view.me
    )
      setNote("상대가 물리기를 거절했어요.");
    if (
      view.draw.deniedAt &&
      view.draw.deniedAt !== before.draw?.deniedAt &&
      view.draw.deniedBy === view.me
    )
      setNote("상대가 무승부를 거절했어요.");
    // 이모티콘: 대기실은 요괴와 함께 크게(판에 돌이 없음) · 대국 중에는 보낸 사람 명판 위에(판은 가리지 않음)
    if (
      view.emote &&
      view.emote.at !== before.emote?.at &&
      Date.now() + offset - view.emote.at < 8000
    ) {
      const by = view.emote.by;
      if (view.status === "playing") {
        setPlateEmote({ by, e: view.emote.e, key: view.emote.at });
      } else {
        const yk =
          by === BLACK
            ? (view.host?.yokai ?? null)
            : (view.guest?.yokai ?? null);
        const mineSide = view.seat === "guest" ? WHITE : BLACK;
        cut({
          key: view.emote.at,
          side: by === mineSide ? "left" : "right",
          yokai: yk,
          emoji: view.emote.e,
          tone: "blue",
        });
      }
    }
    // 대국자는 「한 판 더」가 생기면 바로 다음 판(대기실)으로
    if (view.nextId && view.me) router.replace(`/games/omok/${view.nextId}`);
  }, [view, offset, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 큰 글자 1.2초 · 컷인 1.8초 · 말풍선 4초
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 1200);
    return () => window.clearTimeout(t);
  }, [banner]);
  useEffect(() => {
    if (!cutIn) return;
    const t = window.setTimeout(() => setCutIn(null), 1800);
    return () => window.clearTimeout(t);
  }, [cutIn]);
  useEffect(() => {
    if (!plateEmote) return;
    const t = window.setTimeout(() => setPlateEmote(null), 2600);
    return () => window.clearTimeout(t);
  }, [plateEmote]);
  useEffect(() => {
    if (!Object.keys(say).length) return;
    const t = window.setTimeout(() => setSay({}), 4000);
    return () => window.clearTimeout(t);
  }, [say]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/games/omok/${view.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = (await res.json()) as {
        view?: OmokView;
        error?: string;
        code?: string;
      };
      if (json.code === "NO_YOKAI") {
        router.push(
          `/yokai?next=${encodeURIComponent(`/games/omok/${view.id}`)}`,
        );
        return;
      }
      if (json.view) receive(json.view);
      if (!res.ok) {
        setNote(json.error ?? "처리하지 못했어요.");
        if (res.status === 409) {
          const fresh = await fetch(`/api/games/omok/${view.id}`, {
            cache: "no-store",
          }).then((r) => r.json() as Promise<{ view?: OmokView }>);
          if (fresh.view) receive(fresh.view);
        }
      }
    } catch {
      setNote("연결이 끊겼어요. 잠시 뒤 다시 해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const turn = colorOfMove(view.moves.length);
  const playing = view.status === "playing";
  const waiting = view.status === "waiting";
  const myTurn = playing && view.me !== 0 && turn === view.me;
  const forbidden = useMemo(
    () =>
      myTurn && view.me === BLACK ? forbiddenCells(boardFrom(view.moves)) : [],
    [view.moves, myTurn, view.me],
  );
  const secondsLeft =
    playing && view.turnAt
      ? Math.max(
          0,
          TURN_SECONDS - Math.floor((now + offset - view.turnAt) / 1000),
        )
      : null;
  const askBy = view.undo.askBy;
  const iAsked = Boolean(view.me && askBy === view.me);
  const theyAsked = Boolean(view.me && askBy && askBy !== view.me);
  const myUndoLeft = view.me ? view.undo.left[view.me as 1 | 2] : 0;
  const drawBy = view.draw.offerBy;
  const iOfferedDraw = Boolean(view.me && drawBy === view.me);
  const theyOfferedDraw = Boolean(view.me && drawBy && drawBy !== view.me);
  const myDrawLeft = view.me ? view.draw.left[view.me as 1 | 2] : 0;
  const iHaveMoved = Boolean(
    view.me && view.moves.some((_, i) => colorOfMove(i) === view.me),
  );
  const seated = Boolean(view.seat) && waiting;
  const myReady =
    view.seat === "host"
      ? view.hostReady
      : view.seat === "guest"
        ? view.guestReady
        : false;
  const spectator = !view.me && !view.seat;
  const code = view.code ?? "";

  // 내 차례 10초 남으면 매초 삑
  useEffect(() => {
    if (!myTurn || secondsLeft === null || secondsLeft > 10 || secondsLeft < 1)
      return;
    if (lastBeep.current === secondsLeft) return;
    lastBeep.current = secondsLeft;
    warnBeep();
  }, [myTurn, secondsLeft]);

  function pick(p: number) {
    if (!myTurn || busy || theyAsked) return;
    if (boardFrom(view.moves)[p] !== 0) return;
    if (forbidden.includes(p)) {
      setPreview(null);
      setNote("흑은 삼삼(열린 3이 두 줄)에 둘 수 없어요.");
      return;
    }
    if (preview !== p) {
      setPreview(p);
      setNote("같은 곳을 한 번 더 누르면 둬요");
      return;
    }
    void act("move", { p });
  }

  /* ── HUD 자리 ── */
  const info = (c: Stone) => (c === BLACK ? view.black : view.white);
  const recOf = (c: Stone) =>
    recordText(c === BLACK ? records?.black : records?.white);
  const rightColor: Stone = leftColor === BLACK ? WHITE : BLACK;
  const seatOf = (c: Stone): HudSeat => {
    const p = info(c);
    return {
      name: p?.nickname ?? "",
      yokai: p?.yokai ?? null,
      color: c as 1 | 2,
      tag: view.me === c ? "나" : view.me ? "상대" : c === BLACK ? "흑" : "백",
      record: recOf(c),
      active: playing && turn === c,
      secondsLeft: playing && turn === c ? secondsLeft : null,
      totalSeconds: TURN_SECONDS,
      bubble: say[c] ?? null,
      result:
        view.status === "done" && view.winner
          ? view.winner === c
            ? "win"
            : "lose"
          : null,
      jumpKey: jump[c],
      emote:
        plateEmote?.by === c ? { e: plateEmote.e, key: plateEmote.key } : null,
    };
  };
  // 대기실: 흑 자리 = 방장 · 백 자리 = 손님(내가 손님이면 내 자리를 왼쪽에)
  const hostSeat: HudSeat = {
    name: view.host?.nickname ?? "방장",
    yokai: view.host?.yokai ?? null,
    color: 0,
    tag: view.seat === "host" ? "나" : "방장",
    record: recordText(records?.black),
    active: false,
    ready: view.hostReady,
  };
  const guestSeat: HudSeat = view.guest
    ? {
        name: view.guest.nickname,
        yokai: view.guest.yokai,
        color: 0,
        tag: view.seat === "guest" ? "나" : "손님",
        record: recordText(records?.white),
        active: false,
        ready: view.guestReady,
      }
    : {
        name: "",
        yokai: null,
        color: 0,
        tag: "손님",
        active: false,
        empty: true,
        ready: false,
      };
  const hud = waiting
    ? view.seat === "guest"
      ? { left: guestSeat, right: hostSeat }
      : { left: hostSeat, right: guestSeat }
    : { left: seatOf(leftColor), right: seatOf(rightColor) };

  const resultTitle =
    view.status !== "done"
      ? ""
      : view.endReason === "cancel"
        ? "CLOSED"
        : !view.winner
          ? "DRAW"
          : view.me
            ? view.winner === view.me
              ? "YOU WIN!"
              : "YOU LOSE"
            : "WINNER!";
  const winnerInfo = view.winner ? info(view.winner) : null;
  const inviteText = `${view.host?.nickname ?? ""}님이 POKA 요괴 오목 한 판 하재요! 🏮\n방 코드: ${code}`;

  const emoteRow = (
    <div className="flex justify-center gap-1.5" aria-label="이모티콘 보내기">
      {EMOTES.map((e) => (
        <button
          key={e}
          type="button"
          data-omok-emote={e}
          disabled={emoteWait > now}
          onClick={() => {
            setEmoteWait(Date.now() + 3000);
            void act("emote", { e });
          }}
          className="arcade-btn btn-dark grid size-12 !min-h-0 place-items-center text-2xl"
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div
      data-omok-room={view.status}
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"
    >
      {/* ── 왼쪽(휴대폰은 위): HUD · 판 · 조작 ── */}
      <div className="grid gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {code ? (
            <button
              type="button"
              data-omok-code-chip
              onClick={() => void copy(code, "코드")}
              className="g-chip !border-[#ffcf4a]/70 !text-[#ffcf4a]"
            >
              🏮 방 코드{" "}
              <b className="arcade-px text-[12px] tracking-widest">{code}</b>
            </button>
          ) : null}
          <span className="ml-auto">
            {watching.count > 0 ? (
              <Spectators
                count={watching.count}
                names={watching.names}
                me={spectator}
              />
            ) : spectator ? (
              <span className="g-chip !text-[#8eeaff]">👀 관전 중</span>
            ) : null}
          </span>
        </div>

        <OmokHud left={hud.left} right={hud.right} />

        <div className={cn("relative mt-1", theyAsked && "arcade-shake")}>
          <OmokBoard
            moves={view.moves}
            forbidden={forbidden}
            line={view.line}
            preview={preview}
            previewColor={view.me === WHITE ? 2 : 1}
            onPick={pick}
            disabled={!myTurn || busy || theyAsked}
            showNumbers={numbers}
          />

          {/* 대기실: 판 위에 방 코드 */}
          {waiting ? (
            <div
              data-omok-waiting
              className="arcade-overlay absolute inset-0 z-20 grid place-items-center rounded-[14px] p-4 text-center"
            >
              <div className="grid justify-items-center gap-3">
                <p className="arcade-px neon-gold text-xs sm:text-sm">
                  ROOM CODE
                </p>
                <button
                  type="button"
                  data-omok-code
                  onClick={() => void copy(code, "코드")}
                  className="flex gap-1.5 text-2xl sm:text-3xl"
                  aria-label={`방 코드 ${code} 복사`}
                >
                  {code.split("").map((ch, i) => (
                    <span key={i} className="code-box">
                      {ch}
                    </span>
                  ))}
                </button>
                <p className="text-sm font-bold text-[#d6cdee]">
                  {copied === "코드"
                    ? "✅ 코드를 복사했어요!"
                    : "눌러서 코드 복사"}
                </p>
                <p className="arcade-kr text-xl text-white">
                  {!view.guest
                    ? "친구를 기다리는 중…"
                    : view.hostReady && view.guestReady
                      ? "곧 시작해요!"
                      : "둘 다 READY를 누르면 시작!"}
                </p>
                {!view.guest ? (
                  <p className="arcade-px arcade-blink text-[11px] text-[#ffcf4a]">
                    WAITING FOR 2P
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {cutIn ? <YokaiCutIn key={cutIn.key} data={cutIn} /> : null}
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

          {/* 물리기 요청 받음 */}
          {theyAsked ? (
            <div
              data-omok-undo-ask
              className="arcade-overlay absolute inset-x-3 top-1/2 z-20 grid -translate-y-1/2 gap-3 rounded-2xl border-2 border-[#6ad7ff] p-4 text-center"
            >
              <p className="arcade-px neon-cyan text-sm">UNDO?</p>
              <p className="arcade-kr text-xl text-white">
                상대가 한 수 물러 달래요
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-omok-undo-yes
                  disabled={busy}
                  onClick={() => void act("undo-yes")}
                  className="arcade-btn btn-green"
                >
                  들어주기
                </button>
                <button
                  type="button"
                  data-omok-undo-no
                  disabled={busy}
                  onClick={() => void act("undo-no")}
                  className="arcade-btn btn-dark"
                >
                  거절
                </button>
              </div>
            </div>
          ) : null}

          {/* 무승부 제안 받음 */}
          {theyOfferedDraw && !theyAsked ? (
            <div
              data-omok-draw-ask
              className="arcade-overlay absolute inset-x-3 top-1/2 z-20 grid -translate-y-1/2 gap-3 rounded-2xl border-2 border-[#ffcf4a] p-4 text-center"
            >
              <p className="arcade-px neon-gold text-sm">DRAW?</p>
              <p className="arcade-kr text-xl text-white">
                상대가 무승부를 제안했어요
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-omok-draw-yes
                  disabled={busy}
                  onClick={() => void act("draw-yes")}
                  className="arcade-btn btn-gold"
                >
                  🤝 무승부
                </button>
                <button
                  type="button"
                  data-omok-draw-no
                  disabled={busy}
                  onClick={() => void act("draw-no")}
                  className="arcade-btn btn-dark"
                >
                  계속 둘래요
                </button>
              </div>
            </div>
          ) : null}

          {/* 결과 */}
          {view.status === "done" && showResult ? (
            <div
              data-omok-result
              className="arcade-overlay absolute inset-0 z-20 grid place-items-center rounded-[14px] p-4 text-center"
            >
              <div className="grid w-full justify-items-center gap-2.5">
                {winnerInfo?.yokai ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 이긴 요괴
                  <img
                    src={`/yokai/${winnerInfo.yokai.species}-${winnerInfo.yokai.stage}.webp`}
                    alt=""
                    draggable={false}
                    className="arcade-bob size-28 object-contain drop-shadow-[0_0_16px_rgba(255,200,60,.75)]"
                  />
                ) : null}
                <p
                  className={cn(
                    "arcade-px arcade-pop text-3xl sm:text-4xl",
                    resultTitle === "YOU LOSE"
                      ? "neon-red"
                      : resultTitle === "DRAW" || resultTitle === "CLOSED"
                        ? "neon-cyan"
                        : "neon-gold",
                  )}
                >
                  {resultTitle}
                </p>
                <p className="arcade-kr text-lg text-white">
                  {winnerInfo ? `${winnerInfo.nickname} 승리 · ` : ""}
                  {END_TEXT[view.endReason] ?? ""}
                </p>
                <div className="mt-1 grid w-full max-w-xs gap-2">
                  {view.me && view.endReason !== "cancel" ? (
                    <button
                      type="button"
                      data-omok-rematch
                      disabled={busy}
                      onClick={() => void act("rematch")}
                      className="arcade-btn btn-main"
                    >
                      🔁 한 판 더(흑백 바꿈)
                    </button>
                  ) : null}
                  {!view.me && view.nextId ? (
                    <Link
                      href={`/games/omok/${view.nextId}`}
                      className="arcade-btn btn-main grid place-items-center"
                    >
                      👀 다음 판 관전
                    </Link>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    {view.moves.length ? (
                      <button
                        type="button"
                        onClick={() => setShowResult(false)}
                        className="arcade-btn btn-dark"
                      >
                        판 보기
                      </button>
                    ) : null}
                    <Link
                      href="/games/omok"
                      className={cn(
                        "arcade-btn btn-dark grid place-items-center",
                        !view.moves.length && "col-span-2",
                      )}
                    >
                      로비로
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* 상태 줄 */}
        {playing ? (
          <p
            role="status"
            className={cn(
              "min-h-7 text-center text-base font-black",
              note?.includes("삼삼") || note?.includes("거절")
                ? "text-[#ff5d6c]"
                : myTurn
                  ? "text-[#ffcf4a]"
                  : "text-[#d6cdee]",
            )}
          >
            {note ??
              (iOfferedDraw
                ? "무승부 제안 중… 상대 대답을 기다려요"
                : iAsked
                  ? "물리기 요청 중… 상대 대답을 기다려요"
                  : myTurn
                    ? "▶ 내 차례! 같은 곳을 두 번 누르면 둬요"
                    : view.me
                      ? "상대 차례…"
                      : `${turn === BLACK ? "흑" : "백"} 차례`)}
          </p>
        ) : null}

        {/* ── 대기실 조작 ── */}
        {waiting ? (
          <div className="grid gap-2">
            {seated ? (
              <button
                type="button"
                data-omok-ready={myReady ? "on" : "off"}
                disabled={busy || (view.seat === "host" && !view.guest)}
                onClick={() => void act("ready", { ready: !myReady })}
                className={cn(
                  "arcade-btn min-h-14 text-xl",
                  myReady ? "btn-dark" : "btn-green",
                )}
              >
                {view.seat === "host" && !view.guest
                  ? "친구가 앉으면 READY!"
                  : myReady
                    ? "READY 취소"
                    : "✅ READY!"}
              </button>
            ) : !view.guest ? (
              !loggedIn ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/games/omok/${view.id}`)}`}
                  className="arcade-btn btn-main grid min-h-14 place-items-center text-xl"
                >
                  로그인하고 착석하기
                </Link>
              ) : !hasYokai ? (
                <Link
                  href={`/yokai?next=${encodeURIComponent(`/games/omok/${view.id}`)}`}
                  data-omok-need-yokai
                  className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg"
                >
                  🏮 요괴를 고르고 착석하기
                </Link>
              ) : (
                <button
                  type="button"
                  data-omok-join
                  disabled={busy}
                  onClick={() => void act("sit")}
                  className="arcade-btn btn-main min-h-14 text-xl"
                >
                  ⚔️ 착석하기
                </button>
              )
            ) : (
              <p className="rounded-xl bg-white/5 p-3 text-center text-sm font-bold text-[#d6cdee]">
                자리가 다 찼어요. 관전석에서 볼 수 있어요.
              </p>
            )}
            {seated ? emoteRow : null}
            {note ? (
              <p className="text-center text-sm font-bold text-[#ff5d6c]">
                {note}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ── 대국 조작: 물리기 · 기권 · 이모티콘 ── */}
        {view.me && playing ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-omok-undo
                disabled={
                  busy || !iHaveMoved || iAsked || theyAsked || myUndoLeft <= 0
                }
                onClick={() => void act("undo-ask")}
                className="arcade-btn btn-dark"
              >
                ↩ 물리기 {myUndoLeft}
              </button>
              <button
                type="button"
                data-omok-draw
                disabled={
                  busy ||
                  iOfferedDraw ||
                  theyOfferedDraw ||
                  theyAsked ||
                  myDrawLeft <= 0
                }
                onClick={() => void act("draw-offer")}
                className="arcade-btn btn-dark"
              >
                {iOfferedDraw ? "제안 중…" : "🤝 무승부"}
              </button>
              {confirmResign ? (
                <button
                  type="button"
                  data-omok-resign-yes
                  disabled={busy}
                  onClick={() => void act("resign")}
                  className="arcade-btn btn-main"
                >
                  정말 기권
                </button>
              ) : (
                <button
                  type="button"
                  data-omok-resign
                  onClick={() => setConfirmResign(true)}
                  className="arcade-btn btn-dark !text-[#ff9aa4]"
                >
                  🏳 기권
                </button>
              )}
            </div>
            {emoteRow}
          </div>
        ) : null}

        {view.status === "done" && !showResult ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowResult(true)}
              className="arcade-btn btn-dark"
            >
              결과 다시 보기
            </button>
            <button
              type="button"
              aria-pressed={numbers}
              onClick={() => setNumbers(!numbers)}
              className="arcade-btn btn-dark"
            >
              {numbers ? "수 번호 끄기" : "🔢 수 순서 보기"}
            </button>
          </div>
        ) : null}
      </div>

      {/* ── 오른쪽(휴대폰은 아래): 초대 · 관전석 · 전적 ── */}
      <aside className="grid gap-3">
        {waiting ? (
          <section data-omok-invite className="arcade-panel grid gap-2.5 p-4">
            <h2 className="arcade-kr text-xl text-white">친구 부르기</h2>
            <p className="text-sm leading-relaxed text-[#d6cdee]">
              방 코드{" "}
              <b className="arcade-px text-[13px] text-[#ffcf4a]">{code}</b>를
              알려 주거나 링크를 보내 주세요. 친구는 「요괴 오목 → 코드로
              입장」에서 들어와요.
            </p>
            <button
              type="button"
              data-omok-share
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: "POKA 요괴 오목",
                      text: inviteText,
                      url: shareUrl,
                    });
                    return;
                  } catch (e) {
                    if (e instanceof DOMException && e.name === "AbortError")
                      return;
                  }
                }
                await copy(`${inviteText}\n${shareUrl}`, "초대 글");
              }}
              className="arcade-btn btn-kakao"
            >
              📤 카톡으로 부르기
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void copy(code, "코드")}
                className="arcade-btn btn-dark text-sm"
              >
                🔑 코드 복사
              </button>
              <button
                type="button"
                onClick={() => void copy(shareUrl, "링크")}
                className="arcade-btn btn-dark text-sm"
              >
                🔗 링크 복사
              </button>
            </div>
            {copied ? (
              <p className="text-sm font-black text-[#3ddc97]">
                ✅ {copied}를 복사했어요!
              </p>
            ) : null}
            {view.seat === "host" && view.guest ? (
              confirmKick ? (
                <button
                  type="button"
                  data-omok-kick-yes
                  disabled={busy}
                  onClick={() => {
                    setConfirmKick(false);
                    void act("kick");
                  }}
                  className="arcade-btn btn-main text-sm"
                >
                  정말 {view.guest.nickname}님 내보내기
                </button>
              ) : (
                <button
                  type="button"
                  data-omok-kick
                  onClick={() => setConfirmKick(true)}
                  className="arcade-btn btn-dark text-sm !text-[#ff9aa4]"
                >
                  🚪 손님 내보내기
                </button>
              )
            ) : null}
            {view.seat === "host" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act("cancel")}
                className="min-h-10 text-sm font-bold text-[#d6cdee] underline"
              >
                방 닫기
              </button>
            ) : view.seat === "guest" ? (
              <button
                type="button"
                data-omok-leave
                disabled={busy}
                onClick={() => void act("leave")}
                className="min-h-10 text-sm font-bold text-[#d6cdee] underline"
              >
                자리에서 일어나기
              </button>
            ) : null}
          </section>
        ) : null}

        <section data-omok-watch-panel className="arcade-panel grid gap-2 p-4">
          <h2 className="arcade-kr text-lg text-white">👀 관전석</h2>
          {watching.count ? (
            <Spectators
              count={watching.count}
              names={watching.names}
              me={spectator}
            />
          ) : (
            <p className="text-sm text-[#d6cdee]">
              아직 관전하는 사람이 없어요.
            </p>
          )}
        </section>

        <section data-omok-records className="arcade-panel grid gap-2 p-4">
          <h2 className="arcade-kr text-lg text-white">📜 전적</h2>
          {records?.h2h &&
          (records.h2h.a || records.h2h.b || records.h2h.draws) ? (
            <p
              data-omok-h2h
              className="rounded-xl bg-black/30 px-3 py-2 text-sm font-bold text-[#d6cdee]"
            >
              ⚔️ 상대 전적 ·{" "}
              <b className="text-white">
                {(waiting ? view.host?.nickname : view.black?.nickname) ?? "?"}
              </b>{" "}
              <b className="text-[#ffcf4a]">{records.h2h.a}승</b> :{" "}
              <b className="text-[#ffcf4a]">{records.h2h.b}승</b>{" "}
              <b className="text-white">
                {(waiting ? view.guest?.nickname : view.white?.nickname) ?? "?"}
              </b>
              {records.h2h.draws ? ` · 무 ${records.h2h.draws}` : ""}
            </p>
          ) : view.guest || !waiting ? (
            <p data-omok-h2h className="text-sm text-[#d6cdee]">
              ⚔️ 두 사람은 첫 대결이에요!
            </p>
          ) : null}
          {(waiting
            ? [
                {
                  key: "h",
                  name: view.host?.nickname,
                  rec: recordText(records?.black),
                  dot: 0 as Stone,
                },
                ...(view.guest
                  ? [
                      {
                        key: "g",
                        name: view.guest.nickname,
                        rec: recordText(records?.white),
                        dot: 0 as Stone,
                      },
                    ]
                  : []),
              ]
            : [leftColor, rightColor].map((c) => ({
                key: String(c),
                name: info(c)?.nickname,
                rec: recOf(c),
                dot: c,
              }))
          ).map((r) => (
            <p key={r.key} className="flex items-center gap-2 text-base">
              {r.dot ? (
                <span
                  className={cn(
                    "omok-stone inline-block size-4 shrink-0 rounded-full",
                    r.dot === BLACK ? "omok-black" : "omok-white",
                  )}
                />
              ) : null}
              <b className="min-w-0 truncate font-black text-white">
                {r.name ?? "?"}
              </b>
              <span className="ml-auto shrink-0 font-black text-[#ffcf4a] tabular-nums">
                {r.rec ?? "기록 없음"}
              </span>
            </p>
          ))}
          <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs text-[#d6cdee]">
            <span>친구 대전만 기록 · 9수 미만 판은 빼요</span>
            <button
              type="button"
              aria-pressed={sound}
              onClick={() => {
                setOmokSound(!sound);
                setSound(!sound);
              }}
              className="ml-auto min-h-10 rounded-lg px-2 text-sm font-bold text-white"
            >
              {sound ? "🔊 효과음" : "🔈 효과음 끔"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
