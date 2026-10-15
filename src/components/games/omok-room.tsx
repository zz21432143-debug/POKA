"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import {
  ArcadeBanner,
  OmokHud,
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
  type Stone,
} from "@/lib/omok";
import { PLAYER_LINES, pickOmokLine } from "@/lib/omok-lines";
import {
  omokSoundOn,
  resultSound,
  setOmokSound,
  stoneClick,
} from "@/lib/omok-sound";
import type { OmokRecord, OmokView } from "@/lib/omok-server";

const EMOTES = ["👍", "😮", "😈", "🔥", "😭", "🙏"];
const END_TEXT: Record<string, string> = {
  five: "5목 완성!",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
  cancel: "방이 닫혔어요",
};

/** 「3승 1패 1기권」(패에는 기권 빼고) */
export function recordText(r: OmokRecord | null | undefined) {
  if (!r) return null;
  return `${r.wins}승 ${r.losses - r.resigns}패${r.resigns ? ` ${r.resigns}기권` : ""}${r.draws ? ` ${r.draws}무` : ""}`;
}

/** 친구 대전 방(아케이드): 대기실 → READY · FIGHT → 대국(물리기 · 기권 · 이모티콘) → 결과 · 한 판 더. 링크가 있으면 누구나 관전 */
export function OmokRoom({
  initial,
  loggedIn,
  shareUrl,
}: {
  initial: OmokView;
  loggedIn: boolean;
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
  const [say, setSay] = useState<Record<number, { text: string; key: number }>>(
    {},
  );
  const [emoteShown, setEmoteShown] = useState<{
    by: Stone;
    e: string;
    at: number;
  } | null>(null);
  const [emoteWait, setEmoteWait] = useState(0);
  const [sound, setSound] = useState(true);
  const [numbers, setNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [banner, setBanner] = useState<{
    text: string;
    sub?: string;
    tone?: "gold" | "red" | "cyan";
    key: number;
  } | null>(null);
  const [hideResult, setHideResult] = useState(false);
  const versionRef = useRef(initial.version);
  // 관전자 수: 관전자 화면은 몇 초마다 무작위 키로 신호
  const [watching, setWatching] = useState(initial.watchers ?? 0);
  const [watchKey] = useState(() =>
    Math.random().toString(36).slice(2, 14).padEnd(10, "0"),
  );
  const meRef = useRef(initial.me);
  const prev = useRef(initial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  function receive(next: OmokView) {
    versionRef.current = next.version;
    meRef.current = next.me;
    if (next.watchers !== undefined) setWatching(next.watchers);
    if (next.records) setRecords(next.records);
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(화면을 안 보면 5초) 바뀐 것만
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tick = 0;
    const loop = async () => {
      tick += 1;
      const watch =
        meRef.current === 0 && tick % 4 === 1 ? `&w=${watchKey}` : "";
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
          };
          if (alive && !json.same && json.view) receive(json.view);
          if (alive && json.same && json.watchers !== undefined)
            setWatching(json.watchers);
        }
      } catch {
        /* 다음에 다시 */
      }
      if (alive) timer = window.setTimeout(loop, document.hidden ? 5000 : 1000);
    };
    timer = window.setTimeout(loop, 1000);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [initial.id, watchKey]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // 판이 바뀌면: 소리 · 말풍선 · READY/FIGHT · 결과 · 물리기 · 이모티콘(서버에서 받은 변화에 맞춰 화면을 바꿈)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    const seed = view.version * 13 + view.moves.length;
    if (view.moves.length > before.moves.length) {
      stoneClick();
      setPreview(null);
      if (makesFour(view.moves)) {
        const by = colorOfMove(view.moves.length - 1);
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
      setBanner({
        text: "UNDO",
        sub: "한 수 물렀어요",
        tone: "cyan",
        key: seed,
      });
      setPreview(null);
    }
    if (view.status === "playing" && before.status === "waiting") {
      setBanner({ text: "READY", sub: "흑이 먼저 둬요", key: seed });
      window.setTimeout(
        () => setBanner({ text: "FIGHT!", tone: "red", key: seed + 1 }),
        900,
      );
      setSay({
        [BLACK]: { text: pickOmokLine(PLAYER_LINES.start, seed), key: seed },
        [WHITE]: {
          text: pickOmokLine(PLAYER_LINES.start, seed + 1),
          key: seed + 1,
        },
      });
    }
    if (view.status === "done" && before.status !== "done") {
      setHideResult(false);
      if (view.winner) {
        const loser = view.winner === BLACK ? WHITE : BLACK;
        setSay({
          [view.winner]: {
            text: pickOmokLine(PLAYER_LINES.win, seed),
            key: seed,
          },
          [loser]: {
            text: pickOmokLine(PLAYER_LINES.lose, seed),
            key: seed + 1,
          },
        });
        resultSound(view.me ? view.winner === view.me : true);
      }
      // 끝난 판 전적 새로 받기
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
      view.emote &&
      view.emote.at !== before.emote?.at &&
      Date.now() + offset - view.emote.at < 8000
    )
      setEmoteShown(view.emote);
    // 대국자는 「한 판 더」가 생기면 바로 다음 판으로
    if (view.nextId && view.me) router.replace(`/games/omok/${view.nextId}`);
  }, [view, offset, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 이모티콘 3초 · 큰 글자 1.2초 · 말풍선 4초
  useEffect(() => {
    if (!emoteShown) return;
    const t = window.setTimeout(() => setEmoteShown(null), 3000);
    return () => window.clearTimeout(t);
  }, [emoteShown]);
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 1200);
    return () => window.clearTimeout(t);
  }, [banner]);
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
      const json = (await res.json()) as { view?: OmokView; error?: string };
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
  const iHaveMoved = Boolean(
    view.me && view.moves.some((_, i) => colorOfMove(i) === view.me),
  );

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

  // 왼쪽 = 나(관전은 흑) · 오른쪽 = 상대
  const leftColor: Stone = view.me || BLACK;
  const rightColor: Stone = leftColor === BLACK ? WHITE : BLACK;
  const info = (c: Stone) => (c === BLACK ? view.black : view.white);
  const recOf = (c: Stone) =>
    recordText(c === BLACK ? records?.black : records?.white);
  const seat = (c: Stone): HudSeat => {
    const p = info(c);
    return {
      name: p?.nickname ?? "",
      yokai: p?.yokai ?? null,
      color: c as 1 | 2,
      tag: view.me === c ? "YOU" : c === BLACK ? "1P" : "2P",
      record: recOf(c),
      active: playing && turn === c,
      secondsLeft: playing && turn === c ? secondsLeft : null,
      totalSeconds: TURN_SECONDS,
      bubble: say[c] ?? null,
      emote:
        emoteShown?.by === c ? { e: emoteShown.e, key: emoteShown.at } : null,
      result:
        view.status === "done" && view.winner
          ? view.winner === c
            ? "win"
            : "lose"
          : null,
    };
  };

  // 대기실: 방장(나)은 왼쪽에 앉아 있고 오른쪽은 빈자리
  const host = view.host;
  const waitLeft: HudSeat = {
    name: host?.nickname ?? "방장",
    yokai: host?.yokai ?? null,
    color: 1,
    tag: view.isHost ? "YOU" : "1P",
    record: null,
    active: false,
  };
  const waitRight: HudSeat = {
    name: "",
    yokai: null,
    color: 2,
    tag: view.isHost ? "2P" : "YOU?",
    active: false,
    empty: true,
  };

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
            : `${view.winner === BLACK ? "1P" : "2P"} WIN!`;
  const winnerInfo = view.winner ? info(view.winner) : null;

  return (
    <div data-omok-room={view.status} className="grid gap-2">
      {/* 위 HUD */}
      <OmokHud
        left={waiting ? waitLeft : seat(leftColor)}
        right={waiting ? waitRight : seat(rightColor)}
      />

      {/* 판 + 오버레이 */}
      <div className={cn("relative", theyAsked && "arcade-shake")}>
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

        {banner ? (
          <ArcadeBanner
            key={banner.key}
            text={banner.text}
            sub={banner.sub}
            tone={banner.tone}
          />
        ) : null}

        {/* 대기실 */}
        {waiting ? (
          <div
            data-omok-waiting
            className="arcade-overlay absolute inset-0 z-20 grid place-items-center rounded-[14px] p-4 text-center"
          >
            <div className="grid w-full max-w-xs gap-3">
              <p className="arcade-px neon-gold arcade-blink text-sm">
                {view.isHost ? "WAITING..." : "PRESS START"}
              </p>
              {view.isHost ? (
                <>
                  <p className="arcade-kr text-lg text-white">
                    친구를 불러 주세요!
                  </p>
                  <p className="text-xs text-zinc-300">
                    친구가 이 방에 들어오면 바로 시작해요(흑백은 무작위).
                  </p>
                  <button
                    type="button"
                    data-omok-share
                    onClick={async () => {
                      const text = `${host?.nickname ?? ""}님이 POKA 요괴 오목 한 판 하재요! 🏮`;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: "POKA 요괴 오목",
                            text,
                            url: shareUrl,
                          });
                          return;
                        } catch (e) {
                          if (
                            e instanceof DOMException &&
                            e.name === "AbortError"
                          )
                            return;
                        }
                      }
                      await navigator.clipboard
                        ?.writeText(`${text}\n${shareUrl}`)
                        .catch(() => undefined);
                      setCopied(true);
                    }}
                    className="arcade-btn arcade-kr min-h-12 bg-[#FEE500] text-base text-black"
                  >
                    📤 카톡으로 부르기
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard
                        ?.writeText(shareUrl)
                        .catch(() => undefined);
                      setCopied(true);
                    }}
                    className="arcade-btn arcade-kr min-h-11 bg-[#2a1636] text-sm text-[#f3d9a4]"
                  >
                    📋 링크 복사
                  </button>
                  <p
                    data-omok-link
                    className="truncate text-[11px] text-zinc-400 select-all"
                  >
                    {shareUrl}
                  </p>
                  {copied ? (
                    <p className="text-sm font-bold text-emerald-300">
                      복사했어요!
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("cancel")}
                    className="mx-auto min-h-9 rounded-lg px-3 text-xs text-zinc-400 underline"
                  >
                    방 닫기
                  </button>
                </>
              ) : loggedIn ? (
                <>
                  <p className="arcade-kr text-lg text-white">
                    {host?.nickname ?? "친구"}님이 기다리고 있어요
                  </p>
                  <p className="text-xs text-zinc-300">
                    흑이 먼저 · 흑은 삼삼 금지 · 한 수 {TURN_SECONDS}초
                  </p>
                  <button
                    type="button"
                    data-omok-join
                    disabled={busy}
                    onClick={() => void act("join")}
                    className="arcade-btn arcade-kr min-h-14 bg-gradient-to-b from-[#ff5a5a] to-[#b3122e] text-xl text-white"
                  >
                    ⚔️ 착석하기
                  </button>
                </>
              ) : (
                <>
                  <p className="arcade-kr text-lg text-white">
                    {host?.nickname ?? "친구"}님이 기다리고 있어요
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/games/omok/${view.id}`)}`}
                    className="arcade-btn arcade-kr grid min-h-14 place-items-center bg-gradient-to-b from-[#ff5a5a] to-[#b3122e] text-lg text-white"
                  >
                    로그인하고 착석하기
                  </Link>
                </>
              )}
              {note ? (
                <p className="text-sm font-bold text-rose-300">{note}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 물리기 요청 받음 */}
        {theyAsked ? (
          <div
            data-omok-undo-ask
            className="arcade-overlay absolute inset-x-3 top-1/2 z-20 grid -translate-y-1/2 gap-2 rounded-lg p-4 text-center"
          >
            <p className="arcade-px neon-cyan text-xs">UNDO?</p>
            <p className="arcade-kr text-base text-white">
              상대가 한 수 물러 달래요
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-omok-undo-yes
                disabled={busy}
                onClick={() => void act("undo-yes")}
                className="arcade-btn arcade-kr min-h-11 bg-[#1fa463] text-white"
              >
                들어주기
              </button>
              <button
                type="button"
                data-omok-undo-no
                disabled={busy}
                onClick={() => void act("undo-no")}
                className="arcade-btn arcade-kr min-h-11 bg-[#4a1a24] text-rose-100"
              >
                거절
              </button>
            </div>
          </div>
        ) : null}

        {/* 결과 */}
        {view.status === "done" && !hideResult ? (
          <div
            data-omok-result
            className="arcade-overlay absolute inset-0 z-20 grid place-items-center rounded-[14px] p-4 text-center"
          >
            <div className="grid justify-items-center gap-2">
              {winnerInfo?.yokai ? (
                // eslint-disable-next-line @next/next/no-img-element -- 이긴 요괴
                <img
                  src={`/yokai/${winnerInfo.yokai.species}-${winnerInfo.yokai.stage}.webp`}
                  alt=""
                  draggable={false}
                  className="arcade-bob size-24 object-contain drop-shadow-[0_0_14px_rgba(255,200,60,.7)]"
                />
              ) : null}
              <p
                className={cn(
                  "arcade-px arcade-pop text-2xl sm:text-3xl",
                  resultTitle === "YOU LOSE"
                    ? "neon-red"
                    : resultTitle === "DRAW" || resultTitle === "CLOSED"
                      ? "neon-cyan"
                      : "neon-gold",
                )}
              >
                {resultTitle}
              </p>
              <p className="arcade-kr text-sm text-white">
                {winnerInfo ? `${winnerInfo.nickname} 승리 · ` : ""}
                {END_TEXT[view.endReason] ?? ""}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {view.me && view.endReason !== "cancel" ? (
                  <button
                    type="button"
                    data-omok-rematch
                    disabled={busy}
                    onClick={() => void act("rematch")}
                    className="arcade-btn arcade-kr min-h-11 bg-gradient-to-b from-[#ff5a5a] to-[#b3122e] px-4 text-sm text-white"
                  >
                    🔁 한 판 더(흑백 바꿈)
                  </button>
                ) : null}
                {!view.me && view.nextId ? (
                  <Link
                    href={`/games/omok/${view.nextId}`}
                    className="arcade-btn arcade-kr grid min-h-11 place-items-center bg-[#2a1636] px-4 text-sm text-[#f3d9a4]"
                  >
                    👀 다음 판 관전
                  </Link>
                ) : null}
                {view.moves.length ? (
                  <button
                    type="button"
                    onClick={() => setHideResult(true)}
                    className="arcade-btn arcade-kr min-h-11 bg-[#2a1636] px-4 text-sm text-[#f3d9a4]"
                  >
                    판 보기
                  </button>
                ) : null}
                <Link
                  href="/games/omok"
                  className="arcade-btn arcade-kr grid min-h-11 place-items-center bg-[#140b1c] px-4 text-sm text-zinc-200"
                >
                  로비로
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 상태 줄 */}
      <p
        role="status"
        className={cn(
          "arcade-kr min-h-6 text-center text-sm",
          note?.includes("삼삼") || note?.includes("거절")
            ? "text-rose-300"
            : "text-[#ffe08a]",
        )}
      >
        {waiting
          ? ""
          : view.status === "done"
            ? ""
            : (note ??
              (iAsked
                ? "물리기 요청 중… 상대 대답을 기다려요"
                : myTurn
                  ? "▶ 내 차례!"
                  : view.me
                    ? "상대 차례…"
                    : `${turn === BLACK ? "흑" : "백"} 차례`))}
      </p>

      {/* 조작: 물리기 · 기권 · 이모티콘 · 소리 */}
      {view.me && playing ? (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-omok-undo
              disabled={
                busy || !iHaveMoved || iAsked || theyAsked || myUndoLeft <= 0
              }
              onClick={() => void act("undo-ask")}
              className="arcade-btn arcade-kr min-h-11 bg-[#2a1636] text-sm text-[#7df9ff]"
            >
              ↩ 물리기 요청 ({myUndoLeft})
            </button>
            {confirmResign ? (
              <button
                type="button"
                data-omok-resign-yes
                disabled={busy}
                onClick={() => void act("resign")}
                className="arcade-btn arcade-kr min-h-11 bg-[#b3122e] text-sm text-white"
              >
                정말 기권?
              </button>
            ) : (
              <button
                type="button"
                data-omok-resign
                onClick={() => setConfirmResign(true)}
                className="arcade-btn arcade-kr min-h-11 bg-[#3a0f18] text-sm text-rose-200"
              >
                🏳 기권
              </button>
            )}
          </div>
          <div
            className="flex justify-center gap-1.5"
            aria-label="이모티콘 보내기"
          >
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
                className="arcade-btn grid size-10 place-items-center bg-[#1a0f22] text-lg"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {view.status === "done" && hideResult ? (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setHideResult(false)}
            className="arcade-btn arcade-kr min-h-11 bg-[#2a1636] px-4 text-sm text-[#f3d9a4]"
          >
            결과 다시 보기
          </button>
          <button
            type="button"
            aria-pressed={numbers}
            onClick={() => setNumbers(!numbers)}
            className="arcade-btn arcade-kr min-h-11 bg-[#2a1636] px-4 text-sm text-[#f3d9a4]"
          >
            {numbers ? "수 번호 끄기" : "🔢 수 순서 보기"}
          </button>
        </div>
      ) : null}

      {/* 아래: 전적 · 관전 · 소리 */}
      <section data-omok-records className="arcade-panel grid gap-1.5 p-3">
        <div className="flex items-center gap-2">
          <span className="arcade-px neon-gold text-[10px]">RECORD</span>
          <span className="arcade-kr text-sm text-[#f3d9a4]">전적</span>
          {watching > 0 && !waiting ? (
            <span
              data-omok-watchers
              className="ml-auto text-xs font-bold text-[#7df9ff]"
            >
              👀{" "}
              {view.me
                ? `${watching}명 관전 중`
                : `관전 중 · 나 포함 ${watching}명`}
            </span>
          ) : view.me === 0 && !waiting ? (
            <span
              data-omok-spectate
              className="ml-auto text-xs font-bold text-[#7df9ff]"
            >
              👀 관전 중
            </span>
          ) : null}
        </div>
        {(waiting ? [] : [leftColor, rightColor]).map((c) => (
          <p key={c} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "omok-stone inline-block size-3.5 shrink-0 rounded-full",
                c === BLACK ? "omok-black" : "omok-white",
              )}
            />
            <b className="min-w-0 truncate font-black text-white">
              {info(c)?.nickname ?? "?"}
            </b>
            <span className="ml-auto shrink-0 font-black text-[#ffe08a] tabular-nums">
              {recOf(c) ?? "기록 없음"}
            </span>
          </p>
        ))}
        {waiting ? (
          <p className="text-xs text-zinc-400">
            대국이 시작되면 두 사람 전적이 여기 나와요.
          </p>
        ) : null}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
          <span>친구 대전만 기록 · 9수 미만 판은 빼요</span>
          <button
            type="button"
            aria-pressed={sound}
            onClick={() => {
              setOmokSound(!sound);
              setSound(!sound);
            }}
            className="ml-auto min-h-9 rounded-md px-2 text-sm text-zinc-300"
          >
            {sound ? "🔊" : "🔇"}
          </button>
        </div>
      </section>
    </div>
  );
}
