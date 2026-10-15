"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import { OmokPlayer } from "@/components/games/omok-player";
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
import type { OmokView } from "@/lib/omok-server";

const EMOTES = ["👍", "😮", "😈", "🔥", "😭", "🙏"];
const END_TEXT: Record<string, string> = {
  five: "5목 완성!",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
  cancel: "방이 닫혔어요",
};

/** 친구 대전 방: 1초마다 바뀐 것만 받아 옴 · 대국자는 두기/기권/이모티콘 · 나머지는 관전 */
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
  const versionRef = useRef(initial.version);
  const prev = useRef(initial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  function receive(next: OmokView) {
    versionRef.current = next.version;
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(화면을 안 보면 5초) 바뀐 것만
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const loop = async () => {
      try {
        const res = await fetch(
          `/api/games/omok/${initial.id}?v=${versionRef.current}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as { same: boolean; view?: OmokView };
          if (alive && !json.same && json.view) receive(json.view);
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
  }, [initial.id]);

  // 남은 시간 시계
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // 판이 바뀌면: 소리 · 4목 말풍선 · 결과 · 이모티콘
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    const seed = view.version * 13 + view.moves.length;
    if (view.moves.length > before.moves.length) {
      stoneClick();
      setPreview(null);
      if (makesFour(view.moves)) {
        const by = colorOfMove(view.moves.length - 1);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버에서 받은 판 변화에 맞춘 말풍선
        setSay({
          [by]: { text: pickOmokLine(PLAYER_LINES.four, seed), key: seed },
          [by === BLACK ? WHITE : BLACK]: {
            text: pickOmokLine(PLAYER_LINES.danger, seed),
            key: seed + 1,
          },
        });
      }
    }
    if (view.status === "done" && before.status !== "done" && view.winner) {
      const loser = view.winner === BLACK ? WHITE : BLACK;
      setSay({
        [view.winner]: {
          text: pickOmokLine(PLAYER_LINES.win, seed),
          key: seed,
        },
        [loser]: { text: pickOmokLine(PLAYER_LINES.lose, seed), key: seed + 1 },
      });
      resultSound(view.me ? view.winner === view.me : true);
    }
    if (view.status === "playing" && before.status === "waiting") {
      setSay({
        [BLACK]: { text: pickOmokLine(PLAYER_LINES.start, seed), key: seed },
        [WHITE]: {
          text: pickOmokLine(PLAYER_LINES.start, seed + 1),
          key: seed + 1,
        },
      });
    }
    if (
      view.emote &&
      view.emote.at !== before.emote?.at &&
      Date.now() + offset - view.emote.at < 8000
    )
      setEmoteShown(view.emote);
    // 대국자는 「한 판 더」가 생기면 바로 다음 판으로
    if (view.nextId && view.me) router.replace(`/games/omok/${view.nextId}`);
  }, [view, offset, router]);

  // 이모티콘은 3초만
  useEffect(() => {
    if (!emoteShown) return;
    const t = window.setTimeout(() => setEmoteShown(null), 3000);
    return () => window.clearTimeout(t);
  }, [emoteShown]);

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
        // 판이 바뀐 거면 새로 받아 옴
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

  function pick(p: number) {
    if (!myTurn || busy) return;
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

  // 위 = 상대(관전은 백), 아래 = 나(관전은 흑)
  const bottom: Stone = view.me || BLACK;
  const top: Stone = bottom === BLACK ? WHITE : BLACK;
  const info = (c: Stone) => (c === BLACK ? view.black : view.white);
  const result = (c: Stone) =>
    view.status === "done" && view.winner
      ? view.winner === c
        ? "win"
        : "lose"
      : null;
  const card = (c: Stone) => {
    const p = info(c);
    return (
      <OmokPlayer
        name={p?.nickname ?? "기다리는 중…"}
        yokai={p?.yokai ?? null}
        color={c as 1 | 2}
        active={playing && turn === c}
        label={view.me === c ? "나" : view.me ? "상대" : undefined}
        bubble={
          say[c]?.text ??
          (playing && turn === c && view.me === c ? "내 차례!" : null)
        }
        bubbleKey={`${say[c]?.key ?? 0}-${emoteShown?.at ?? 0}`}
        secondsLeft={playing && turn === c ? secondsLeft : null}
        totalSeconds={TURN_SECONDS}
        result={result(c)}
        emote={emoteShown?.by === c ? emoteShown.e : null}
      />
    );
  };

  /* ── 상대 기다리는 중 ── */
  if (view.status === "waiting") {
    return (
      <div data-omok-waiting className="grid gap-3">
        <div className="lounge-card grid gap-3 rounded-[1.35rem] p-4 text-center">
          <p className="text-3xl" aria-hidden>
            🏮
          </p>
          <h2 className="text-lg font-black text-[#f3d9a4]">
            {view.host?.nickname ?? "방장"}님의 오목 대국
          </h2>
          {view.isHost ? (
            <>
              <p className="text-sm text-[#d1c7b5]">
                친구에게 이 링크를 보내 주세요. 친구가 들어오면 바로
                시작해요(흑백은 무작위).
              </p>
              <p
                data-omok-link
                className="rounded-xl border border-[#c9a25c]/40 bg-black/40 px-3 py-2 text-sm font-bold break-all text-[#f3d9a4] select-all"
              >
                {shareUrl}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-omok-share
                  onClick={async () => {
                    const text = `${view.host?.nickname ?? ""}님이 POKA 요괴 오목 한 판 하재요! 🏮`;
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
                  className="min-h-11 rounded-xl bg-[#FEE500] px-3 text-sm font-black text-black"
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
                  className="min-h-11 rounded-xl border border-[#c9a25c]/60 px-3 text-sm font-black text-[#f3d9a4]"
                >
                  📋 링크 복사
                </button>
              </div>
              {copied ? (
                <p className="text-sm font-bold text-emerald-300">
                  복사했어요!
                </p>
              ) : null}
              <p className="animate-pulse text-sm text-zinc-400">
                친구를 기다리는 중…
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void act("cancel")}
                className="mx-auto min-h-10 rounded-lg border border-white/20 px-3 text-xs text-zinc-300"
              >
                방 닫기
              </button>
            </>
          ) : loggedIn ? (
            <>
              <p className="text-sm text-[#d1c7b5]">
                흑백은 무작위예요. 흑이 먼저 두고, 흑은 삼삼에 둘 수 없어요. 한
                수에 {TURN_SECONDS}초.
              </p>
              <button
                type="button"
                data-omok-join
                disabled={busy}
                onClick={() => void act("join")}
                className="mx-auto min-h-12 rounded-xl bg-[#7a1c22] px-6 text-base font-black text-[#f6efe2]"
              >
                ⚔️ 대국 참가하기
              </button>
            </>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(`/games/omok/${view.id}`)}`}
              className="mx-auto inline-flex min-h-12 items-center rounded-xl bg-[#7a1c22] px-6 text-base font-black text-[#f6efe2]"
            >
              로그인하고 참가하기
            </Link>
          )}
          {note ? (
            <p className="text-sm font-bold text-rose-300">{note}</p>
          ) : null}
        </div>
      </div>
    );
  }

  /* ── 대국 · 끝난 판 ── */
  const winnerName = view.winner ? info(view.winner)?.nickname : null;
  return (
    <div data-omok-room={view.status} className="grid gap-2">
      {view.me === 0 ? (
        <p
          data-omok-spectate
          className="text-center text-xs font-bold text-sky-300"
        >
          👀 관전 중 · 1초마다 자동으로 새로 고쳐져요
        </p>
      ) : null}
      {card(top)}
      <OmokBoard
        moves={view.moves}
        forbidden={forbidden}
        line={view.line}
        preview={preview}
        previewColor={view.me === WHITE ? 2 : 1}
        onPick={pick}
        disabled={!myTurn || busy}
        showNumbers={numbers}
      />
      {card(bottom)}

      <p
        role="status"
        className={cn(
          "min-h-5 text-center text-sm font-bold",
          note?.includes("삼삼") ? "text-rose-300" : "text-[#e7c98a]",
        )}
      >
        {view.status === "done"
          ? view.winner
            ? `${view.me ? (view.winner === view.me ? "🏆 승리!" : "패배…") : `🏆 ${winnerName}님 승리`} · ${END_TEXT[view.endReason] ?? ""}`
            : (END_TEXT[view.endReason] ?? "끝났어요")
          : (note ??
            (myTurn
              ? "내 차례예요"
              : view.me
                ? "상대 차례예요"
                : `${turn === BLACK ? "흑" : "백"} 차례`))}
      </p>

      {/* 대국자: 이모티콘 */}
      {view.me && playing ? (
        <div className="flex justify-center gap-1" aria-label="이모티콘 보내기">
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
              className="grid size-10 place-items-center rounded-full border border-white/15 bg-black/30 text-lg disabled:opacity-40"
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {view.me && playing ? (
          confirmResign ? (
            <>
              <button
                type="button"
                data-omok-resign-yes
                disabled={busy}
                onClick={() => void act("resign")}
                className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-black text-white"
              >
                정말 기권하기
              </button>
              <button
                type="button"
                onClick={() => setConfirmResign(false)}
                className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-zinc-200"
              >
                계속 두기
              </button>
            </>
          ) : (
            <button
              type="button"
              data-omok-resign
              onClick={() => setConfirmResign(true)}
              className="min-h-11 rounded-xl border border-rose-400/40 px-4 text-sm font-bold text-rose-200"
            >
              🏳 기권
            </button>
          )
        ) : null}
        {view.status === "done" ? (
          <>
            {view.me && view.endReason !== "cancel" ? (
              <button
                type="button"
                data-omok-rematch
                disabled={busy}
                onClick={() => void act("rematch")}
                className="min-h-11 rounded-xl bg-[#7a1c22] px-4 text-sm font-black text-[#f6efe2]"
              >
                🔁 흑백 바꿔 한 판 더
              </button>
            ) : null}
            {!view.me && view.nextId ? (
              <Link
                href={`/games/omok/${view.nextId}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#7a1c22] px-4 text-sm font-black text-[#f6efe2]"
              >
                👀 다음 판 관전
              </Link>
            ) : null}
            {view.moves.length ? (
              <button
                type="button"
                aria-pressed={numbers}
                onClick={() => setNumbers(!numbers)}
                className="min-h-11 rounded-xl border border-white/20 px-4 text-sm font-bold text-zinc-200"
              >
                {numbers ? "수 번호 끄기" : "🔢 수 순서 보기"}
              </button>
            ) : null}
            <Link
              href="/games/omok"
              className="inline-flex min-h-11 items-center rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-black text-[#f3d9a4]"
            >
              로비로
            </Link>
          </>
        ) : null}
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
      {view.status === "done" && note ? (
        <p className="text-center text-sm font-bold text-rose-300">{note}</p>
      ) : null}
    </div>
  );
}
