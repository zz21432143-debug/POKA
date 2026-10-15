"use client";

import { nowMs } from "@/lib/dates";
/** 게이지 없이 던질 때 세기(60~89) — 렌더 밖에서만 부름 */
const randomPower = () => 60 + Math.floor(Math.random() * 30);
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { EmoteArt, QuickChip, SpectatorBar } from "@/components/games/omok-hud";
import {
  NameTag,
  SHORTCUT_NODES,
  TEAM_COLOR,
  TEAM_NAME,
  YokaiToken,
  YutBoard,
  pieceFace,
  pieceName,
  yutName,
  type YutBurst,
  type YutKnock,
} from "@/components/games/yut-board";
import { YutCatchCutIn, YutThrowFx } from "@/components/games/yut-fx";
import {
  GameChampionBadge,
  PotTitleBadge,
} from "@/components/honor/crowned-frame";
import { WIN_REWARD as DEFAULT_REWARD } from "@/lib/game-config";
import type { WinReward } from "@/lib/game-reward";
import { ONI_EMOTES, QUICK_TEXTS } from "@/lib/omok-emotes";
import {
  bellSound,
  cutInSound,
  fightSound,
  omokSoundOn,
  portalSound,
  readySound,
  resultSound,
  setOmokSound,
  stoneClick,
  tickSound,
  yutLandSound,
  yutThrowSound,
} from "@/lib/omok-sound";
import {
  END,
  START,
  applyMove,
  dest,
  movablePieces,
  other,
  type Team,
  type YutState,
} from "@/lib/yut";
import { yutTaunt } from "@/lib/yut-lines";
import type { YutSeatView, YutView } from "@/lib/yut-server";
import type { Watcher } from "@/lib/game-watch";
import type { YokaiSpecies } from "@/lib/yokai";

type Json = { view?: YutView; error?: string; code?: string };
type Face = { species: YokaiSpecies; stage: number } | null;
type CutIn = {
  key: number;
  hero: Face;
  heroName: string;
  team: Team;
  victims: { face: Face; team: Team; name?: string }[];
  taunt: string;
};

/** 요괴 윷놀이 방: 대기실(팀 자리 · 섞기 · READY · 시작) → 판(크게 · 던지기 · 점프 이동 · 잡기 도발 · 업기 · 기권) → 결과 */
export function YutRoom({
  initial,
  loggedIn,
  hasYokai,
  shareUrl,
  reward,
}: {
  initial: YutView;
  loggedIn: boolean;
  hasYokai: boolean;
  shareUrl: string;
  /** 승리 보상(관리자 조정값) */
  reward?: WinReward;
}) {
  const router = useRouter();
  const WIN_REWARD = reward ?? DEFAULT_REWARD;
  const [view, setView] = useState(initial);
  const [offset, setOffset] = useState(() => initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [portal, setPortal] = useState<{ node: string; key: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<number | null>(null);
  /** 던지기 세기 게이지(누르면 출렁 → 한 번 더 누르면 던짐) */
  const [gauge, setGauge] = useState<{ start: number; power: number } | null>(
    null,
  );
  const [throwFx, setThrowFx] = useState<NonNullable<
    YutState["lastThrow"]
  > | null>(null);
  // 던지기를 누른 순간 ~ 결과가 올 때까지: 윷가락을 쥐고 흔드는 준비 동작(반응 공백 없애기)
  const [winding, setWinding] = useState(false);
  const [callout, setCallout] = useState<{
    text: string;
    color: string;
    key: number;
  } | null>(null);
  const [impact, setImpact] = useState(false);
  const [burst, setBurst] = useState<YutBurst | null>(null);
  const [knock, setKnock] = useState<YutKnock | null>(null);
  const [merge, setMerge] = useState<{ key: number; node: string } | null>(
    null,
  );
  const [cutIn, setCutIn] = useState<CutIn | null>(null);
  /** 잡기: 도착한 요괴가 드롭킥 */
  const [kick, setKick] = useState<{ key: number; node: string } | null>(null);
  const [stepMs, setStepMs] = useState(initial.mode >= 3 ? 160 : 260);
  const [showResult, setShowResult] = useState(initial.status === "done");
  const [emoteWait, setEmoteWait] = useState(0);
  const [watching, setWatching] = useState({
    count: initial.watchers ?? 0,
    names: initial.watcherNames ?? [],
    list: initial.watcherList ?? [],
  });
  const [watchKey] = useState(() =>
    Math.random().toString(36).slice(2, 14).padEnd(10, "0"),
  );
  const versionRef = useRef(initial.version);
  const seatedRef = useRef(Boolean(initial.mySeat));
  const prev = useRef(initial);
  const lastBeep = useRef(0);
  const timers = useRef<number[]>([]);
  const fast = view.mode >= 3;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // 말 이동을 화면에서 먼저 보여 준 경우: 서버 결과가 같은 이동이면 연출이 두 번 돌지 않게 시각(at)을 맞춤
  const optimisticRef = useRef<{ at: number; team: Team; from: string; to: string } | null>(null);
  function receive(incoming: YutView) {
    let next = incoming;
    const o = optimisticRef.current;
    const e = next.state?.event;
    if (o && next.state && e && e.team === o.team && e.from === o.from && e.to === o.to) {
      next = { ...next, state: { ...next.state, event: { ...e, at: o.at } } };
      optimisticRef.current = null;
    }
    versionRef.current = next.version;
    seatedRef.current = Boolean(next.mySeat);
    if (next.watchers !== undefined)
      setWatching({
        count: next.watchers,
        names: next.watcherNames ?? [],
        list: next.watcherList ?? [],
      });
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(안 보면 5초) 바뀐 것만 · 자리에 앉은 사람은 매번 「자리 지킴」(오래 안 보이면 AI가 대신)
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tick = 0;
    const loop = async () => {
      tick += 1;
      const watch = seatedRef.current || tick % 4 === 1 ? `&w=${watchKey}` : "";
      try {
        const res = await fetch(
          `/api/games/yut/${initial.id}?v=${versionRef.current}${watch}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as {
            same: boolean;
            view?: YutView;
            watchers?: number;
            watcherNames?: string[];
            watcherList?: Watcher[];
          };
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
      if (alive) timer = window.setTimeout(loop, document.hidden ? 5000 : 1000);
    };
    timer = window.setTimeout(loop, 600);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [initial.id, watchKey]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const faces = useMemo(() => {
    const out: Record<Team, Face[]> = { A: [], B: [] };
    for (const seat of [...view.seats].sort((a, b) => a.idx - b.idx))
      out[seat.team].push(seat.player?.yokai ?? null);
    return out;
  }, [view.seats]);
  const names = useMemo(() => {
    const out: Record<Team, string[]> = { A: [], B: [] };
    for (const seat of [...view.seats].sort((a, b) => a.idx - b.idx))
      out[seat.team].push(seat.player?.nickname ?? "");
    return out;
  }, [view.seats]);

  // 서버에서 받은 변화 → 던지기 · 한 칸씩 점프 · 도착하면 잡기(컷인 · 넉백) / 업기(합체) / 골인 · 결과
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    setSelected(null);
    if (!view.myTurn || view.state?.phase !== "throw") setGauge(null);
    if (before.status === "waiting" && view.status === "playing") {
      fightSound();
      setCallout({ text: "윷놀이 시작!", color: "#ffcf4a", key: view.version });
    }
    const s = view.state;
    const b = before.state;
    if (s?.lastThrow && s.lastThrow.at !== b?.lastThrow?.at) {
      yutThrowSound();
      setThrowFx(s.lastThrow);
    }
    if (s?.event && s.event.at !== b?.event?.at) {
      const e = s.event;
      const color = TEAM_COLOR[e.team];
      const path = e.path ?? [];
      // 다인전(3:3 · 4:4)이나 윷 · 모가 이어지면 빠르게
      const quick =
        view.mode >= 3 || s.results.length > 0 || (b?.results.length ?? 0) > 1;
      const ms = quick ? 150 : 260;
      setStepMs(ms);
      path.forEach((_, i) => later(() => stoneClick(), i * ms + ms * 0.85));
      const arrive = path.length * ms + 40;
      later(
        () => {
          if (e.type === "capture" && b) {
            const opp = other(e.team);
            const victims = b.pieces[opp]
              .map((p, i) => ({ p, i }))
              .filter(
                (x) => x.p.pos === e.to && s.pieces[opp][x.i]?.pos === START,
              )
              .map((x, k) => ({
                node: e.to,
                face: pieceFace(faces, opp, x.i),
                i: x.i,
                team: opp,
                kx: (k % 2 ? -1 : 1) * (140 + ((e.at >> 3) % 80)),
              }));
            const seat = view.turnSeat
              ? view.seats.find(
                  (x) =>
                    x.team === view.turnSeat!.team &&
                    x.idx === view.turnSeat!.idx,
                )
              : null;
            const hero = seat?.player?.yokai ?? null;
            cutInSound();
            setImpact(true);
            setBurst({
              key: e.at,
              node: e.to,
              colors: [color, "#ffcf4a", "#ffffff", "#0a0614"],
              count: 22,
            });
            setKick({ key: e.at, node: e.to });
            setKnock({ key: e.at, items: victims });
            setCutIn({
              key: e.at,
              hero,
              heroName: seat?.player?.nickname ?? TEAM_NAME[e.team],
              team: e.team,
              victims: victims.map((v) => ({ face: v.face, team: v.team, name: pieceName(names, v.team, v.i) })),
              taunt: yutTaunt(hero?.species, e.at),
            });
          } else if (e.type === "stack") {
            stoneClick();
            setMerge({ key: e.at, node: e.to });
            setBurst({
              key: e.at,
              node: e.to,
              colors: ["#ffcf4a", "#ffe08a", color],
              count: 12,
            });
            const upN = s.pieces[e.team].filter((p) => p.pos === e.to).length;
            setCallout({
              text: upN >= 4 ? `🔥🔥 대화재! ×${upN}` : upN === 3 ? `🔥 불길이 붙었다! ×3` : `업었다! ×${upN}`,
              color,
              key: e.at,
            });
          }
          if (
            (e.type === "move" || e.type === "stack" || e.type === "capture") &&
            SHORTCUT_NODES.includes(e.to)
          ) {
            portalSound();
            setPortal({ node: e.to, key: e.at });
            if (e.type === "move")
              setCallout({
                text: "🌀 지름길 진입!",
                color: "#6ad7ff",
                key: e.at,
              });
          }
          if (e.type === "finish") {
            bellSound();
            setCallout({
              text: e.count > 1 ? `${e.count}개 골인!` : "골인!",
              color,
              key: e.at,
            });
          } else if (e.type === "skip") {
            setCallout({
              text: e.nak
                ? "낙! 윷이 판 밖으로 · 차례 넘김"
                : "움직일 말이 없어요 · 차례 넘김",
              color: "#d6cdee",
              key: e.at,
            });
          }
        },
        e.type === "skip" ? 1300 : arrive,
      );
    }
    if (before.status !== "done" && view.status === "done") {
      if (view.endReason === "finish" || view.endReason === "resign")
        resultSound(Boolean(view.mySeat && view.winner === view.mySeat.team));
      later(
        () => setShowResult(true),
        view.endReason === "finish" ? 2400 : 300,
      );
    }
    const meNow = view.seats.find((x) => x.me);
    const meBefore = before.seats.find((x) => x.me);
    if (meNow?.ready && !meBefore?.ready) readySound();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 서버 상태가 바뀔 때만
  }, [view]);
  // 잠깐 보이는 연출들 정리
  useEffect(() => {
    if (!throwFx) return;
    const t = window.setTimeout(() => setThrowFx(null), fast ? 1500 : 2000);
    return () => window.clearTimeout(t);
  }, [throwFx, fast]);
  useEffect(() => {
    if (!callout) return;
    const t = window.setTimeout(() => setCallout(null), 1400);
    return () => window.clearTimeout(t);
  }, [callout]);
  useEffect(() => {
    if (!impact) return;
    const t = window.setTimeout(() => setImpact(false), 200);
    return () => window.clearTimeout(t);
  }, [impact]);
  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 900);
    return () => window.clearTimeout(t);
  }, [burst]);
  useEffect(() => {
    if (!knock) return;
    const t = window.setTimeout(() => setKnock(null), 1000);
    return () => window.clearTimeout(t);
  }, [knock]);
  useEffect(() => {
    if (!merge) return;
    const t = window.setTimeout(() => setMerge(null), 500);
    return () => window.clearTimeout(t);
  }, [merge]);
  useEffect(() => {
    if (!kick) return;
    const t = window.setTimeout(() => setKick(null), 700);
    return () => window.clearTimeout(t);
  }, [kick]);
  useEffect(() => {
    if (!portal) return;
    const t = window.setTimeout(() => setPortal(null), 1200);
    return () => window.clearTimeout(t);
  }, [portal]);
  useEffect(() => {
    if (!cutIn) return;
    const t = window.setTimeout(() => setCutIn(null), 2100);
    return () => window.clearTimeout(t);
  }, [cutIn]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const gaugeStart = gauge?.start ?? null;
  useEffect(() => {
    if (gaugeStart === null) return;
    let raf = 0;
    const tick = () => {
      // 0 → 100 → 0 (1.1초에 한 번 왕복)
      const t = ((performance.now() - gaugeStart) % 1100) / 1100;
      const power = Math.round((t < 0.5 ? t * 2 : 2 - t * 2) * 100);
      setGauge((g) => (g ? { ...g, power } : g));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gaugeStart]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    // 휴대폰 손맛: 던지기 0.1초 · 말 옮기기 짧게 진동
    if (action === "throw" || action === "move") {
      try {
        navigator.vibrate?.(action === "throw" ? 100 : 30);
      } catch {
        /* 진동 없는 기기 */
      }
    }
    setBusy(true);
    setNote(null);
    if (action === "throw") setWinding(true);
    try {
      const res = await fetch(`/api/games/yut/${view.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = (await res.json()) as Json;
      if (json.code === "NO_YOKAI") {
        router.push(
          `/yokai?next=${encodeURIComponent(`/games/yut/${view.id}`)}`,
        );
        return;
      }
      if (json.view) receive(json.view);
      if (res.ok && action === "rematch" && json.view?.nextId)
        router.push(`/games/yut/${json.view.nextId}`);
      if (res.ok && action === "exit") router.push("/games/yut");
      if (!res.ok) {
        setNote(json.error ?? "처리하지 못했어요.");
        if (action === "move" || res.status === 409) {
          optimisticRef.current = null;
          const fresh = (await fetch(`/api/games/yut/${view.id}`, {
            cache: "no-store",
          }).then((r) => r.json())) as Json;
          if (fresh.view) receive(fresh.view);
        }
      }
    } catch {
      setNote("연결이 끊겼어요. 잠시 뒤 다시 해 주세요.");
      if (action === "move") {
        optimisticRef.current = null;
        const fresh = (await fetch(`/api/games/yut/${view.id}`, { cache: "no-store" })
          .then((res) => res.json())
          .catch(() => ({}))) as Json;
        if (fresh.view) receive(fresh.view);
      }
    } finally {
      setBusy(false);
      setWinding(false);
    }
  }

  /** 말 이동: 누르는 즉시 화면에서 먼저 움직임(같은 규칙 엔진) → 서버 결과로 맞춤 · 거절되면 서버 판으로 되돌림 */
  function moveNow(ri: number, pi: number) {
    const st = view.state;
    if (st) {
      const res = applyMove(st, ri, pi, nowMs() + offset);
      if (res.ok && res.state.event) {
        const e = res.state.event;
        optimisticRef.current = { at: e.at, team: e.team, from: e.from, to: e.to };
        setSelected(null);
        setView((v) => ({ ...v, state: res.state }));
      }
    }
    void act("move", { ri, pi });
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const s = view.state;
  const waiting = view.status === "waiting";
  const playing = view.status === "playing";
  const myTeam = view.mySeat?.team ?? null;
  const mySeatView = view.seats.find((x) => x.me) ?? null;
  const myTurn = view.myTurn && Boolean(s);
  const canThrow = myTurn && s?.phase === "throw";
  const moving = Boolean(s && myTurn && s.phase === "move");
  const movable = useMemo(() => {
    if (!s || !moving) return [];
    const seen = new Set<string>();
    const out: number[] = [];
    for (const v of new Set(s.results))
      for (const i of movablePieces(s, s.turnTeam, v)) {
        const pos = s.pieces[s.turnTeam][i].pos;
        if (seen.has(pos)) continue;
        seen.add(pos);
        out.push(i);
      }
    return out;
  }, [s, moving]);
  const selPiece =
    selected !== null && s ? s.pieces[s.turnTeam][selected] : null;
  /** 고른 말이 윷 결과마다 갈 칸(같은 칸이면 하나만) */
  const ghosts = useMemo(() => {
    if (!s || !selPiece) return [];
    const out: { node: string; ri: number; label: string }[] = [];
    s.results.forEach((v, i) => {
      const to = dest(selPiece.pos, v);
      if (to && !out.some((g) => g.node === to))
        out.push({ node: to, ri: i, label: yutName(v) });
    });
    return out;
  }, [s, selPiece]);
  const left =
    playing && view.turnAt
      ? Math.max(0, view.turnMs - (now + offset - view.turnAt))
      : 0;
  const curSeat = view.turnSeat
    ? view.seats.find(
        (x) => x.team === view.turnSeat!.team && x.idx === view.turnSeat!.idx,
      )
    : null;
  const teamHumans = myTeam
    ? view.seats.filter(
        (x) => x.team === myTeam && x.player && !x.bot && !x.left,
      )
    : [];
  const teamSurrenders = teamHumans.filter((x) => x.surrender).length;

  // 내 차례 남은 3초 · 삑
  useEffect(() => {
    if (!myTurn || left <= 0 || left > 3000) return;
    const sec = Math.ceil(left / 1000);
    if (lastBeep.current === sec + (view.turnAt ?? 0)) return;
    lastBeep.current = sec + (view.turnAt ?? 0);
    tickSound(sec % 2 === 1);
  }, [myTurn, left, view.turnAt]);

  function pickPiece(i: number) {
    if (!s) return;
    const pos = s.pieces[s.turnTeam][i]?.pos;
    const rep = movable.find((m) => s.pieces[s.turnTeam][m].pos === pos);
    if (rep === undefined) return;
    // 같은 말을 한 번 더 누르면: 갈 곳이 한 칸뿐이면 바로 이동
    if (selected === rep) {
      const only = s.results
        .map((v, ri) => ({ ri, to: dest(s.pieces[s.turnTeam][rep].pos, v) }))
        .filter((x) => x.to);
      const uniq = [...new Set(only.map((x) => x.to))];
      if (uniq.length === 1) moveNow(only[0].ri, rep);
    } else setSelected(rep);
  }
  /** 판 빈 곳 터치: 던지기 차례면 바로 던지기(0.5초 연타 막기) · 아니면 고른 것 취소 */
  function tapEmpty() {
    const k = keyRef.current;
    if (canThrow && !busy) {
      if (nowMs() - k.last < 500) return;
      k.last = nowMs();
      throwNow(gauge ? gauge.power : randomPower());
      return;
    }
    cancel();
  }
  function cancel() {
    setSelected(null);
    setGauge(null);
  }
  const throwNow = (power: number) => {
    setGauge(null);
    void act("throw", { power });
  };
  // 키보드: 스페이스바 = 던지기(게이지가 열려 있으면 그 세기, 아니면 바로) · ESC = 취소. 0.5초 연타 막기
  const keyRef = useRef({
    canThrow: false,
    gauge: null as typeof gauge,
    busy: false,
    last: 0,
  });
  const canThrowNow = Boolean(myTurn && s?.phase === "throw");
  useEffect(() => {
    keyRef.current.canThrow = canThrowNow;
    keyRef.current.gauge = gauge;
    keyRef.current.busy = busy;
  }, [canThrowNow, gauge, busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "Escape") {
        setSelected(null);
        setGauge(null);
        return;
      }
      if (e.code !== "Space" && e.key !== " ") return;
      const k = keyRef.current;
      if (!k.canThrow) return;
      e.preventDefault();
      if (k.busy || Date.now() - k.last < 500) return;
      k.last = Date.now();
      setGauge(null);
      void act("throw", {
        power: k.gauge ? k.gauge.power : 60 + Math.floor(Math.random() * 30),
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최신 값은 keyRef로
  }, []);
  // 자리가 다 찬 방에 들어온 사람은 자동으로 도전 줄(스스로 빠지면 다시 안 세움)
  const spectator = !view.mySeat;
  const full = view.seats.every((x) => x.player);
  const canAutoQueue =
    spectator &&
    loggedIn &&
    hasYokai &&
    !view.queueMine &&
    !view.nextId &&
    view.endReason !== "cancel" &&
    (view.status !== "waiting" || full);
  const autoQueued = useRef(false);
  useEffect(() => {
    if (!canAutoQueue || autoQueued.current) return;
    try {
      if (window.sessionStorage.getItem(`yut-q-out:${view.id}`)) return;
    } catch {
      /* 저장소를 못 쓰면 그냥 진행 */
    }
    const t = window.setTimeout(() => {
      autoQueued.current = true;
      void act("queue-join");
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 방마다 한 번만
  }, [canAutoQueue, view.id]);
  // 다음 판이 열리면(한 판 더 · 승자 연전) 결과를 잠깐 보여 준 뒤 모두 다음 판으로 — 진 사람 · 관전자는 관전석
  const nextAt = useRef<number | null>(null);
  useEffect(() => {
    if (!view.nextId || view.status !== "done") return;
    if (nextAt.current === null) nextAt.current = Date.now();
    const wait = Math.max(0, nextAt.current + 6000 - Date.now());
    const t = window.setTimeout(
      () => router.replace(`/games/yut/${view.nextId}`),
      wait,
    );
    return () => window.clearTimeout(t);
  }, [view.nextId, view.status, router]);
  const queueOut = (out: boolean) => {
    try {
      if (out) window.sessionStorage.setItem(`yut-q-out:${view.id}`, "1");
      else window.sessionStorage.removeItem(`yut-q-out:${view.id}`);
    } catch {
      /* 이번만 */
    }
    void act(out ? "queue-leave" : "queue-join");
  };
  const startRep = s
    ? movable.find((m) => s.pieces[s.turnTeam][m].pos === START)
    : undefined;

  /** 판 위에 띄울 이모티콘(대국자) · 응원(관전자): 1.6초 안의 것만 */
  const emoteBubbles = (() => {
    const t = now + offset;
    const out: { who: string; e: string; at: number; color: string }[] = [];
    if (view.emote && t - view.emote.at < 1600) {
      const seat = view.seats.find(
        (x) => `${x.team}${x.idx}` === view.emote!.seat,
      );
      out.push({
        who: seat?.player?.nickname ?? "?",
        e: view.emote.e,
        at: view.emote.at,
        color: seat ? TEAM_COLOR[seat.team] : "#6ad7ff",
      });
    }
    for (const c of view.cheers)
      if (t - c.at < 1600)
        out.push({ who: c.n, e: c.e, at: c.at, color: "#6ad7ff" });
    return out.slice(-4);
  })();
  const emoteOn = (seat: YutSeatView) =>
    view.emote &&
    view.emote.seat === `${seat.team}${seat.idx}` &&
    now + offset - view.emote.at < 4000;
  /** 판 위 팀 줄: 작은 칩(칭호는 닉네임 위) */
  const seatChip = (seat: YutSeatView) => {
    const turn =
      playing &&
      view.turnSeat?.team === seat.team &&
      view.turnSeat.idx === seat.idx;
    return (
      <li
        key={`${seat.team}${seat.idx}`}
        data-yut-seat={`${seat.team}${seat.idx}`}
        className={cn(
          "yut-hud-chip relative flex min-w-0 items-center gap-1.5 border-2 px-1.5 py-1",
          view.mode >= 3 ? "min-h-10" : "min-h-11",
          turn ? "yut-hud-chip-on border-[#ffcf4a]" : "border-[#6ad7ff]/40",
        )}
      >
        {emoteOn(seat) ? (
          <span
            key={view.emote!.at}
            className="absolute -top-1 -right-1 z-20 rounded-full bg-[#ffcf4a] px-1 text-[10px] font-black text-[#2a1400]"
          >
            💬
          </span>
        ) : null}
        <YokaiToken
          face={seat.player?.yokai ?? null}
          team={seat.team}
          className={cn(view.mode >= 3 ? "size-7 shrink-0" : "size-8 shrink-0", turn && "arcade-bob")}
        />
        <span className="grid min-w-0 flex-1 leading-tight">
          {seat.player && !seat.bot ? (
            <GameChampionBadge nickname={seat.player.nickname} game="yut" />
          ) : null}
          <b
            data-yut-seat-name
            title={seat.player?.nickname}
            className={cn(
              "truncate font-black",
              view.mode >= 4 ? "text-[11px]" : view.mode >= 3 ? "text-[12px]" : "text-[13px]",
              seat.me ? "text-[#ffcf4a]" : "text-white",
            )}
          >
            {seat.player?.nickname ?? "빈자리"}
          </b>
          <span className="flex min-w-0 items-center gap-1 overflow-hidden text-[10px] font-bold text-[#d6cdee]">
            {seat.surrender ? (
              "🏳️ 기권 원함"
            ) : seat.left ? (
              "🤖 나감 · AI"
            ) : seat.bot ? (
              "🤖 요괴봇"
            ) : turn ? (
              "차례!"
            ) : seat.player && !seat.bot ? (
              <PotTitleBadge
                nickname={seat.player.nickname}
                max={1}
                yokai={false}
                className="!text-[9px]"
              />
            ) : (
              ""
            )}
          </span>
        </span>
        {turn ? (
          <span className="absolute inset-x-1 bottom-0.5 h-1 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-[#ffcf4a] transition-[width] duration-200"
              style={{ width: `${(left / view.turnMs) * 100}%` }}
            />
          </span>
        ) : null}
      </li>
    );
  };

  /** 판 아래 한 줄: 대기 말(눌러서 내보내기) · 골인 */
  const tray = (team: Team) => {
    if (!s) return null;
    const list = s.pieces[team];
    const home = list
      .map((p, i) => ({ p, i }))
      .filter((x) => x.p.pos === START);
    const goal = list.filter((p) => p.pos === END).length;
    const canStart = myTurn && team === s.turnTeam && startRep !== undefined;
    return (
      <div
        data-yut-tray={team}
        className="flex min-h-16 min-w-0 flex-wrap items-center gap-1.5 px-2 py-1.5"
        style={{
          background: `linear-gradient(180deg, ${TEAM_COLOR[team]}26, #0a0614)`,
          border: `2px solid ${TEAM_COLOR[team]}`,
          boxShadow: "2px 2px 0 #0a0614",
        }}
      >
        <b
          className="w-9 shrink-0 text-sm font-black"
          style={{ color: TEAM_COLOR[team] }}
        >
          {TEAM_NAME[team]}
        </b>
        {home.map(({ i }) => (
          <button
            key={i}
            type="button"
            data-yut-home={`${team}${i}`}
            disabled={!canStart}
            onClick={() => startRep !== undefined && pickPiece(startRep)}
            className={cn(
              "grid min-h-14 min-w-12 shrink-0 justify-items-center rounded-lg px-0.5",
              canStart && "cursor-pointer hover:bg-[#ffcf4a]/15",
              canStart && selected === startRep && "scale-110 bg-[#ffcf4a]/20",
            )}
            aria-label={`${TEAM_NAME[team]} 대기 말 내보내기`}
          >
            <YokaiToken
              face={pieceFace(faces, team, i)}
              team={team}
              className={cn("size-10", canStart && "yut-select-jump")}
            />
            <NameTag
              name={pieceName(names, team, i)}
              team={team}
              className="!max-w-[3.5rem] !text-[9px]"
            />
          </button>
        ))}
        <span className="ml-auto shrink-0 text-xs font-black text-[#ffe08a]">
          {"★".repeat(goal)}
          <span className="text-white/25">
            {"☆".repeat(list.length - goal)}
          </span>
        </span>
      </div>
    );
  };

  const queuePanel =
    view.queue.length ||
    (spectator && loggedIn && hasYokai && view.endReason !== "cancel") ? (
      <section data-yut-queue className="arcade-panel grid gap-2 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black text-white">
            ⚔️ 도전 줄 {view.queue.length}명
          </h2>
          <span className="text-xs text-[#d6cdee]">
            판이 끝나면 진 팀 자리에 앞사람부터 앉아요
          </span>
        </div>
        {view.queue.length ? (
          <ol className="flex flex-wrap gap-1.5">
            {view.queue.map((n, i) => (
              <li
                key={`${n}-${i}`}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-black",
                  view.queueMine === i + 1
                    ? "bg-[#ffcf4a] text-[#2a1400]"
                    : "bg-black/40 text-white",
                )}
              >
                {i + 1}. {n}
              </li>
            ))}
          </ol>
        ) : null}
        {spectator && loggedIn && hasYokai && !view.nextId ? (
          view.queueMine ? (
            <button
              type="button"
              data-yut-queue-leave
              disabled={busy}
              onClick={() => queueOut(true)}
              className="arcade-btn btn-dark !min-h-10 text-sm"
            >
              줄에서 빠지기 (내 순서 {view.queueMine}번)
            </button>
          ) : (
            <button
              type="button"
              data-yut-queue-join
              disabled={busy}
              onClick={() => queueOut(false)}
              className="arcade-btn btn-gold !min-h-11 text-base"
            >
              🙋 다음 판 도전 줄 서기
            </button>
          )
        ) : null}
      </section>
    ) : null;

  const won =
    view.status === "done" && view.mySeat && view.winner === view.mySeat.team;
  const humans = view.seats.filter((x) => x.player && !x.bot).length;
  const ended =
    view.endReason === "finish" ||
    view.endReason === "resign" ||
    view.endReason === "leave";

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      {/* 머리(한 줄) */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <h1
          data-yut-title
          className="flex min-w-0 basis-full items-center gap-1.5 truncate text-base font-black text-[#ffe08a] sm:basis-auto sm:flex-1"
        >
          🎲 <span className="truncate">{view.title}</span>
        </h1>
        <span className="g-chip shrink-0 !text-white">
          {view.mode}:{view.mode}
        </span>
        {view.code ? (
          <button
            type="button"
            data-yut-code
            onClick={() => copy(view.code!, "code")}
            className="g-chip arcade-px shrink-0 !text-[#ffcf4a]"
          >
            {view.code} {copied === "code" ? "✓" : "⧉"}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={sound ? "효과음 끄기" : "효과음 켜기"}
          onClick={() => {
            setOmokSound(!sound);
            setSound(!sound);
          }}
          className="arcade-btn btn-dark !min-h-9 shrink-0 px-2.5 text-sm"
        >
          {sound ? "🔊" : "🔇"}
        </button>
        {playing && mySeatView && !mySeatView.left ? (
          <button
            type="button"
            data-yut-surrender
            onClick={() => setConfirmSurrender(true)}
            className="arcade-btn btn-dark !min-h-9 shrink-0 px-2.5 text-sm"
          >
            🏳️ 기권
          </button>
        ) : null}
        {view.mySeat && view.status !== "done" ? (
          <button
            type="button"
            data-yut-exit
            onClick={() => setConfirmExit(true)}
            className="arcade-btn btn-main !min-h-9 shrink-0 px-2.5 text-sm"
          >
            나가기
          </button>
        ) : (
          <Link
            href="/games/yut"
            className="arcade-btn btn-dark grid !min-h-9 shrink-0 place-items-center px-2.5 text-sm"
          >
            로비로
          </Link>
        )}
      </div>
      {view.isPrivate || view.withBots ? (
        <div className="flex flex-wrap gap-1.5">
          {view.isPrivate ? <span className="g-chip">🔒 비공개</span> : null}
          {view.withBots ? (
            <span className="g-chip">🤖 봇 포함 · 전적 없음</span>
          ) : null}
        </div>
      ) : null}

      {note ? (
        <p
          role="alert"
          className="rounded-xl bg-[#ff5d6c]/15 px-3 py-2 text-sm font-bold text-[#ff8f9a]"
        >
          {note}
        </p>
      ) : null}

      {/* ───── 대기실 ───── */}
      {waiting ? (
        <section data-yut-waiting className="yut-hud grid gap-3 p-3">
          <p className="text-center font-[family-name:var(--font-arcade)] text-[10px] leading-relaxed tracking-wider text-[#6ad7ff]">
            WAITING ROOM · PRESS READY!
          </p>
          <div className="grid justify-items-center gap-1 text-center">
            <p className="text-sm font-bold text-[#d6cdee]">초대 코드</p>
            <p className="arcade-px neon-gold text-3xl tracking-[0.3em]">
              {view.code}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => copy(shareUrl, "link")}
                className="arcade-btn btn-gold !min-h-11 px-4 text-sm"
              >
                {copied === "link" ? "✓ 링크 복사됨" : "🔗 초대 링크 복사"}
              </button>
              <button
                type="button"
                onClick={() => copy(view.code ?? "", "code2")}
                className="arcade-btn btn-dark !min-h-11 px-4 text-sm"
              >
                {copied === "code2" ? "✓ 복사됨" : "코드 복사"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((team) => (
              <div
                key={team}
                data-yut-team={team}
                className="grid content-start gap-2 p-2.5"
                style={{
                  background: `linear-gradient(180deg, ${TEAM_COLOR[team]}22, #0a0614)`,
                  border: `3px solid ${TEAM_COLOR[team]}`,
                  boxShadow: `0 0 0 3px #0a0614, 0 0 16px ${TEAM_COLOR[team]}66`,
                }}
              >
                <b
                  className="text-xl font-black"
                  style={{ color: TEAM_COLOR[team] }}
                >
                  {TEAM_NAME[team]}
                </b>
                <ul className="grid gap-2">
                  {view.seats
                    .filter((x) => x.team === team)
                    .map((seat) => (
                      <li
                        key={seat.idx}
                        data-yut-slot={`${team}${seat.idx}`}
                        className="yut-hud-chip flex min-h-14 items-center gap-2 border-2 border-white/10 px-2"
                      >
                        {seat.player ? (
                          <>
                            <YokaiToken
                              face={seat.player.yokai}
                              team={team}
                              className="size-10 shrink-0"
                            />
                            <span className="grid min-w-0 flex-1 leading-tight">
                              {seat.player && !seat.bot ? (
                                <GameChampionBadge
                                  nickname={seat.player.nickname}
                                  game="yut"
                                />
                              ) : null}
                              <b
                                className={cn(
                                  "truncate text-base font-black",
                                  seat.me ? "text-[#ffcf4a]" : "text-white",
                                )}
                              >
                                {seat.player.nickname}
                                {seat.host ? " 👑" : ""}
                              </b>
                              <span className="flex max-w-full overflow-hidden empty:hidden">
                                <PotTitleBadge
                                  nickname={seat.player.nickname}
                                  max={1}
                                  yokai={false}
                                  className="!text-[10px]"
                                />
                              </span>
                            </span>
                            {seat.bot ? (
                              <span className="rounded-md bg-[#b77bff]/30 px-2 py-0.5 text-xs font-black text-[#e7c4ff]">
                                🤖 요괴봇
                              </span>
                            ) : seat.host ? null : seat.ready ? (
                              <span className="rounded-md bg-[#3ddc97] px-2 py-0.5 text-xs font-black text-[#062a1b]">
                                READY
                              </span>
                            ) : (
                              <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-[#d6cdee]">
                                준비 중
                              </span>
                            )}
                            {seat.bot && view.isHost ? (
                              <button
                                type="button"
                                data-yut-bot-remove={`${team}${seat.idx}`}
                                disabled={busy}
                                onClick={() =>
                                  act("bot-remove", { team, idx: seat.idx })
                                }
                                aria-label="요괴봇 빼기"
                                className="grid min-h-9 place-items-center rounded-lg bg-white/10 px-2 text-xs font-black text-[#ff8f9a]"
                              >
                                빼기
                              </button>
                            ) : seat.bot &&
                              loggedIn &&
                              hasYokai &&
                              !view.isHost ? (
                              <button
                                type="button"
                                data-yut-sit={`${team}${seat.idx}`}
                                disabled={busy}
                                onClick={() =>
                                  act("sit", { team, idx: seat.idx })
                                }
                                className="grid min-h-9 place-items-center rounded-lg border-2 border-dashed px-2 text-xs font-black"
                                style={{
                                  borderColor: `${TEAM_COLOR[team]}aa`,
                                  color: TEAM_COLOR[team],
                                }}
                              >
                                대신 앉기
                              </button>
                            ) : null}
                            {view.isHost && !seat.me && !seat.bot ? (
                              <button
                                type="button"
                                data-yut-kick
                                onClick={() =>
                                  act("kick", { target: `${team}${seat.idx}` })
                                }
                                disabled={busy}
                                aria-label={`${seat.player.nickname} 내보내기`}
                                className="grid size-9 place-items-center rounded-lg bg-white/10 text-sm font-black text-[#ff8f9a]"
                              >
                                ✕
                              </button>
                            ) : null}
                          </>
                        ) : loggedIn && hasYokai ? (
                          <span className="flex w-full gap-1.5">
                            <button
                              type="button"
                              data-yut-sit={`${team}${seat.idx}`}
                              disabled={busy}
                              onClick={() =>
                                act("sit", { team, idx: seat.idx })
                              }
                              className="flex min-h-12 flex-1 items-center justify-center rounded-lg border-2 border-dashed font-black"
                              style={{
                                borderColor: `${TEAM_COLOR[team]}aa`,
                                color: TEAM_COLOR[team],
                              }}
                            >
                              ＋{" "}
                              {view.mySeat ? "이 자리로 옮기기" : "여기 앉기"}
                            </button>
                            {view.isHost ? (
                              <button
                                type="button"
                                data-yut-bot-add={`${team}${seat.idx}`}
                                disabled={busy}
                                onClick={() =>
                                  act("bot-add", { team, idx: seat.idx })
                                }
                                className="min-h-12 shrink-0 rounded-lg border-2 border-[#b77bff]/70 bg-[#b77bff]/15 px-2.5 text-sm font-black text-[#e7c4ff]"
                              >
                                🤖 요괴봇
                              </button>
                            ) : null}
                          </span>
                        ) : (
                          <span className="w-full text-center text-sm text-[#d6cdee]">
                            빈자리
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {!loggedIn ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/games/yut/${view.id}`)}`}
              className="arcade-btn btn-main grid min-h-14 place-items-center text-lg"
            >
              로그인하고 앉기
            </Link>
          ) : !hasYokai ? (
            <Link
              href={`/yokai?next=${encodeURIComponent(`/games/yut/${view.id}`)}`}
              className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg"
            >
              함께할 요괴 고르러 가기
            </Link>
          ) : null}

          {view.mySeat && !view.isHost ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                data-yut-ready
                disabled={busy}
                onClick={() => act("ready", { ready: !mySeatView?.ready })}
                className={cn(
                  "arcade-btn min-h-14 text-xl",
                  mySeatView?.ready ? "btn-dark" : "btn-green",
                )}
              >
                {mySeatView?.ready ? "준비 취소" : "READY!"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act("leave")}
                className="arcade-btn btn-dark min-h-14 text-base"
              >
                자리에서 일어나기
              </button>
            </div>
          ) : null}

          {view.isHost ? (
            <div
              data-yut-host
              className="grid gap-3 border-t border-white/10 pt-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">인원</span>
                {[1, 2, 3, 4].map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-yut-mode={m}
                    disabled={busy || m === view.mode}
                    onClick={() => act("mode", { mode: m })}
                    className={cn(
                      "min-h-10 rounded-xl border-2 px-3 text-sm font-black",
                      m === view.mode
                        ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]"
                        : "border-white/20 bg-black/40 text-white",
                    )}
                  >
                    {m}:{m}
                  </button>
                ))}
                <button
                  type="button"
                  data-yut-shuffle
                  disabled={busy || humans < 2}
                  onClick={() => act("shuffle")}
                  className="arcade-btn btn-dark ml-auto !min-h-10 px-3 text-sm"
                >
                  🔀 팀 섞기
                </button>
              </div>
              <button
                type="button"
                data-yut-start
                disabled={busy}
                onClick={() => act("start")}
                className="arcade-btn btn-main min-h-16 text-2xl"
              >
                ▶ 게임 시작
                {view.seats.some((x) => !x.player) ? (
                  <span className="block text-sm">
                    빈자리 {view.seats.filter((x) => !x.player).length}곳은
                    요괴봇이 채워요
                  </span>
                ) : null}
              </button>
              <p className="text-center text-xs text-[#d6cdee]">
                사람은 모두 READY여야 시작돼요. 혼자서도 요괴봇과 한 판 할 수
                있어요(봇이 낀 판은 전적 · 보상 없음).
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ───── 판(크게) ───── */}
      {!waiting && s ? (
        <>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
            {/* 왼쪽(PC): 판 · 대기 말 */}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
              <div className="relative min-w-0">
                <YutBoard
                  state={s}
                  faces={faces}
                  names={names}
                  stepMs={stepMs}
                  fast={fast}
                  movable={movable}
                  selected={selected}
                  ghosts={ghosts}
                  portal={portal}
                  onCancel={cancel}
                  onTapEmpty={tapEmpty}
                  onPiece={pickPiece}
                  onGhost={(ri) => {
                    if (selected !== null) moveNow(ri, selected);
                  }}
                  burst={burst}
                  impact={impact}
                  knock={knock}
                  merge={merge}
                  kick={kick}
                  bubbles={emoteBubbles}
                  throwReady={canThrow && !throwFx}
                />
                {throwFx ? (
                  <YutThrowFx
                    key={throwFx.at}
                    sticks={throwFx.sticks}
                    value={throwFx.value}
                    team={throwFx.team}
                    at={throwFx.at}
                    power={throwFx.power}
                    fast={fast}
                    onImpact={() => {
                      yutLandSound();
                      setImpact(true);
                    }}
                  />
                ) : null}
                {/* 누르자마자: 윷가락 4개를 쥐고 흔듦 → 결과가 오면 던지기 연출로 */}
                {winding && !throwFx ? (
                  <div data-yut-windup aria-hidden className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
                    <div className="yut-windup flex items-end gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="yut-stick-flat block h-16 w-3.5 rounded-sm sm:h-20 sm:w-4" style={{ transform: `rotate(${(i - 1.5) * 9}deg)` }} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {canThrow && !throwFx && !callout && !winding ? (
                  <p
                    data-yut-press
                    className="yut-press pointer-events-none absolute inset-x-0 bottom-[9%] z-30 text-center font-[family-name:var(--font-arcade)] text-[clamp(9px,2.3vw,17px)] leading-relaxed text-[#ffe08a] [text-shadow:3px_3px_0_#0a0614,0_0_12px_#ffcf4a]"
                  >
                    PRESS SPACE OR TOUCH TO THROW!
                  </p>
                ) : null}
                {!throwFx && callout ? (
                  <b
                    key={callout.key}
                    data-yut-callout
                    className="yut-callout pointer-events-none absolute top-1/2 left-1/2 z-40 whitespace-nowrap rounded-xl border-2 border-[#0a0614] bg-[#0a0614]/85 px-5 py-3 text-2xl font-black"
                    style={{ color: callout.color }}
                  >
                    {callout.text}
                  </b>
                ) : null}
              </div>
            </div>
            {/* 오른쪽(PC) · 아래(휴대폰): 팀 · 차례 · 이모티콘 · 관전석 · 도전 줄 */}
            <div className="grid min-w-0 gap-2 max-lg:contents">
              {/* 팀 줄(가로로 밀어서 보기) */}
              <div data-yut-teams className="grid gap-1.5 max-lg:-order-1">
                {(["A", "B"] as const).map((team) => (
                  <div key={team} className="grid min-w-0 gap-1">
                    <b
                      className="flex items-center gap-1.5 text-xs leading-tight font-black"
                      style={{ color: TEAM_COLOR[team] }}
                    >
                      {TEAM_NAME[team]}
                      {view.status === "done" && view.winner === team ? (
                        <span className="block">🏆</span>
                      ) : myTeam === team ? (
                        <span className="text-[10px] text-[#d6cdee]">우리 팀</span>
                      ) : null}
                      {s ? (
                        <span data-yut-left={team} className="ml-auto text-[10px] font-bold text-[#d6cdee]">
                          남은 말 {s.pieces[team].filter((p) => p.pos !== END).length}/{s.pieces[team].length}
                        </span>
                      ) : null}
                    </b>
                    <ul className={cn("grid min-w-0 gap-1", view.mode >= 2 ? "grid-cols-2" : "grid-cols-1")}>
                      {view.seats.filter((x) => x.team === team).map(seatChip)}
                    </ul>
                  </div>
                ))}
              </div>

              {/* 내 차례 · 남의 차례 */}
              {playing ? (
                <section data-yut-action className="yut-hud grid gap-2 p-2.5">
                  <p className="font-[family-name:var(--font-arcade)] text-[10px] leading-relaxed tracking-wider text-[#6ad7ff]">
                    {myTurn
                      ? s.phase === "throw"
                        ? "YOUR TURN · THROW!"
                        : "YOUR TURN · MOVE!"
                      : "PLAYER TURN"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <b
                      className="text-base font-black"
                      style={{ color: TEAM_COLOR[s.turnTeam] }}
                    >
                      {myTurn
                        ? "🎯 내 차례!"
                        : `${curSeat?.player?.nickname ?? "?"}의 차례`}
                    </b>
                    <span className="text-sm text-[#d6cdee]">
                      ({TEAM_NAME[s.turnTeam]} ·{" "}
                      {s.phase === "throw" ? "던지기" : "말 고르기"})
                    </span>
                    {s.results.length ? (
                      <span className="flex flex-wrap gap-1">
                        {s.results.map((v, i) => (
                          <span
                            key={`${i}-${v}`}
                            data-yut-result={v}
                            className="grid min-h-9 place-items-center rounded-lg border-2 border-[#ffcf4a] bg-[#ffcf4a]/15 px-2.5 text-sm font-black text-[#ffe08a]"
                          >
                            <span>
                              {yutName(v)}
                              <span className="ml-0.5 text-[10px] opacity-70">
                                {v < 0 ? "-1" : `+${v}`}
                              </span>
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "ml-auto rounded-lg px-2 py-0.5 text-base font-black",
                        left < 3000
                          ? "bg-[#ff5d6c] text-white"
                          : "bg-black/40 text-white",
                      )}
                    >
                      {Math.ceil(left / 1000)}초
                    </span>
                  </div>
                  {canThrow ? (
                    // 휴대폰: 화면 아래에 크게 고정(엄지로 바로) · PC: 이 칸 안
                    <div
                      data-yut-throw-bar
                      className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t-4 max-lg:border-[#ffcf4a] max-lg:bg-[#140d24]/95 max-lg:p-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                    >
                      {gauge ? (
                        <div className="grid gap-2">
                          <div
                            data-yut-gauge
                            className="relative h-7 overflow-hidden rounded-full border-2 border-white/30 bg-black/50"
                          >
                            <span
                              className="yut-gauge-fill absolute inset-y-0 left-0"
                              style={{ width: `${gauge.power}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-black text-white [text-shadow:0_1px_0_#000]">
                              <span>살살</span>
                              <span>적당히</span>
                              <span>세게!</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            data-yut-throw-go
                            disabled={busy}
                            onClick={() => throwNow(gauge.power)}
                            className="arcade-btn btn-main min-h-14 w-full text-2xl max-lg:min-h-20 max-lg:text-3xl"
                          >
                            🎯 지금 던져! ({gauge.power})
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-yut-throw
                          disabled={busy}
                          onClick={() =>
                            setGauge({ start: performance.now(), power: 0 })
                          }
                          className="arcade-btn btn-gold min-h-14 w-full text-2xl max-lg:min-h-20 max-lg:text-3xl"
                        >
                          🎲 윷 던지기!
                          <span className="block text-xs">
                            누른 뒤 게이지로 세기 · 스페이스바는 바로 던지기
                          </span>
                        </button>
                      )}
                    </div>
                  ) : null}
                  {myTurn && s.phase === "move" ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-bold text-[#ffe08a]">
                        {selected === null
                          ? "① 반짝이는 내 말(또는 대기 말)을 눌러요"
                          : "② 노란 칸 중 갈 곳을 눌러요 · 빈 땅 / 우클릭 / ESC는 취소"}
                      </p>
                      {selected !== null && ghosts.length === 1 ? (
                        <button
                          type="button"
                          data-yut-move
                          disabled={busy}
                          onClick={() => moveNow(ghosts[0].ri, selected)}
                          className="arcade-btn btn-green min-h-12 text-xl"
                        >
                          ✅{" "}
                          {ghosts[0].node === END
                            ? "골인!"
                            : `${ghosts[0].label}로 이동`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!myTurn ? (
                    <p className="text-xs text-[#d6cdee]">
                      시간이 지나면 요괴 AI가 대신 던지고 옮겨요.
                    </p>
                  ) : null}
                </section>
              ) : null}

              {/* 말 대기소(홍 · 청): 출발 전 말 · 골인 — 여기서만 대기 말을 내보냄 */}
              <section data-yut-docks className="yut-hud grid gap-1.5 p-2.5">
                <p className="font-[family-name:var(--font-arcade)] text-[10px] leading-relaxed tracking-wider text-[#6ad7ff]">
                  PIECE DOCK · 말 대기소
                </p>
                {tray("A")}
                {tray("B")}
              </section>

              {/* 이모티콘 · 응원 */}
              {loggedIn && view.status !== "done" ? (
                <section
                  data-yut-emote-panel
                  className="yut-hud grid gap-1.5 p-2.5"
                >
                  <p className="text-sm font-black text-[#ffe08a]">
                    💬 {view.mySeat ? "이모티콘" : "응원 이모티콘"}{" "}
                    <span className="text-xs font-bold text-[#d6cdee]">
                      — 내 요괴 머리 위로 1.5초
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ONI_EMOTES.map((e) => (
                      <button
                        key={e.key}
                        type="button"
                        data-yut-emote={e.key}
                        disabled={now < emoteWait}
                        onClick={() => {
                          setEmoteWait(Date.now() + 2500);
                          void act(view.mySeat ? "emote" : "cheer", {
                            e: e.key,
                          });
                        }}
                        className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/35 hover:bg-white/10 disabled:opacity-40"
                        aria-label={`${view.mySeat ? "이모티콘" : "응원"} ${e.label}`}
                      >
                        <EmoteArt e={e.key} className="size-9" />
                      </button>
                    ))}
                    {QUICK_TEXTS.map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        data-yut-quick={q.key}
                        disabled={now < emoteWait}
                        onClick={() => {
                          setEmoteWait(Date.now() + 2500);
                          void act(view.mySeat ? "emote" : "cheer", {
                            e: q.key,
                          });
                        }}
                        aria-label={q.label}
                        className="grid min-h-11 shrink-0 place-items-center transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        <QuickChip k={q.key} />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {canThrow ? <div className="h-28 lg:hidden" aria-hidden /> : null}
              <SpectatorBar
                count={watching.count}
                list={watching.list}
                cheers={view.cheers}
                now={now + offset}
                me={!view.mySeat}
              />
              {queuePanel}
            </div>
          </div>
        </>
      ) : null}

      {myTurn && playing && left > 0 && left <= 3000 ? (
        <div
          data-yut-danger
          className="yut-danger pointer-events-none fixed inset-0 z-[45]"
          aria-hidden
        />
      ) : null}
      {cutIn ? (
        <YutCatchCutIn
          key={cutIn.key}
          hero={cutIn.hero}
          heroName={cutIn.heroName}
          team={cutIn.team}
          victims={cutIn.victims}
          taunt={cutIn.taunt}
        />
      ) : null}

      {/* 결과 */}
      {view.status === "done" && showResult ? (
        <div
          data-yut-result-overlay
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
        >
          <div className="arcade-panel arcade-pop grid w-full max-w-sm justify-items-center gap-3 p-5 text-center">
            {ended && view.winner ? (
              <>
                <p className="arcade-px neon-gold text-xl">
                  {view.mySeat ? (won ? "YOU WIN!" : "YOU LOSE") : "GAME SET"}
                </p>
                <b
                  className="arcade-kr text-3xl"
                  style={{ color: TEAM_COLOR[view.winner] }}
                >
                  {TEAM_NAME[view.winner]}{" "}
                  {view.endReason === "resign"
                    ? "기권승!"
                    : view.endReason === "leave"
                      ? "승리! (상대 퇴장)"
                      : "승리!"}
                </b>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {view.seats
                    .filter((x) => x.team === view.winner)
                    .map((x) => (
                      <span
                        key={x.idx}
                        className="flex items-center gap-1 rounded-full bg-black/40 py-0.5 pr-2 pl-0.5 text-sm font-bold text-white"
                      >
                        <YokaiToken
                          face={x.player?.yokai ?? null}
                          team={x.team}
                          className="size-7"
                        />
                        {x.player?.nickname}
                      </span>
                    ))}
                </div>
                {won && !view.withBots ? (
                  <p
                    data-yut-reward
                    className="rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a]"
                  >
                    🎁 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} · 요괴
                    친밀도 +{WIN_REWARD.affection}
                    <span className="block text-xs font-bold text-[#d6cdee]">
                      (하루 {WIN_REWARD.perDay}판 · 같은 멤버끼리{" "}
                      {WIN_REWARD.perOpponentPerDay}판 · 짧은 판 제외)
                    </span>
                  </p>
                ) : view.withBots ? (
                  <p className="text-sm text-[#d6cdee]">
                    요괴봇이 낀 판이라 전적 · 보상은 없어요.
                  </p>
                ) : null}
              </>
            ) : (
              <b className="arcade-kr text-2xl text-white">닫힌 방이에요</b>
            )}
            <div className="grid w-full gap-2">
              {view.nextId ? (
                <Link
                  data-yut-next
                  href={`/games/yut/${view.nextId}`}
                  className="arcade-btn btn-main grid min-h-14 place-items-center text-lg"
                >
                  ⏩ 곧 다음 판으로 이동해요 · 바로 가기
                </Link>
              ) : view.mySeat && ended ? (
                <button
                  type="button"
                  data-yut-rematch
                  disabled={busy}
                  onClick={() => act("rematch")}
                  className="arcade-btn btn-main min-h-14 text-lg"
                >
                  🔁 한 판 더! (같은 멤버)
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowResult(false)}
                className="arcade-btn btn-dark min-h-12 text-base"
              >
                판 다시 보기
              </button>
              <Link
                href="/games/yut"
                className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg"
              >
                🏮 대기실로
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSurrender ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div
            data-yut-surrender-box
            className="arcade-panel grid w-full max-w-xs gap-3 p-5 text-center"
          >
            <b className="text-lg font-black text-white">🏳️ 기권할까요?</b>
            <p className="text-sm text-[#d6cdee]">
              {teamHumans.length > 1
                ? `우리 팀 사람이 모두 기권을 누르면 바로 패배해요. 지금 ${teamSurrenders}/${teamHumans.length}명.`
                : "바로 패배로 끝나고, 상대 팀이 승리 보상을 받아요."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mySeatView?.surrender ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSurrender(false);
                    void act("surrender-cancel");
                  }}
                  className="arcade-btn btn-dark min-h-12"
                >
                  기권 취소
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSurrender(false)}
                  className="arcade-btn btn-dark min-h-12"
                >
                  계속하기
                </button>
              )}
              <button
                type="button"
                data-yut-surrender-yes
                disabled={busy || mySeatView?.surrender}
                onClick={() => {
                  setConfirmSurrender(false);
                  void act("surrender");
                }}
                className="arcade-btn btn-main min-h-12"
              >
                {mySeatView?.surrender ? "기다리는 중" : "기권"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmExit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="arcade-panel grid w-full max-w-xs gap-3 p-5 text-center">
            <b className="text-lg font-black text-white">
              {waiting
                ? view.isHost
                  ? "방을 닫고 나갈까요?"
                  : "방에서 나갈까요?"
                : "판에서 나갈까요?"}
            </b>
            {playing ? (
              <p className="text-sm text-[#d6cdee]">
                {view.mode === 1
                  ? "1:1에서 나가면 기권패예요. 상대가 승리 보상을 받아요."
                  : "내 자리는 요괴 AI가 이어서 해요. 이 판 결과는 그대로 기록돼요."}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="arcade-btn btn-dark min-h-12"
              >
                취소
              </button>
              <button
                type="button"
                data-yut-exit-yes
                onClick={() => {
                  setConfirmExit(false);
                  void act("exit");
                }}
                className="arcade-btn btn-main min-h-12"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
