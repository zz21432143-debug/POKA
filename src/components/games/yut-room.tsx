"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { CheerStrip, EmoteArt } from "@/components/games/omok-hud";
import { NameTag, TEAM_COLOR, TEAM_NAME, YokaiToken, YutBoard, YutSticks, pieceFace, pieceName, yutName, type YutAnim } from "@/components/games/yut-board";
import { PotTitleBadge } from "@/components/honor/crowned-frame";
import { WIN_REWARD } from "@/lib/game-config";
import { ONI_EMOTES } from "@/lib/omok-emotes";
import { bellSound, cutInSound, fightSound, omokSoundOn, readySound, resultSound, setOmokSound, stoneClick, warnBeep, yutThrowSound } from "@/lib/omok-sound";
import { END, START, dest, movablePieces, type Team } from "@/lib/yut";
import type { YutSeatView, YutView } from "@/lib/yut-server";
import type { YokaiSpecies } from "@/lib/yokai";

type Json = { view?: YutView; error?: string; code?: string };

/** 요괴 윷놀이 방: 대기실(팀 자리 · 섞기 · READY · 시작) → 판(던지기 · 말 고르기 · 업기 · 잡기) → 결과 */
export function YutRoom({ initial, loggedIn, hasYokai, shareUrl }: { initial: YutView; loggedIn: boolean; hasYokai: boolean; shareUrl: string }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [offset, setOffset] = useState(() => initial.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bots, setBots] = useState(false);
  const [sound, setSound] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [ri, setRi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [throwShow, setThrowShow] = useState<{ sticks: boolean[]; value: number; team: Team; key: number; power?: number } | null>(null);
  const [anim, setAnim] = useState<YutAnim | null>(null);
  /** 던지기 세기 게이지(누르면 출렁 → 한 번 더 누르면 던짐) */
  const [gauge, setGauge] = useState<{ start: number; power: number } | null>(null);
  const [callout, setCallout] = useState<{ text: string; color: string; key: number } | null>(null);
  const [hit, setHit] = useState<{ node: string; key: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [showResult, setShowResult] = useState(initial.status === "done");
  const [emoteWait, setEmoteWait] = useState(0);
  const [watching, setWatching] = useState({ count: initial.watchers ?? 0, names: initial.watcherNames ?? [] });
  const [watchKey] = useState(() => Math.random().toString(36).slice(2, 14).padEnd(10, "0"));
  const versionRef = useRef(initial.version);
  const prev = useRef(initial);
  const lastBeep = useRef(0);
  const fast = view.mode >= 2;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 소리 설정은 화면이 뜬 뒤에만 읽을 수 있음
    setSound(omokSoundOn());
  }, []);

  function receive(next: YutView) {
    versionRef.current = next.version;
    if (next.watchers !== undefined) setWatching({ count: next.watchers, names: next.watcherNames ?? [] });
    setOffset(next.serverNow - Date.now());
    setView(next);
  }

  // 1초마다(안 보면 5초) 바뀐 것만 · 4번에 1번 「보고 있어요」(대국자는 자리 지킴 — 오래 안 보이면 AI가 대신)
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let tick = 0;
    const loop = async () => {
      tick += 1;
      const watch = tick % 4 === 1 ? `&w=${watchKey}` : "";
      try {
        const res = await fetch(`/api/games/yut/${initial.id}?v=${versionRef.current}${watch}`, { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { same: boolean; view?: YutView; watchers?: number; watcherNames?: string[] };
          if (alive && !json.same && json.view) receive(json.view);
          if (alive && json.same && json.watchers !== undefined) setWatching({ count: json.watchers, names: json.watcherNames ?? [] });
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

  // 서버에서 받은 변화 → 소리 · 윷가락 · 잡기 · 업기 · 골인 · 결과
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    setSelected(null);
    setRi(0);
    if (!view.myTurn || view.state?.phase !== "throw") setGauge(null);
    if (before.status === "waiting" && view.status === "playing") {
      fightSound();
      setCallout({ text: "윷놀이 시작!", color: "#ffcf4a", key: view.version });
    }
    const s = view.state;
    const b = before.state;
    if (s?.lastThrow && s.lastThrow.at !== b?.lastThrow?.at) {
      yutThrowSound();
      setThrowShow({ ...s.lastThrow, key: s.lastThrow.at });
    }
    if (s?.event && s.event.at !== b?.event?.at) {
      const e = s.event;
      const color = TEAM_COLOR[e.team];
      const path = e.path ?? [];
      if (path.length && e.moved?.length) setAnim({ key: e.at, team: e.team, moved: e.moved, path });
      // 한 칸씩 걸어가는 소리 · 도착하면 잡기 · 업기 · 골인
      const stepMs = view.mode >= 2 ? 140 : 210;
      path.slice(0, -1).forEach((_, i) => window.setTimeout(() => stoneClick(), i * stepMs));
      const arrive = Math.max(0, path.length - 1) * stepMs + 60;
      window.setTimeout(() => {
        if (e.type === "capture") {
          cutInSound();
          setHit({ node: e.to, key: e.at });
          setShake(true);
          setCallout({ text: `${TEAM_NAME[e.team]} 잡았다! 한 번 더!`, color, key: e.at });
        } else if (e.type === "stack") {
          stoneClick();
          setCallout({ text: `업었다! ×${e.count}`, color, key: e.at });
        } else if (e.type === "finish") {
          bellSound();
          setCallout({ text: e.count > 1 ? `${e.count}개 골인!` : "골인!", color, key: e.at });
        } else if (e.type === "skip") {
          setCallout({ text: e.nak ? "낙! 윷이 판 밖으로 · 차례 넘김" : "움직일 말이 없어요 · 차례 넘김", color: "#d6cdee", key: e.at });
        } else stoneClick();
      }, e.type === "skip" ? 900 : arrive);
    }
    if (before.status !== "done" && view.status === "done" && view.endReason === "finish") {
      resultSound(Boolean(view.mySeat && view.winner === view.mySeat.team));
      const t = window.setTimeout(() => setShowResult(true), 1800);
      return () => window.clearTimeout(t);
    }
    if (view.status === "done" && before.status !== "done") setShowResult(true);
    const meNow = view.seats.find((x) => x.me);
    const meBefore = before.seats.find((x) => x.me);
    if (meNow?.ready && !meBefore?.ready) readySound();
  }, [view]);
  useEffect(() => {
    if (!throwShow) return;
    const t = window.setTimeout(() => setThrowShow(null), fast ? 1200 : 1800);
    return () => window.clearTimeout(t);
  }, [throwShow, fast]);
  useEffect(() => {
    if (!callout) return;
    const t = window.setTimeout(() => setCallout(null), 1400);
    return () => window.clearTimeout(t);
  }, [callout]);
  useEffect(() => {
    if (!hit) return;
    const t = window.setTimeout(() => {
      setHit(null);
      setShake(false);
    }, 950);
    return () => window.clearTimeout(t);
  }, [hit]);
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
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/games/yut/${view.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const json = (await res.json()) as Json;
      if (json.code === "NO_YOKAI") {
        router.push(`/yokai?next=${encodeURIComponent(`/games/yut/${view.id}`)}`);
        return;
      }
      if (json.view) receive(json.view);
      if (res.ok && action === "rematch" && json.view?.nextId) router.push(`/games/yut/${json.view.nextId}`);
      if (res.ok && action === "exit") router.push("/games/yut");
      if (!res.ok) {
        setNote(json.error ?? "처리하지 못했어요.");
        if (res.status === 409) {
          const fresh = (await fetch(`/api/games/yut/${view.id}`, { cache: "no-store" }).then((r) => r.json())) as Json;
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

  const s = view.state;
  const waiting = view.status === "waiting";
  const playing = view.status === "playing";
  const myTeam = view.mySeat?.team ?? null;
  const myTurn = view.myTurn && Boolean(s);
  const faces = useMemo(() => {
    const out: Record<Team, ({ species: YokaiSpecies; stage: number } | null)[]> = { A: [], B: [] };
    for (const seat of [...view.seats].sort((a, b) => a.idx - b.idx)) out[seat.team].push(seat.player?.yokai ?? null);
    return out;
  }, [view.seats]);
  const names = useMemo(() => {
    const out: Record<Team, string[]> = { A: [], B: [] };
    for (const seat of [...view.seats].sort((a, b) => a.idx - b.idx)) out[seat.team].push(seat.player?.nickname ?? "");
    return out;
  }, [view.seats]);
  const canThrow = myTurn && s?.phase === "throw";
  const curValue = s && myTurn && s.phase === "move" ? s.results[Math.min(ri, s.results.length - 1)] : undefined;
  const movable = useMemo(() => (s && myTurn && curValue !== undefined ? movablePieces(s, s.turnTeam, curValue) : []), [s, myTurn, curValue]);
  const selPiece = selected !== null && s ? s.pieces[s.turnTeam][selected] : null;
  const ghost = selPiece && curValue !== undefined ? dest(selPiece.pos, curValue) : null;
  const left = playing && view.turnAt ? Math.max(0, view.turnMs - (now + offset - view.turnAt)) : 0;
  const curSeat = view.turnSeat ? view.seats.find((x) => x.team === view.turnSeat!.team && x.idx === view.turnSeat!.idx) : null;

  // 내 차례 남은 3초 · 삑
  useEffect(() => {
    if (!myTurn || left <= 0 || left > 3000) return;
    const sec = Math.ceil(left / 1000);
    if (lastBeep.current === sec + (view.turnAt ?? 0)) return;
    lastBeep.current = sec + (view.turnAt ?? 0);
    warnBeep();
  }, [myTurn, left, view.turnAt]);

  function pickPiece(i: number) {
    if (!s) return;
    const pos = s.pieces[s.turnTeam][i]?.pos;
    const rep = movable.find((m) => s.pieces[s.turnTeam][m].pos === pos);
    if (rep === undefined) return;
    if (selected === rep) void act("move", { ri, pi: rep });
    else setSelected(rep);
  }
  const startRep = s ? movable.find((m) => s.pieces[s.turnTeam][m].pos === START) : undefined;

  const emoteOn = (seat: YutSeatView) => view.emote && view.emote.seat === `${seat.team}${seat.idx}` && now + offset - view.emote.at < 4000;
  const seatChip = (seat: YutSeatView) => {
    const turn = playing && view.turnSeat?.team === seat.team && view.turnSeat.idx === seat.idx;
    return (
      <li key={`${seat.team}${seat.idx}`} data-yut-seat={`${seat.team}${seat.idx}`} className={cn("relative flex min-h-12 min-w-0 items-center gap-2 rounded-xl border-2 bg-black/35 px-2 py-1", turn ? "border-[#ffcf4a] bg-[#ffcf4a]/10" : "border-transparent")}>
        {emoteOn(seat) ? (
          <span key={view.emote!.at} className="plate-emote absolute -top-12 left-1 z-20">
            <EmoteArt e={view.emote!.e} className="size-12 drop-shadow-[0_3px_0_#0a0614]" />
          </span>
        ) : null}
        <YokaiToken face={seat.player?.yokai ?? null} team={seat.team} className={cn("size-9 shrink-0", turn && "arcade-bob")} />
        <span className="grid min-w-0 leading-tight">
          <b className={cn("truncate text-sm font-black", seat.me ? "text-[#ffcf4a]" : "text-white")}>{seat.player?.nickname ?? "빈자리"}</b>
          {seat.player && !seat.bot ? (
            <span className="flex max-w-full gap-1 overflow-hidden empty:hidden">
              <PotTitleBadge nickname={seat.player.nickname} max={1} yokai={false} className="!text-[10px]" />
            </span>
          ) : null}
          <span className="text-[11px] font-bold text-[#d6cdee]">{seat.left ? "🤖 나감 · AI 대신" : seat.bot ? "🤖 요괴봇" : seat.me ? "나" : turn ? "차례!" : ""}</span>
        </span>
        {turn ? (
          <span className="absolute inset-x-1 bottom-0.5 h-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-[#ffcf4a] transition-[width] duration-200" style={{ width: `${(left / view.turnMs) * 100}%` }} />
          </span>
        ) : null}
      </li>
    );
  };

  const tray = (team: Team) => {
    if (!s) return null;
    const list = s.pieces[team];
    const home = list.map((p, i) => ({ p, i })).filter((x) => x.p.pos === START);
    const goal = list.filter((p) => p.pos === END).length;
    const canStart = myTurn && team === s.turnTeam && startRep !== undefined;
    return (
      <div data-yut-tray={team} className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: `${TEAM_COLOR[team]}1f`, border: `2px solid ${TEAM_COLOR[team]}66` }}>
        <b className="text-sm font-black" style={{ color: TEAM_COLOR[team] }}>
          {TEAM_NAME[team]}
        </b>
        <span className="text-xs font-bold text-[#d6cdee]">대기</span>
        {home.map(({ i }) => (
          <button
            key={i}
            type="button"
            data-yut-home={`${team}${i}`}
            disabled={!canStart}
            onClick={() => startRep !== undefined && pickPiece(startRep)}
            className={cn("rounded-full", canStart && "cursor-pointer", canStart && selected === startRep && "scale-110")}
            aria-label={`${TEAM_NAME[team]} 대기 말 내보내기`}
          >
            <span className="grid justify-items-center gap-0.5">
              <YokaiToken face={pieceFace(faces, team, i)} team={team} className={cn("size-9", canStart && "yut-target")} />
              <NameTag name={pieceName(names, team, i)} team={team} />
            </span>
          </button>
        ))}
        {!home.length ? <span className="text-xs text-[#d6cdee]">없음</span> : null}
        <span className="ml-auto text-sm font-black text-[#ffe08a]">
          골인 {"★".repeat(goal)}
          <span className="text-white/25">{"☆".repeat(list.length - goal)}</span>
        </span>
      </div>
    );
  };

  const resultLine = s && s.results.length ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {s.results.map((v, i) => (
        <button
          key={`${i}-${v}`}
          type="button"
          data-yut-result={v}
          disabled={!myTurn || s.phase !== "move"}
          onClick={() => {
            setRi(i);
            setSelected(null);
          }}
          className={cn("min-h-10 rounded-xl border-2 px-3 text-base font-black", myTurn && s.phase === "move" && i === Math.min(ri, s.results.length - 1) ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]" : "border-white/20 bg-black/40 text-white")}
        >
          {yutName(v)}
          <span className="ml-1 text-xs opacity-70">{v < 0 ? "-1" : `+${v}`}</span>
        </button>
      ))}
    </div>
  ) : null;

  const won = view.status === "done" && view.mySeat && view.winner === view.mySeat.team;
  const humans = view.seats.filter((x) => x.player && !x.bot).length;

  return (
    <div className="grid gap-3">
      <h1 data-yut-title className="flex items-center justify-center gap-2 truncate rounded-2xl border-2 border-[#ffcf4a]/60 bg-[#1a0f2e] px-3 py-2 text-center text-lg font-black text-[#ffe08a]">
        🎲 <span className="truncate">{view.title}</span>
      </h1>
      {/* 머리 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="arcade-px neon-gold text-sm">YUT</span>
        <span className="g-chip !text-white">{view.mode}:{view.mode}</span>
        {view.code ? (
          <button type="button" data-yut-code onClick={() => copy(view.code!, "code")} className="g-chip arcade-px !text-[#ffcf4a]">
            {view.code} {copied === "code" ? "✓" : "⧉"}
          </button>
        ) : null}
        {view.isPrivate ? <span className="g-chip">🔒 비공개</span> : null}
        {view.withBots ? <span className="g-chip">🤖 봇 포함 · 전적 없음</span> : null}
        <button
          type="button"
          onClick={() => {
            setOmokSound(!sound);
            setSound(!sound);
          }}
          className="arcade-btn btn-dark ml-auto !min-h-10 px-3 text-sm"
        >
          {sound ? "🔊" : "🔇"}
        </button>
        {view.mySeat && view.status !== "done" ? (
          <button type="button" data-yut-exit onClick={() => setConfirmExit(true)} className="arcade-btn btn-main !min-h-10 px-3 text-sm">
            나가기
          </button>
        ) : (
          <Link href="/games/yut" className="arcade-btn btn-dark grid !min-h-10 place-items-center px-3 text-sm">
            로비로
          </Link>
        )}
      </div>

      {note ? (
        <p role="alert" className="rounded-xl bg-[#ff5d6c]/15 px-3 py-2 text-sm font-bold text-[#ff8f9a]">
          {note}
        </p>
      ) : null}

      {/* ───── 대기실 ───── */}
      {waiting ? (
        <section data-yut-waiting className="arcade-panel grid gap-4 p-4">
          <div className="grid justify-items-center gap-1 text-center">
            <p className="text-sm font-bold text-[#d6cdee]">초대 코드</p>
            <p className="arcade-px neon-gold text-3xl tracking-[0.3em]">{view.code}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => copy(shareUrl, "link")} className="arcade-btn btn-gold !min-h-11 px-4 text-sm">
                {copied === "link" ? "✓ 링크 복사됨" : "🔗 초대 링크 복사"}
              </button>
              <button type="button" onClick={() => copy(view.code ?? "", "code2")} className="arcade-btn btn-dark !min-h-11 px-4 text-sm">
                {copied === "code2" ? "✓ 복사됨" : "코드 복사"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((team) => (
              <div key={team} data-yut-team={team} className="grid content-start gap-2 rounded-2xl p-3" style={{ background: `${TEAM_COLOR[team]}1a`, border: `2px solid ${TEAM_COLOR[team]}80` }}>
                <b className="text-xl font-black" style={{ color: TEAM_COLOR[team] }}>
                  {TEAM_NAME[team]}
                </b>
                <ul className="grid gap-2">
                  {view.seats
                    .filter((x) => x.team === team)
                    .map((seat) => (
                      <li key={seat.idx} data-yut-slot={`${team}${seat.idx}`} className="flex min-h-14 items-center gap-2 rounded-xl bg-black/35 px-2">
                        {seat.player ? (
                          <>
                            <YokaiToken face={seat.player.yokai} team={team} className="size-10 shrink-0" />
                            <b className={cn("min-w-0 flex-1 truncate text-base font-black", seat.me ? "text-[#ffcf4a]" : "text-white")}>
                              {seat.player.nickname}
                              {seat.host ? " 👑" : ""}
                              <span className="ml-1 inline-flex align-middle empty:hidden">
                                <PotTitleBadge nickname={seat.player.nickname} max={1} yokai={false} className="!text-[10px]" />
                              </span>
                            </b>
                            {seat.host ? null : seat.ready ? (
                              <span className="rounded-md bg-[#3ddc97] px-2 py-0.5 text-xs font-black text-[#062a1b]">READY</span>
                            ) : (
                              <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold text-[#d6cdee]">준비 중</span>
                            )}
                            {view.isHost && !seat.me ? (
                              <button type="button" data-yut-kick onClick={() => act("kick", { target: `${team}${seat.idx}` })} disabled={busy} aria-label={`${seat.player.nickname} 내보내기`} className="grid size-9 place-items-center rounded-lg bg-white/10 text-sm font-black text-[#ff8f9a]">
                                ✕
                              </button>
                            ) : null}
                          </>
                        ) : loggedIn && hasYokai ? (
                          <button type="button" data-yut-sit={`${team}${seat.idx}`} disabled={busy} onClick={() => act("sit", { team, idx: seat.idx })} className="flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-dashed font-black" style={{ borderColor: `${TEAM_COLOR[team]}aa`, color: TEAM_COLOR[team] }}>
                            ＋ {view.mySeat ? "이 자리로 옮기기" : "여기 앉기"}
                          </button>
                        ) : (
                          <span className="w-full text-center text-sm text-[#d6cdee]">빈자리</span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>

          {!loggedIn ? (
            <Link href={`/login?next=${encodeURIComponent(`/games/yut/${view.id}`)}`} className="arcade-btn btn-main grid min-h-14 place-items-center text-lg">
              로그인하고 앉기
            </Link>
          ) : !hasYokai ? (
            <Link href={`/yokai?next=${encodeURIComponent(`/games/yut/${view.id}`)}`} className="arcade-btn btn-gold grid min-h-14 place-items-center text-lg">
              함께할 요괴 고르러 가기
            </Link>
          ) : null}

          {view.mySeat && !view.isHost ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                data-yut-ready
                disabled={busy}
                onClick={() => act("ready", { ready: !view.seats.find((x) => x.me)?.ready })}
                className={cn("arcade-btn min-h-14 text-xl", view.seats.find((x) => x.me)?.ready ? "btn-dark" : "btn-green")}
              >
                {view.seats.find((x) => x.me)?.ready ? "준비 취소" : "READY!"}
              </button>
              <button type="button" disabled={busy} onClick={() => act("leave")} className="arcade-btn btn-dark min-h-14 text-base">
                자리에서 일어나기
              </button>
            </div>
          ) : null}

          {view.isHost ? (
            <div data-yut-host className="grid gap-3 border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">인원</span>
                {[1, 2, 3, 4].map((m) => (
                  <button key={m} type="button" data-yut-mode={m} disabled={busy || m === view.mode} onClick={() => act("mode", { mode: m })} className={cn("min-h-10 rounded-xl border-2 px-3 text-sm font-black", m === view.mode ? "border-[#ffcf4a] bg-[#ffcf4a] text-[#2a1400]" : "border-white/20 bg-black/40 text-white")}>
                    {m}:{m}
                  </button>
                ))}
                <button type="button" data-yut-shuffle disabled={busy || humans < 2} onClick={() => act("shuffle")} className="arcade-btn btn-dark ml-auto !min-h-10 px-3 text-sm">
                  🔀 팀 섞기
                </button>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-black/30 px-3 text-sm font-bold text-white">
                <input type="checkbox" data-yut-bots checked={bots} onChange={(e) => setBots(e.target.checked)} className="size-5 accent-[#b77bff]" />
                🤖 빈자리는 요괴봇으로 <span className="font-normal text-[#d6cdee]">— 봇이 끼면 전적 · 보상 없어요</span>
              </label>
              <button type="button" data-yut-start disabled={busy} onClick={() => act("start", { bots })} className="arcade-btn btn-main min-h-16 text-2xl">
                ▶ 게임 시작
              </button>
              <p className="text-center text-xs text-[#d6cdee]">모든 자리가 차고 모두 READY면 시작할 수 있어요. 혼자서는 못 하고, 홍팀 · 청팀에 사람이 한 명 이상씩 있어야 해요.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ───── 판 ───── */}
      {!waiting && s ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["A", "B"] as const).map((team) => (
              <div key={team} className="grid gap-1">
                <b className="text-sm font-black" style={{ color: TEAM_COLOR[team] }}>
                  {TEAM_NAME[team]}
                  {myTeam === team ? " (우리 팀)" : ""}
                  {view.status === "done" && view.winner === team ? " 🏆" : ""}
                </b>
                <ul className="grid grid-cols-2 gap-1.5">{view.seats.filter((x) => x.team === team).map(seatChip)}</ul>
              </div>
            ))}
          </div>

          <CheerStrip count={watching.count} names={watching.names} cheers={view.cheers} now={now + offset} me={!view.mySeat} />

          <div className="relative">
            <YutBoard state={s} faces={faces} names={names} anim={anim} fast={fast} movable={movable} selected={selected} ghost={ghost} onPiece={pickPiece} onGhost={() => selected !== null && act("move", { ri, pi: selected })} hit={hit} shake={shake} />
            {throwShow ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-2 rounded-2xl bg-[#0a0614]/80 px-6 py-4">
                <YutSticks sticks={throwShow.sticks} k={throwShow.key} fast={fast} power={throwShow.power} nak={throwShow.value === 0} />
                {throwShow.power !== undefined ? (
                  <span className="text-xs font-black text-[#d6cdee]">{throwShow.power >= 75 ? "💪 세게!" : throwShow.power <= 30 ? "🍃 살살~" : "👌 적당히"}</span>
                ) : null}
                <b data-yut-throw-name className="arcade-kr arcade-pop text-4xl" style={{ color: throwShow.value === 0 ? "#d6cdee" : TEAM_COLOR[throwShow.team], animationDelay: fast ? "0.35s" : "0.6s" }}>
                  {yutName(throwShow.value)}!
                </b>
              </div>
            ) : callout ? (
              <b key={callout.key} data-yut-callout className="yut-callout pointer-events-none absolute left-1/2 top-1/2 z-40 whitespace-nowrap rounded-2xl bg-[#0a0614]/85 px-5 py-3 text-2xl font-black" style={{ color: callout.color }}>
                {callout.text}
              </b>
            ) : null}
          </div>

          <div className="grid gap-2">
            {tray("A")}
            {tray("B")}
          </div>

          {/* 내 차례 · 남의 차례 */}
          {playing ? (
            <section data-yut-action className="arcade-panel grid gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-base font-black" style={{ color: TEAM_COLOR[s.turnTeam] }}>
                  {myTurn ? "🎯 내 차례!" : `${curSeat?.player?.nickname ?? "?"}의 차례`}
                </b>
                <span className="text-sm text-[#d6cdee]">
                  ({TEAM_NAME[s.turnTeam]} · {s.phase === "throw" ? "던지기" : "말 고르기"})
                </span>
                <span className={cn("ml-auto rounded-lg px-2 py-0.5 text-base font-black", left < 3000 ? "bg-[#ff5d6c] text-white" : "bg-black/40 text-white")}>{Math.ceil(left / 1000)}초</span>
              </div>
              {resultLine}
              {canThrow && gauge ? (
                <div className="grid gap-2">
                  <div data-yut-gauge className="relative h-7 overflow-hidden rounded-full border-2 border-white/30 bg-black/50">
                    <span className="yut-gauge-fill absolute inset-y-0 left-0" style={{ width: `${gauge.power}%` }} />
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
                    onClick={() => {
                      const power = gauge.power;
                      setGauge(null);
                      void act("throw", { power });
                    }}
                    className="arcade-btn btn-main min-h-16 text-2xl"
                  >
                    🎯 지금 던져! ({gauge.power})
                  </button>
                </div>
              ) : canThrow ? (
                <button type="button" data-yut-throw disabled={busy} onClick={() => setGauge({ start: performance.now(), power: 0 })} className="arcade-btn btn-gold min-h-16 text-2xl">
                  🎲 윷 던지기!
                  <span className="block text-sm">누른 뒤 게이지로 세기를 골라요</span>
                </button>
              ) : null}
              {myTurn && s.phase === "move" ? (
                <div className="grid gap-2">
                  <p className="text-sm font-bold text-[#ffe08a]">
                    {selected === null
                      ? `「${yutName(curValue ?? 0)}」로 옮길 말을 눌러 주세요 (반짝이는 말 · 대기 말)`
                      : ghost === END
                        ? "골인시킬까요? 「여기」나 아래 버튼을 눌러요"
                        : "노란 「여기」로 가요. 한 번 더 누르거나 아래 버튼"}
                  </p>
                  {selected !== null ? (
                    <button type="button" data-yut-move disabled={busy} onClick={() => act("move", { ri, pi: selected })} className="arcade-btn btn-green min-h-14 text-xl">
                      ✅ {ghost === END ? "골인!" : "여기로 이동"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {!myTurn ? <p className="text-sm text-[#d6cdee]">시간이 지나면 요괴 AI가 대신 던지고 옮겨요.</p> : null}
            </section>
          ) : null}

          {/* 이모티콘 · 응원 */}
          {loggedIn && view.status !== "done" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-black text-[#d6cdee]">{view.mySeat ? "이모티콘" : "응원"}</span>
              {ONI_EMOTES.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  data-yut-emote={e.key}
                  disabled={now < emoteWait}
                  onClick={() => {
                    setEmoteWait(Date.now() + 2500);
                    void act(view.mySeat ? "emote" : "cheer", { e: e.key });
                  }}
                  className="grid size-12 place-items-center rounded-xl bg-black/35 hover:bg-white/10 disabled:opacity-40"
                  aria-label={e.label}
                >
                  <EmoteArt e={e.key} className="size-10" />
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {/* 결과 */}
      {view.status === "done" && showResult ? (
        <div data-yut-result-overlay className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="arcade-panel arcade-pop grid w-full max-w-sm justify-items-center gap-3 p-5 text-center">
            {view.endReason === "finish" && view.winner ? (
              <>
                <p className="arcade-px neon-gold text-xl">{view.mySeat ? (won ? "YOU WIN!" : "YOU LOSE") : "GAME SET"}</p>
                <b className="arcade-kr text-3xl" style={{ color: TEAM_COLOR[view.winner] }}>
                  {TEAM_NAME[view.winner]} 승리!
                </b>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {view.seats
                    .filter((x) => x.team === view.winner)
                    .map((x) => (
                      <span key={x.idx} className="flex items-center gap-1 rounded-full bg-black/40 py-0.5 pl-0.5 pr-2 text-sm font-bold text-white">
                        <YokaiToken face={x.player?.yokai ?? null} team={x.team} className="size-7" />
                        {x.player?.nickname}
                      </span>
                    ))}
                </div>
                {won && !view.withBots ? (
                  <p data-yut-reward className="rounded-xl bg-[#ffcf4a]/15 px-3 py-1.5 text-sm font-black text-[#ffcf4a]">
                    🎁 +{WIN_REWARD.points}P · EXP {WIN_REWARD.exp} · 요괴 친밀도 +{WIN_REWARD.affection}
                    <span className="block text-xs font-bold text-[#d6cdee]">(하루 {WIN_REWARD.perDay}판 · 같은 멤버끼리 {WIN_REWARD.perOpponentPerDay}판 · 짧은 판 제외)</span>
                  </p>
                ) : view.withBots ? (
                  <p className="text-sm text-[#d6cdee]">요괴봇이 낀 판이라 전적 · 보상은 없어요.</p>
                ) : null}
              </>
            ) : (
              <b className="arcade-kr text-2xl text-white">닫힌 방이에요</b>
            )}
            <div className="grid w-full gap-2">
              {view.nextId ? (
                <Link href={`/games/yut/${view.nextId}`} className="arcade-btn btn-main grid min-h-14 place-items-center text-lg">
                  다음 판 대기실로 ›
                </Link>
              ) : view.mySeat && view.endReason === "finish" ? (
                <button type="button" data-yut-rematch disabled={busy} onClick={() => act("rematch")} className="arcade-btn btn-main min-h-14 text-lg">
                  🔁 같은 멤버로 한 판 더
                </button>
              ) : null}
              <button type="button" onClick={() => setShowResult(false)} className="arcade-btn btn-dark min-h-12 text-base">
                판 다시 보기
              </button>
              <Link href="/games/yut" className="arcade-btn btn-dark grid min-h-12 place-items-center text-base">
                로비로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {confirmExit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="arcade-panel grid w-full max-w-xs gap-3 p-5 text-center">
            <b className="text-lg font-black text-white">{waiting ? (view.isHost ? "방을 닫고 나갈까요?" : "방에서 나갈까요?") : "판에서 나갈까요?"}</b>
            {playing ? <p className="text-sm text-[#d6cdee]">내 자리는 요괴 AI가 이어서 해요. 이 판 결과는 그대로 기록돼요.</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmExit(false)} className="arcade-btn btn-dark min-h-12">
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
