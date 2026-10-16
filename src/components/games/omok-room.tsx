"use client";

import { LagReportButton } from "@/components/games/lag-report";

import { FullscreenButton, FullscreenPrompt } from "@/components/games/game-fullscreen";

import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { OmokBoard } from "@/components/games/omok-board";
import {
  ArcadeBanner,
  BigWinCutIn,
  SpectatorBar,
  EmoteArt,
  OmokHud,
  QuickChip,
  Spectators,
  YokaiCutIn,
  type CutInData,
  type HudSeat,
} from "@/components/games/omok-hud";
import {
  BLACK,
  TURN_SECONDS,
  UNDO_LIMIT,
  WHITE,
  boardFrom,
  colorOfMove,
  forbiddenCells,
  winTip,
  type Stone,
} from "@/lib/omok";
import type { YokaiSpecies } from "@/lib/yokai";
import { ONI_EMOTES, QUICK_TEXTS } from "@/lib/omok-emotes";
import { LOSE_REWARD, WIN_REWARD as DEFAULT_REWARD } from "@/lib/game-config";
import type { WinReward } from "@/lib/game-reward";
import { PLAYER_LINES, pickOmokLine, yokaiVoice } from "@/lib/omok-lines";
import {
  bellSound,
  cheerSound,
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

/** 판 위 이모티콘 하나(L/R = 대국자 쪽 · S = 관전자 응원) */
type Pop = { key: string; who: string; e: string; from: "L" | "R" | "S"; seen: number };
const POP_MS = 2600;
import type { Watcher } from "@/lib/game-watch";

const END_TEXT: Record<string, string> = {
  five: "5목 완성!",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
  "draw-agree": "합의 무승부",
  leave: "퇴장 · 접속 끊김 기권패",
  cancel: "방이 닫혔어요",
};

/** 「3승 1패」(기권도 패) · 무승부가 있으면 「1무」 */
export function recordText(r: OmokRecord | null | undefined) {
  if (!r) return null;
  return `${r.wins}승 ${r.losses}패${r.draws ? ` ${r.draws}무` : ""}`;
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
  reward,
}: {
  initial: OmokView;
  loggedIn: boolean;
  hasYokai: boolean;
  shareUrl: string;
  /** 승리 보상(관리자 조정값) */
  reward?: WinReward;
}) {
  const router = useRouter();
  const WIN_REWARD = reward ?? DEFAULT_REWARD;
  const [view, setView] = useState(initial);
  const [records, setRecords] = useState(initial.records ?? null);
  const [offset, setOffset] = useState(() => initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  // 이 방에 들어온 시각(혼자 오래 기다리면 AI 연습 권하기)
  const [enteredAt] = useState(() => Date.now());
  const [preview, setPreview] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmKick, setConfirmKick] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
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
  // 판 위 이모티콘 · 응원: 서버 시각이 아니라 처음 받은 순간부터 2.6초(폴링이 늦어도 꼭 보이게)
  const [pops, setPops] = useState<Pop[]>([]);
  const seenPops = useRef(new Set<string>());
  const [showResult, setShowResult] = useState(initial.status === "done");
  // 끝난 판: 상대가 방을 나갔는지(서버가 1초마다 알려 줌)
  const [rivalAway, setRivalAway] = useState(false);
  // 결과 화면에서 떠나면(로비 · 다른 메뉴 · 창 닫기) 상대에게 바로 「나갔어요」가 보이게
  const exitOnLeave = useRef(false);
  const [jump, setJump] = useState<Record<number, number>>({});
  const [watching, setWatching] = useState({
    count: initial.watchers ?? 0,
    names: initial.watcherNames ?? [],
    list: initial.watcherList ?? [],
  });
  const [watchKey] = useState(() =>
    Math.random().toString(36).slice(2, 14).padEnd(10, "0"),
  );
  const versionRef = useRef(initial.version);
  // 내 수를 먼저 놓았다가 서버가 거절해 되돌릴 때(「물렀어요」 안내를 띄우지 않게)
  const rollbackRef = useRef(false);
  // 상대 차례(내가 앉아 있음)에는 더 자주 확인해 상대 수가 바로 보이게
  const fastPollRef = useRef(false);
  const seatedRef = useRef(Boolean(initial.me || initial.seat));
  // 판 상태(끝난 판은 천천히 확인 — 서버 사용량 줄이기)
  const statusRef = useRef(initial.status);
  const prev = useRef(initial);
  const lastBeep = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  function receive(next: OmokView) {
    // 늦게 도착한 옛 상태(1초 확인 · 버튼 응답이 엇갈림)가 새 판을 덮으면 돌 소리 · 연출이 두 번 나므로 버림
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    seatedRef.current = Boolean(next.me || next.seat);
    statusRef.current = next.status;
    if (next.watchers !== undefined)
      setWatching({
        count: next.watchers,
        names: next.watcherNames ?? [],
        list: next.watcherList ?? [],
      });
    if (next.records) setRecords(next.records);
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(화면을 안 보면 5초) 바뀐 것만 · 관전자는 4번에 1번 「보고 있어요」
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tick = 0;
    let inFlight = false;
    const loop = async () => {
      // 돌아올 때(wake)와 겹쳐 두 번 돌지 않게
      if (inFlight) return;
      inFlight = true;
      tick += 1;
      // 4번에 1번 「보고 있어요」(관전자 = 관전자 수 · 대국자 = 자리 지킴, 오래 안 보이면 방 정리)
      const watch =
        seatedRef.current || tick % 2 === 1 ? `&w=${watchKey}` : "";
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
            watcherList?: Watcher[];
            away?: boolean;
          };
          if (alive && typeof json.away === "boolean") setRivalAway(json.away);
          if (alive && !json.same && json.view) receive(json.view);
          if (alive && json.same && json.watchers !== undefined)
            setWatching({
              count: json.watchers,
              names: json.watcherNames ?? [],
              list: json.watcherList ?? [],
            });
        }
      } catch {
        /* 다음에 다시 */
      }
      inFlight = false;
      if (!alive) return;
      // 서버 사용량 줄이기: 상대 차례 0.8초 · 내 차례 2초 · 관전 2.5초 · 끝난 판 3초(대국자 다시하기) / 10초(관전)
      // 다른 탭을 보면: 대국자 15초(자리 지킴만) · 관전자는 멈췄다가 돌아오면 바로
      const seated = seatedRef.current;
      if (document.hidden && !seated) {
        return;
      }
      const done = statusRef.current === "done";
      const wait = document.hidden ? 15_000 : done ? (seated ? 3000 : 10_000) : fastPollRef.current ? 800 : seated ? 2000 : 2500;
      timer = window.setTimeout(loop, wait);
    };
    const wake = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      void loop();
    };
    document.addEventListener("visibilitychange", wake);
    timer = window.setTimeout(loop, 700);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
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
        // 다른 창(요괴 AI 연습)에 「상대가 왔어요」 알리기
        try {
          const ch = new BroadcastChannel("poka-omok");
          ch.postMessage({ type: "guest", room: view.id, name: view.guest.nickname });
          ch.close();
        } catch {
          /* 지원 안 하는 브라우저 */
        }
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
      setBanner({ text: "준비", sub: "흑이 먼저 둬요", key: seed });
      window.setTimeout(() => {
        fightSound();
        setBanner({ text: "시작!", tone: "red", key: seed + 1 });
      }, 1000);
      setSay({
        [BLACK]: { text: pickOmokLine(PLAYER_LINES.start, seed), key: seed },
        [WHITE]: {
          text: pickOmokLine(PLAYER_LINES.start, seed + 1),
          key: seed + 1,
        },
      });
    }
    // 돌: 소리 · 둔 사람 요괴 점프(4목이어도 아무 말 안 함 — 게임에 영향 없게)
    if (view.moves.length > before.moves.length) {
      stoneClick();
      setPreview(null);
      const by = colorOfMove(view.moves.length - 1);
      setJump((j) => ({ ...j, [by]: seed }));
    }
    // 관전자 응원이 새로 오면 퐁
    const lastCheer = view.cheers?.[view.cheers.length - 1];
    if (
      lastCheer &&
      lastCheer.at !== before.cheers?.[before.cheers.length - 1]?.at
    )
      cheerSound();
    if (rollbackRef.current) {
      rollbackRef.current = false;
    } else if (view.moves.length < before.moves.length && view.status === "playing") {
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
            tip: yokaiVoice(yokaiOf(view.winner)?.species, t.tip),
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
    // 이모티콘: 대기실은 요괴와 함께 크게(판에 돌이 없음) · 대국 중에는 판 위 보낸 사람 쪽에 크게(아래)
    if (
      view.emote &&
      view.emote.at !== before.emote?.at &&
      Date.now() + offset - view.emote.at < 8000
    ) {
      const by = view.emote.by;
      if (view.status !== "playing") {
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
    // 판 위 이모티콘: 대국자 = 자기 명판 쪽 위 · 관전자 응원 = 위쪽 가운데(이름과 함께)
    {
      const t = Date.now();
      const fresh: Pop[] = [];
      const add = (key: string, who: string, e: string, from: Pop["from"], at: number) => {
        if (seenPops.current.has(key)) return;
        seenPops.current.add(key);
        if (t + offset - at < 10000) fresh.push({ key, who, e, from, seen: t });
      };
      if (view.emote && view.status === "playing") {
        const by = view.emote.by;
        add(`e${view.emote.at}`, (by === BLACK ? view.black : view.white)?.nickname ?? "", view.emote.e, by === lc ? "L" : "R", view.emote.at);
      }
      for (const c of view.cheers ?? []) add(`c${c.n}${c.at}`, c.n, c.e, "S", c.at);
      if (fresh.length) setPops((old) => [...old.filter((p) => t - p.seen < POP_MS), ...fresh].slice(-6));
    }
  }, [view, offset, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    exitOnLeave.current = view.status === "done" && Boolean(view.me) && !view.nextId;
  }, [view.status, view.me, view.nextId]);
  useEffect(() => {
    const send = () => {
      if (!exitOnLeave.current) return;
      exitOnLeave.current = false;
      void fetch(`/api/games/omok/${initial.id}`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exit" }),
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [initial.id]);

  // 다음 판이 열리면(한 판 더 · 도전 줄 자동 교대) 잠깐 결과를 보여 준 뒤 모두 다음 판으로 — 진 사람 · 관전자는 관전석
  const nextAt = useRef<number | null>(null);
  useEffect(() => {
    if (!view.nextId || view.status !== "done") return;
    if (nextAt.current === null) nextAt.current = Date.now();
    const wait = Math.max(0, nextAt.current + (view.me ? 1200 : 5000) - Date.now());
    const t = window.setTimeout(() => router.replace(`/games/omok/${view.nextId}`), wait);
    return () => window.clearTimeout(t);
  }, [view.nextId, view.status, view.me, router]);

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
    if (!pops.length) return;
    const t = window.setTimeout(() => setPops((o) => o.filter((p) => Date.now() - p.seen < POP_MS)), POP_MS + 100);
    return () => window.clearTimeout(t);
  }, [pops]);
  useEffect(() => {
    if (!Object.keys(say).length) return;
    const t = window.setTimeout(() => setSay({}), 4000);
    return () => window.clearTimeout(t);
  }, [say]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setNote(null);
    // 착수는 먼저 판에 놓아 두므로, 실패하면 서버 판(못 받으면 놓기 전 판)으로 되돌림
    const snapshot = view;
    const rollback = async () => {
      if (action !== "move") return;
      rollbackRef.current = true;
      const fresh = await fetch(`/api/games/omok/${view.id}`, { cache: "no-store" })
        .then((res) => res.json() as Promise<{ view?: OmokView }>)
        .catch(() => ({}) as { view?: OmokView });
      if (fresh.view) receive(fresh.view);
      else setView(snapshot);
    };
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
      // 다음 판 도전 · 한 판 더를 누른 사람은 바로 그 대기실로(상대는 몇 초 뒤 따라옴)
      if (res.ok && (action === "challenge" || action === "rematch") && json.view?.nextId)
        router.push(`/games/omok/${json.view.nextId}`);
      if (!res.ok) {
        setNote(json.error ?? "처리하지 못했어요.");
        if (action === "move") await rollback();
        else if (res.status === 409) {
          const fresh = await fetch(`/api/games/omok/${view.id}`, {
            cache: "no-store",
          }).then((r) => r.json() as Promise<{ view?: OmokView }>);
          if (fresh.view) receive(fresh.view);
        }
      }
    } catch {
      setNote("연결이 끊겼어요. 잠시 뒤 다시 해 주세요.");
      await rollback();
    } finally {
      setBusy(false);
    }
  }

  /** 내 수: AI 연습처럼 누르는 즉시 판에 놓고(소리 · 낙하 · 충격 · 요괴 점프) 서버에 보냄 */
  function moveNow(p: number) {
    setPreview(null);
    setView((v) => (v.moves.includes(p) ? v : { ...v, moves: [...v.moves, p] }));
    void act("move", { p });
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
  const fastPoll = playing && view.me !== 0 && !myTurn;
  useEffect(() => {
    fastPollRef.current = fastPoll;
  }, [fastPoll]);
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
  // 두 자리가 찬 방에 들어온 사람은 자동으로 도전 줄(스스로 빠지면 다시 안 세움)
  const autoQueued = useRef(false);
  const canAutoQueue =
    spectator &&
    loggedIn &&
    hasYokai &&
    !view.queueMine &&
    !view.nextId &&
    view.endReason !== "cancel" &&
    (view.status !== "waiting" || Boolean(view.guest));
  useEffect(() => {
    if (!canAutoQueue || autoQueued.current) return;
    try {
      if (window.sessionStorage.getItem(`omok-q-out:${view.id}`)) return;
    } catch {
      /* 저장소를 못 쓰면 그냥 진행 */
    }
    // 서버에 줄 서기 요청(응답이 오면 화면 갱신)
    const t = window.setTimeout(() => {
      autoQueued.current = true;
      void act("queue-join");
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 방마다 한 번만
  }, [canAutoQueue, view.id]);
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
      setNote("같은 곳을 한 번 더 누르거나 「착수」 버튼을 눌러요");
      return;
    }
    moveNow(p);
  }

  /** 휴대폰 돋보기로 맞추고 손을 떼면 바로 착수 */
  function placeNow(p: number) {
    if (!myTurn || busy || theyAsked) return;
    if (boardFrom(view.moves)[p] !== 0) return;
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
    moveNow(p);
  }

  /* ── HUD 자리 ── */
  const info = (c: Stone) => (c === BLACK ? view.black : view.white);
  const recOf = (c: Stone) =>
    recordText(c === BLACK ? records?.black : records?.white);
  const rightColor: Stone = leftColor === BLACK ? WHITE : BLACK;
  const h2h =
    records?.h2h && records.h2h.a + records.h2h.b + records.h2h.draws > 0
      ? records.h2h
      : null;
  /** 흑(대기실은 방장) 쪽이면 a 기준, 백(손님) 쪽이면 b 기준 */
  const vsText = (sideA: boolean) =>
    h2h
      ? `상대 ${sideA ? h2h.a : h2h.b}승 ${sideA ? h2h.b : h2h.a}패${h2h.draws ? ` ${h2h.draws}무` : ""}`
      : null;
  const seatOf = (c: Stone): HudSeat => {
    const p = info(c);
    return {
      name: p?.nickname ?? "",
      yokai: p?.yokai ?? null,
      color: c as 1 | 2,
      tag: view.me === c ? "나" : view.me ? "상대" : c === BLACK ? "흑" : "백",
      record: recOf(c),
      vs: vsText(c === BLACK),
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
      // 접속이 끊기거나 나가서 진 자리: 「퇴장함」
      gone:
        view.status === "done" &&
        view.endReason === "leave" &&
        Boolean(view.winner) &&
        view.winner !== c,
    };
  };
  // 대기실: 흑 자리 = 방장 · 백 자리 = 손님(내가 손님이면 내 자리를 왼쪽에)
  const hostSeat: HudSeat = {
    name: view.host?.nickname ?? "방장",
    yokai: view.host?.yokai ?? null,
    color: 0,
    tag: view.seat === "host" ? "나" : "방장",
    record: recordText(records?.black),
    vs: view.guest ? vsText(true) : null,
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
        vs: vsText(false),
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
        ? "닫힌 방"
        : !view.winner
          ? "무승부"
          : view.me
            ? view.winner === view.me
              ? "승리!"
              : "패배"
            : "승부 끝!";
  const winnerInfo = view.winner ? info(view.winner) : null;
  const inviteText = `${view.host?.nickname ?? ""}님이 POKA 요괴 오목 한 판 하재요! 🏮\n방 코드: ${code}`;

  /** 오니 이모티콘 버튼(대국자 = emote · 관전자 = cheer) */
  const stickerRow = (action: "emote" | "cheer") => (
    <div
      className="grid gap-2.5"
      aria-label={action === "emote" ? "이모티콘 보내기" : "응원 보내기"}
    >
      <div className="grid grid-cols-5 gap-1.5 sm:max-lg:grid-cols-9">
      {ONI_EMOTES.map((em) => (
        <button
          key={em.key}
          type="button"
          data-omok-emote={action === "emote" ? em.key : undefined}
          data-omok-cheer-btn={action === "cheer" ? em.key : undefined}
          disabled={emoteWait > now}
          onClick={() => {
            setEmoteWait(Date.now() + (action === "emote" ? 3000 : 2500));
            void act(action, { e: em.key });
          }}
          aria-label={em.label}
          className="arcade-btn btn-dark grid aspect-square w-full !min-h-0 place-items-center p-0.5"
        >
          <EmoteArt e={em.key} className="size-full" />
        </button>
      ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:max-lg:grid-cols-5">
      {QUICK_TEXTS.map((q) => (
        <button
          key={q.key}
          type="button"
          data-omok-quick={q.key}
          disabled={emoteWait > now}
          onClick={() => {
            setEmoteWait(Date.now() + (action === "emote" ? 3000 : 2500));
            void act(action, { e: q.key });
          }}
          aria-label={q.label}
          className="grid min-h-11 place-items-stretch transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <QuickChip k={q.key} className="w-full" />
        </button>
      ))}
      </div>
    </div>
  );
  // 관전자: 다음 판 도전 줄 서기 / 빠지기(판 아래 조작 줄)
  const queueBtn =
    spectator && loggedIn && !waiting && !view.nextId ? (
              view.queueMine ? (
                <button
                  type="button"
                  data-omok-queue-leave
                  disabled={busy}
                  onClick={() => {
                    try {
                      window.sessionStorage.setItem(`omok-q-out:${view.id}`, "1");
                    } catch {
                      /* 이번만 */
                    }
                    void act("queue-leave");
                  }}
                  className="arcade-btn btn-dark text-sm"
                >
                  줄에서 빠지기 ({view.queueMine}번)
                </button>
              ) : (
                <button
                  type="button"
                  data-omok-queue-join
                  disabled={busy}
                  onClick={() => {
                    try {
                      window.sessionStorage.removeItem(`omok-q-out:${view.id}`);
                    } catch {
                      /* 이번만 */
                    }
                    void act("queue-join");
                  }}
                  className="arcade-btn btn-gold text-sm"
                >
                  🙋 도전 줄 서기
                </button>
              )
    ) : null;
  // 이모티콘 패널(오른쪽): 대국자 · 앉은 사람 = 이모티콘 · 관전자 = 응원
  const emoteAction: "emote" | "cheer" | null =
    (view.me && playing) || seated
      ? "emote"
      : spectator && view.status !== "done"
        ? "cheer"
        : null;

  return (
    <div
      data-omok-room={view.status}
      data-game-land
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"
    >
      <FullscreenPrompt />
      {/* ── 왼쪽(휴대폰은 위): HUD · 판 · 조작 ── */}
      <div className="omok-left relative grid gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <FullscreenButton />
          <LagReportButton game="omok" />
          {(() => {
            // 나가기: 대국 중 = 기권 · 방장 대기실 = 방 닫기 · 손님 = 일어나기 · 그 밖 = 로비로
            const risky =
              (playing && Boolean(view.me)) || (waiting && Boolean(view.seat));
            const label =
              playing && view.me
                ? "🚪 나가기(기권패)"
                : waiting && view.seat === "host"
                  ? "🚪 나가기(방 닫기)"
                  : waiting && view.seat === "guest"
                    ? "🚪 나가기"
                    : "🏠 로비로";
            return confirmExit ? (
              <span className="flex gap-1.5">
                <button
                  type="button"
                  data-omok-exit-yes
                  disabled={busy}
                  onClick={async () => {
                    await act("exit");
                    router.push("/games/omok");
                  }}
                  className="arcade-btn btn-main !min-h-10 px-3 text-sm"
                >
                  정말 나가기
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmExit(false)}
                  className="arcade-btn btn-dark !min-h-10 px-3 text-sm"
                >
                  취소
                </button>
              </span>
            ) : (
              <button
                type="button"
                data-omok-exit
                onClick={() =>
                  risky ? setConfirmExit(true) : router.push("/games/omok")
                }
                className="arcade-btn btn-dark !min-h-10 px-3 text-sm"
              >
                {label}
              </button>
            );
          })()}
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
          {view.isPrivate ? (
            <span className="g-chip !border-[#b77bff]/70 !text-[#e7c4ff]">
              🔒 비공개 방
            </span>
          ) : null}
        </div>

        <h1
          data-omok-title
          className="flex items-center justify-center gap-2 truncate rounded-2xl border-2 border-[#ffcf4a]/60 bg-[#1a0f2e] px-3 py-2 text-center text-lg font-black text-[#ffe08a]"
        >
          🏮 <span className="truncate">{view.title}</span>
        </h1>
        <OmokHud left={hud.left} right={hud.right} />

        {/* 관전석 줄: 관전자 · 응원(판 바로 위, 판은 안 가림) */}
        <SpectatorBar
          count={watching.count}
          list={watching.list}
          cheers={pops.filter((p) => p.from === "S").map((p) => ({ n: p.who, e: p.e, at: p.seen }))}
          now={now}
          ttl={POP_MS}
          me={spectator && watching.count > 0}
        />

        <div data-land-snap className={cn("omok-board-wrap relative mt-1", theyAsked && "arcade-shake")}>
          <OmokBoard
            moves={view.moves}
            forbidden={forbidden}
            line={view.line}
            preview={preview}
            previewColor={view.me === WHITE ? 2 : 1}
            onPick={pick}
            onTouchPlace={placeNow}
            disabled={!myTurn || busy || theyAsked}
            showNumbers={numbers}
          />

          {/* 이모티콘 · 응원: 판 위에 크게 2.6초 — 대국자는 자기 명판 쪽 위 · 관전자 응원은 위쪽 가운데 */}
          {pops.length ? (
            <div data-omok-emote-layer className="pointer-events-none absolute inset-0 z-[45]">
              {(["L", "R"] as const).map((side) => {
                const p = [...pops].reverse().find((x) => x.from === side);
                return p ? (
                  <span
                    key={p.key}
                    data-omok-emote-bubble={side}
                    className={cn(
                      "omok-emote-pop absolute top-[4%] grid justify-items-center gap-2",
                      side === "L" ? "left-[4%]" : "right-[4%]",
                    )}
                  >
                    <EmoteArt e={p.e} big className="size-24 drop-shadow-[0_4px_0_#0a0614] sm:size-32" />
                    <span className="max-w-32 truncate rounded-md border-2 border-[#0a0614] bg-[#ffcf4a] px-2 text-xs font-black text-[#2a1400] shadow-[2px_2px_0_#0a0614]">
                      {p.who}
                    </span>
                  </span>
                ) : null;
              })}
              <div className="absolute inset-x-[27%] top-[4%] flex justify-center gap-2">
                {pops
                  .filter((x) => x.from === "S")
                  .slice(-2)
                  .map((p) => (
                    <span key={p.key} data-omok-emote-bubble="S" className="omok-emote-pop grid justify-items-center gap-2">
                      <EmoteArt e={p.e} big className="size-16 drop-shadow-[0_4px_0_#0a0614] sm:size-24" />
                      <span className="max-w-28 truncate rounded-md border-2 border-[#0a0614] bg-[#6ad7ff] px-2 text-[11px] font-black text-[#04263a] shadow-[2px_2px_0_#0a0614]">
                        📣 {p.who}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          {/* 대기실: 판 위에 방 코드 */}
          {waiting ? (
            <div
              data-omok-waiting
              className="arcade-overlay absolute inset-0 z-20 grid justify-items-center overflow-y-auto overscroll-contain rounded-[14px] p-4 text-center [align-items:safe_center]"
            >
              <div className="grid justify-items-center gap-2">
                {/* 착석 · READY 버튼(판 한가운데 · 가장 잘 보이게) */}
                <div className="grid w-full min-w-[240px] gap-2">
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
                        ? "친구가 앉으면 준비!"
                        : myReady
                          ? "READY 취소"
                          : "✅ 준비!"}
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
                </div>
                <p className="arcade-px neon-gold text-xs sm:text-sm">
                  방 코드
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
                    상대를 기다리는 중…
                  </p>
                ) : null}
                {!view.guest && view.isHost && now - enteredAt > 60_000 ? (
                  <a
                    href="/games/omok/ai"
                    target="_blank"
                    rel="noopener"
                    data-omok-wait-ai
                    className="arcade-btn btn-dark mt-1 grid !min-h-10 place-items-center px-3 text-sm"
                  >
                    🤖 기다리는 동안 요괴 AI랑 연습(새 창)
                    <span className="block text-[11px] font-bold text-[#d6cdee]">이 방은 열어 둔 채로 · 상대가 오면 소리로 알려요</span>
                  </a>
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
              <p className="arcade-px neon-cyan text-sm">물리기?</p>
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
              <p className="arcade-px neon-gold text-sm">무승부?</p>
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
              className="arcade-overlay absolute inset-0 z-20 grid justify-items-center overflow-y-auto overscroll-contain rounded-[14px] p-4 text-center [align-items:safe_center]"
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
                    resultTitle === "패배"
                      ? "neon-red"
                      : resultTitle === "무승부" || resultTitle === "닫힌 방"
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
                {view.me &&
                view.winner === view.me &&
                view.moves.length >= 9 ? (
                  <p
                    data-omok-win-reward
                    className="rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a] max-sm:order-1 max-sm:py-1 max-sm:text-xs"
                  >
                    🎁 승리 보상 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} ·
                    요괴 친밀도 +{WIN_REWARD.affection}
                    <span className="block text-xs font-bold text-[#d6cdee]">
                      하루 {WIN_REWARD.perDay}판 · 같은 상대{" "}
                      {WIN_REWARD.perOpponentPerDay}판까지
                    </span>
                  </p>
                ) : null}
                {view.moves.length && view.endReason !== "cancel" ? (
                  <div data-omok-summary className="flex flex-wrap items-center justify-center gap-x-3 rounded-xl bg-black/35 px-3 py-1.5 text-xs font-bold text-white max-sm:order-1">
                    <span>📊 {view.moves.length}수</span>
                    {view.durationSec ? (
                      <span>
                        ⏱ {Math.floor(view.durationSec / 60)}분 {view.durationSec % 60}초
                      </span>
                    ) : null}
                    <span>
                      ↩ 물리기 흑 {UNDO_LIMIT - view.undo.left[1]} · 백 {UNDO_LIMIT - view.undo.left[2]}
                    </span>
                    <button
                      type="button"
                      data-omok-share
                      onClick={() => {
                        const sec = view.durationSec ?? 0;
                        const text = [
                          `⚫⚪ POKA 요괴 오목 — ${view.black?.nickname ?? "흑"} vs ${view.white?.nickname ?? "백"}`,
                          winnerInfo ? `🏆 ${winnerInfo.nickname} 승리! (${END_TEXT[view.endReason] ?? ""})` : "🤝 무승부",
                          `📊 ${view.moves.length}수${sec ? ` · ⏱ ${Math.floor(sec / 60)}분 ${sec % 60}초` : ""}`,
                          "같이 두기 👉 https://pokerwiki.co.kr/games/omok?from=game-share",
                        ].join("\n");
                        void fetch("/api/games/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game: "omok" }) }).catch(() => undefined);
                        if (navigator.share) void navigator.share({ text }).catch(() => undefined);
                        else
                          void navigator.clipboard
                            ?.writeText(text)
                            .then(() => setNote("결과를 복사했어요. 오픈채팅에 붙여 넣어 보세요!"))
                            .catch(() => setNote("복사하지 못했어요."));
                      }}
                      className="rounded-lg bg-white/15 px-2 py-1 text-[11px] font-black text-white hover:bg-white/25"
                    >
                      📤 공유
                    </button>
                  </div>
                ) : null}
                {view.me && view.moves.length >= 9 && view.endReason !== "cancel" ? (
                  <p
                    data-omok-rank-delta
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-sm font-black max-sm:order-1 max-sm:py-1 max-sm:text-xs",
                      view.winner === view.me ? "bg-emerald-400/15 text-emerald-200" : view.winner ? "bg-rose-400/15 text-rose-200" : "bg-white/10 text-white",
                    )}
                  >
                    {view.winner === view.me
                      ? "📈 이번 달 랭킹 +3점"
                      : view.winner
                        ? `📉 이번 달 랭킹 -1점 · 위로 EXP +${LOSE_REWARD.exp}`
                        : "🤝 이번 달 랭킹 +1점"}
                    <span className="block text-xs font-bold text-[#d6cdee]">
                      승 +3 · 무 +1 · 패 -1 — 많이 둘수록 유리해요
                    </span>
                  </p>
                ) : null}
                <div className="mt-1 grid w-full max-w-xs gap-2">
                  {view.me && view.endReason !== "cancel" && !view.nextId && rivalAway ? (
                    <p
                      data-omok-rival-away
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-[#ffb4b4]"
                    >
                      👋 상대가 방을 나갔어요 · 로비에서 새 상대를 찾아 보세요
                    </p>
                  ) : view.me && view.endReason !== "cancel" && !view.nextId && view.rematch && !view.rematch.mine && !view.rematch.declined ? (
                    <div data-omok-rematch-ask className="grid gap-2 rounded-xl bg-[#ffcf4a]/15 p-2.5">
                      <p className="text-sm font-black text-[#ffcf4a]">🔁 {view.rematch.name}님이 한 판 더 원해요!</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" data-omok-rematch-no disabled={busy} onClick={() => void act("rematch-no")} className="arcade-btn btn-dark">
                          거절
                        </button>
                        <button type="button" data-omok-rematch-yes disabled={busy} onClick={() => void act("rematch")} className="arcade-btn btn-main">
                          수락
                        </button>
                      </div>
                    </div>
                  ) : view.me && view.endReason !== "cancel" && !view.nextId && view.rematch?.mine && !view.rematch.declined ? (
                    <p data-omok-rematch-wait className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-[#d6cdee]">
                      ⏳ 한 판 더 신청했어요 · 상대가 수락하면 바로 시작해요
                    </p>
                  ) : view.me && view.endReason !== "cancel" && !view.nextId ? (
                    <>
                      {view.rematch?.mine && view.rematch.declined ? (
                        <p data-omok-rematch-declined className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-[#ffb4b4]">
                          🙅 상대가 이번엔 한 판 더를 거절했어요
                        </p>
                      ) : null}
                      <button
                        type="button"
                        data-omok-rematch
                        disabled={busy}
                        onClick={() => void act("rematch")}
                        className="arcade-btn btn-main"
                      >
                        🔁 한 판 더 신청(흑백 바꿈)
                      </button>
                    </>
                  ) : null}
                  {!view.me &&
                  !view.nextId &&
                  view.endReason !== "cancel" &&
                  loggedIn &&
                  !view.canChallenge &&
                  view.queue.length ? (
                    <p className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black text-[#d6cdee]">
                      ⏳ 도전 줄: {view.queue[0]}님 차례
                      {view.queueMine ? ` · 내 순서 ${view.queueMine}번` : ""}
                    </p>
                  ) : null}
                  {view.canChallenge ? (
                    <button
                      type="button"
                      data-omok-challenge
                      disabled={busy}
                      onClick={() => void act("challenge")}
                      className="arcade-btn btn-main"
                    >
                      {view.queueMine === 1
                        ? "⚔️ 내 차례! 지금 도전하기"
                        : "⚔️ 다음 판 도전(승자와 대결)"}
                    </button>
                  ) : null}
                  {view.nextId ? (
                    <Link
                      data-omok-next
                      href={`/games/omok/${view.nextId}`}
                      className="arcade-btn btn-main grid place-items-center"
                    >
                      ⏩ 곧 다음 판으로 이동해요 · 바로 가기
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

        {/* 착수 버튼: 내 차례면 늘 같은 자리(고르기 전엔 안내) · 누르면 고른 자리에 바로 */}
        {myTurn && !theyAsked ? (
          <button
            type="button"
            data-omok-place
            disabled={preview === null || busy}
            onClick={() => {
              if (preview !== null) moveNow(preview);
            }}
            className={cn("arcade-btn min-h-14 text-xl", preview !== null ? "btn-gold" : "btn-dark")}
          >
            {preview !== null ? "✅ 여기에 착수" : "👆 놓을 자리를 눌러 주세요"}
          </button>
        ) : null}

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
                    ? "▶ 내 차례! 자리를 누르고 한 번 더(또는 착수)"
                    : view.me
                      ? "상대 차례…"
                      : `${turn === BLACK ? "흑" : "백"} 차례`)}
          </p>
        ) : null}

        {/* ── 관전 조작: 도전 줄 · 수 순서 · 로비(대국자 조작 줄과 같은 자리 · 같은 모양) ── */}
        {spectator && view.status !== "done" ? (
          <div data-omok-spec-controls className={cn("grid gap-2", queueBtn ? "grid-cols-3" : "grid-cols-2")}>
            {queueBtn}
            <button
              type="button"
              aria-pressed={numbers}
              onClick={() => setNumbers(!numbers)}
              className="arcade-btn btn-dark"
            >
              {numbers ? "수 번호 끄기" : "🔢 수 순서"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/games/omok")}
              className="arcade-btn btn-dark"
            >
              🏠 로비로
            </button>
          </div>
        ) : null}

        {/* ── 대기실 조작 ── */}
        {waiting ? (
          <div className="grid gap-2">
            {note ? (
              <p className="text-center text-sm font-bold text-[#ff5d6c]">
                {note}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 자리비움(자동) 중인 대국자: 상대 · 관전자에게도 */}
        {playing && (view.auto?.[1] || view.auto?.[2]) && !(view.me && view.auto?.[view.me] && !view.auto?.[view.me === 1 ? 2 : 1]) ? (
          <p data-omok-rival-auto className="rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-black text-[#ffe08a]">
            🤖 {[view.auto?.[1] ? view.black?.nickname : null, view.auto?.[2] ? view.white?.nickname : null].filter(Boolean).join(", ")}님 자리비움 중 · 요괴 AI가 대신 둬요(10분 안에 안 돌아오면 기권패)
          </p>
        ) : null}
        {/* ── 대국 조작: 물리기 · 기권 · 이모티콘 ── */}
        {view.me && playing ? (
          <div className="grid gap-2">
            {view.me && view.auto?.[view.me] ? (
              <p data-omok-auto-note className="rounded-xl bg-[#ffcf4a]/15 px-3 py-2 text-center text-sm font-black text-[#ffe08a]">
                🤖 자리비움 중 — 요괴 AI(도깨비)가 대신 두고 있어요. 돌아오면 「자동 중 · 끄기」를 누르세요
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <button
                type="button"
                data-omok-auto={view.me && view.auto?.[view.me] ? "on" : "off"}
                aria-pressed={Boolean(view.me && view.auto?.[view.me])}
                disabled={busy}
                onClick={() => void act("auto", { on: !(view.me && view.auto?.[view.me]) })}
                className={cn("arcade-btn", view.me && view.auto?.[view.me] ? "btn-gold" : "btn-dark")}
              >
                {view.me && view.auto?.[view.me] ? "🤖 자동 중 · 끄기" : "🤖 자동(자리비움)"}
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
          {/* 다음 판 도전 줄 */}
          <div
            data-omok-queue
            className="grid gap-1.5 rounded-xl bg-black/30 p-3"
          >
            <p className="text-sm font-black text-white">
              🙋 다음 판 도전 줄{" "}
              {view.queue.length ? `(${view.queue.length}명)` : ""}
            </p>
            {view.queue.length ? (
              <ol className="grid gap-1 text-sm">
                {view.queue.map((n, i) => (
                  <li
                    key={n}
                    className={cn(
                      "flex items-center gap-2",
                      view.queueMine === i + 1 && "font-black text-[#ffcf4a]",
                    )}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-white/15 text-xs font-black">
                      {i + 1}
                    </span>
                    {n}
                    {view.queueMine === i + 1 ? " (나)" : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-[#d6cdee]">
                줄을 서면 판이 끝났을 때 순서대로 이긴 사람에게 도전할 수
                있어요.
              </p>
            )}
          </div>
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
            <div
              data-omok-h2h
              className="grid gap-1.5 rounded-xl border-2 border-[#ffcf4a]/50 bg-black/40 px-3 py-2.5"
            >
              <p className="text-center text-sm font-black text-[#ffcf4a]">
                ⚔️ 두 사람 상대 전적 · {records.h2h.a + records.h2h.b + records.h2h.draws}판
              </p>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <span className="grid min-w-0 justify-items-center">
                  <b
                    className={cn(
                      "text-4xl font-black leading-none",
                      records.h2h.a > records.h2h.b ? "text-[#ffcf4a]" : "text-white/70",
                    )}
                  >
                    {records.h2h.a}
                  </b>
                  <span className="max-w-full truncate text-sm font-black text-white">{(waiting ? view.host?.nickname : view.black?.nickname) ?? "?"}</span>
                  <span className="text-xs font-bold text-[#d6cdee]">승</span>
                </span>
                <span className="text-2xl font-black text-[#d6cdee]">:</span>
                <span className="grid min-w-0 justify-items-center">
                  <b
                    className={cn(
                      "text-4xl font-black leading-none",
                      records.h2h.b > records.h2h.a ? "text-[#ffcf4a]" : "text-white/70",
                    )}
                  >
                    {records.h2h.b}
                  </b>
                  <span className="max-w-full truncate text-sm font-black text-white">{(waiting ? view.guest?.nickname : view.white?.nickname) ?? "?"}</span>
                  <span className="text-xs font-bold text-[#d6cdee]">승</span>
                </span>
              </div>
              {records.h2h.draws ? (
                <p className="text-center text-xs font-bold text-[#d6cdee]">무승부 {records.h2h.draws}판</p>
              ) : null}
              <p className="text-center text-sm font-black text-white">
                {records.h2h.a === records.h2h.b
                  ? "팽팽해요!"
                  : `${records.h2h.a > records.h2h.b ? ((waiting ? view.host?.nickname : view.black?.nickname) ?? "?") : ((waiting ? view.guest?.nickname : view.white?.nickname) ?? "?")}님이 ${Math.abs(records.h2h.a - records.h2h.b)}판 앞서요`}
              </p>
            </div>
          ) : view.guest || !waiting ? (
            <p data-omok-h2h className="text-sm text-[#d6cdee]">
              ⚔️ 두 사람은 첫 대결이에요!
            </p>
          ) : null}
          <p className="text-xs font-black text-[#d6cdee]">각자 전체 전적</p>
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
        {emoteAction ? (
          <section
            data-omok-emote-panel={emoteAction}
            data-omok-cheer-box={emoteAction === "cheer" ? "" : undefined}
            className="arcade-panel grid gap-2.5 p-4 max-lg:order-first"
          >
            <h2 className="arcade-kr text-lg text-white">
              {emoteAction === "emote" ? "💬 이모티콘" : "📣 응원 이모티콘"}
            </h2>
            <p className="-mt-1 text-xs leading-relaxed text-[#d6cdee]">
              {emoteAction === "emote"
                ? "누르면 판 위 내 쪽에 크게 떠요"
                : "누르면 판 위쪽 가운데에 내 이름과 함께 크게 떠요 · 🎁 응원하면 하루 한 번 EXP +5"}
            </p>
            {emoteAction === "cheer" && !loggedIn ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/games/omok/${view.id}`)}`}
                className="text-center text-sm font-bold text-[#8eeaff] underline"
              >
                로그인하면 응원할 수 있어요
              </Link>
            ) : (
              stickerRow(emoteAction)
            )}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
