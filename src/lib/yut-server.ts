import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { roomTitle } from "@/lib/game-room";
import { todayKstDate } from "@/lib/dates";
import { profileYokai } from "@/lib/yokai-server";
import { YOKAI_ORDER, type YokaiSpecies } from "@/lib/yokai";
import { isOniEmote } from "@/lib/omok-emotes";
import { WIN_REWARD } from "@/lib/game-config";
import { MIN_COUNTED_MOVES } from "@/lib/game-stats";
import { applyMove, applyThrow, autoStep, newState, other, type Team, type YutState } from "@/lib/yut";

/**
 * 요괴 윷놀이 방(1:1 ~ 4:4): 6자리 초대 코드 · 링크 → 대기실에서 A/B팀 자리 고르기 · 팀 섞기 · 레디 → 방장이 시작.
 * 차례: A팀 1번 → B팀 1번 → A팀 2번 …(팀원이 팀 말을 함께 씀). 한 동작 제한 시간 10초,
 * 넘기면 요괴 AI가 대신 던지고 움직임. 나간 사람 · 요괴 봇 자리도 AI가 이어서 둠(게임이 멈추지 않게).
 * 화면은 1초마다 version만 물어보고, 바뀌면 전체를 받음 — 시간이 된 AI 동작은 그때 서버가 처리.
 */
export const YUT_MODES = [1, 2, 3, 4] as const;
export type YutMode = (typeof YUT_MODES)[number];
export const isYutMode = (v: unknown): v is YutMode => v === 1 || v === 2 || v === 3 || v === 4;
/** 한 동작 제한 시간(10초) */
export const TURN_MS = 10_000;
/** 팀 말 수(다인전은 3개로 빠르게) */
export const piecesFor = (mode: number) => (mode >= 3 ? 3 : 4);
/** 요괴 봇 · 나간 사람 동작 간격(다인전은 2배속) */
const botMs = (mode: number) => (mode >= 2 ? 1000 : 1400);
const ABSENT_MS = 15_000;
const HOST_AWAY_MS = 90_000;
const SEAT_AWAY_MS = 60_000;
const WAIT_MS = 60 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const YUT_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
export const NO_YOKAI = "NO_YOKAI";

export type Seat = { team: Team; idx: number; userId: string | null; ready: boolean; bot?: boolean; left?: boolean; botYokai?: YokaiSpecies };
type Row = NonNullable<Awaited<ReturnType<typeof prisma.yutGame.findUnique>>>;
type Cheer = { n: string; e: string; at: number };

const seatsOf = (row: { seatsJson: string }): Seat[] => {
  try {
    const v = JSON.parse(row.seatsJson);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const stateOf = (row: { stateJson: string }): YutState | null => {
  try {
    return row.stateJson ? (JSON.parse(row.stateJson) as YutState) : null;
  } catch {
    return null;
  }
};
const kickedOf = (row: { kickedJson: string }): string[] => {
  try {
    const v = row.kickedJson ? JSON.parse(row.kickedJson) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
function emoteOf(row: { emoteJson: string }): { last: { seat: string; e: string; at: number } | null; cheers: Cheer[] } {
  try {
    const v = row.emoteJson ? JSON.parse(row.emoteJson) : null;
    return { last: v?.last ?? null, cheers: Array.isArray(v?.cheers) ? v.cheers : [] };
  } catch {
    return { last: null, cheers: [] };
  }
}

function emptySeats(mode: number): Seat[] {
  const out: Seat[] = [];
  for (const team of ["A", "B"] as const) for (let i = 0; i < mode; i += 1) out.push({ team, idx: i, userId: null, ready: false });
  return out;
}

export function gamesOpenYut(user: { isMaster?: boolean | null } | null | undefined) {
  return Boolean(user?.isMaster) || process.env.GAMES_PUBLIC !== "0";
}

async function hasYokai(userId: string) {
  return Boolean(await profileYokai(userId).catch(() => null));
}

/** 지금 차례인 자리 */
export function currentSeat(seats: Seat[], s: YutState): Seat | null {
  const team = seats.filter((x) => x.team === s.turnTeam).sort((a, b) => a.idx - b.idx);
  if (!team.length) return null;
  return team[s.turnIdx[s.turnTeam] % team.length];
}

async function makeRoom(data: { hostId: string; mode: number; seatsJson: string; isPrivate: boolean; title?: string }) {
  for (let i = 0; i < 8; i += 1) {
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const made = await prisma.yutGame.create({ data: { ...data, code }, select: { id: true } }).catch(() => null);
    if (made) return made;
  }
  throw new Error("방을 만들지 못했어요.");
}

/** 방 만들기(방장은 A팀 1번 자리) · 이미 기다리는 내 방이 있으면 그 방 */
export async function createYut(hostId: string, mode: YutMode, isPrivate: boolean, title = ""): Promise<{ id: string } | { error: string }> {
  if (!(await hasYokai(hostId))) return { error: NO_YOKAI };
  const open = await prisma.yutGame.findFirst({ where: { hostId, status: "waiting", updatedAt: { gte: new Date(Date.now() - WAIT_MS) } }, select: { id: true } });
  if (open) await prisma.yutGame.update({ where: { id: open.id }, data: { status: "done", endReason: "cancel", version: { increment: 1 } } }).catch(() => undefined);
  const seats = emptySeats(mode);
  seats[0].userId = hostId;
  return makeRoom({ hostId, mode, seatsJson: JSON.stringify(seats), isPrivate, title });
}

export async function yutRoomByCode(code: string) {
  const c = code.trim().toUpperCase();
  if (!YUT_CODE_RE.test(c)) return null;
  return prisma.yutGame.findUnique({ where: { code: c }, select: { id: true, status: true } }).catch(() => null);
}

/* ───────── 끝난 판: 전적 · 보상 ───────── */

async function recordYut(row: Row, s: YutState) {
  if (row.withBots || !s.winner || s.movesMade < MIN_COUNTED_MOVES.yut) return;
  const seats = seatsOf(row).filter((x) => x.userId && !x.bot);
  // 같은 사람들끼리 반복은 보상 하루 2판(서로 져 주기 막기)
  const roster = createHash("sha1").update(seats.map((x) => x.userId).sort().join(",")).digest("hex").slice(0, 10);
  const made = await prisma.gameResult
    .createMany({
      data: seats.map((x) => ({
        game: "yut",
        gameId: `${row.id}:${x.userId}`,
        playerAId: x.userId!,
        playerBId: `team:${x.team}`,
        winnerId: x.team === s.winner ? x.userId : null,
        loserId: x.team === s.winner ? null : x.userId,
        draw: false,
        reason: `${row.endReason}#${roster}`,
        moves: s.movesMade,
      })),
      skipDuplicates: true,
    })
    .catch(() => ({ count: 0 }));
  if (!made.count || process.env.GAME_REWARDS === "0") return;
  const since = new Date(`${todayKstDate()}T00:00:00+09:00`);
  const { grantRewards } = await import("@/lib/exp");
  const { addMainAffection } = await import("@/lib/yokai-server");
  for (const x of seats) {
    if (x.team !== s.winner || !x.userId) continue;
    const [today, sameRoster] = await Promise.all([
      prisma.gameResult.count({ where: { game: "yut", winnerId: x.userId, createdAt: { gte: since } } }),
      prisma.gameResult.count({ where: { game: "yut", winnerId: x.userId, createdAt: { gte: since }, reason: { endsWith: `#${roster}` } } }),
    ]);
    if (today > WIN_REWARD.perDay || sameRoster > WIN_REWARD.perOpponentPerDay) continue;
    await grantRewards(x.userId, WIN_REWARD.exp, WIN_REWARD.points).catch(() => undefined);
    await addMainAffection(x.userId, WIN_REWARD.affection).catch(() => undefined);
  }
}

/* ───────── 볼 때마다: 비어 있는 대기실 정리 · AI 차례 진행 ───────── */

async function lastSeenMap(gameId: string, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await prisma.gameWatch.findMany({ where: { gameId, viewer: { in: ids.map((i) => `p:${i}`) } }, select: { viewer: true, seenAt: true } }).catch(() => []);
  return new Map(rows.map((r) => [r.viewer.slice(2), r.seenAt.getTime()]));
}

async function settle(row: Row): Promise<Row> {
  const now = Date.now();
  const seats = seatsOf(row);
  if (row.status === "waiting") {
    const humans = seats.filter((x) => x.userId).map((x) => x.userId!);
    const seen = await lastSeenMap(row.id, humans);
    if (now - row.createdAt.getTime() > HOST_AWAY_MS && now - Math.max(seen.get(row.hostId) ?? 0, row.createdAt.getTime()) > HOST_AWAY_MS) {
      await prisma.yutGame.updateMany({ where: { id: row.id, status: "waiting" }, data: { status: "done", endReason: "cancel", version: { increment: 1 } } });
      return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
    }
    const gone = seats.filter((x) => x.userId && x.userId !== row.hostId && now - Math.max(seen.get(x.userId) ?? 0, row.updatedAt.getTime()) > SEAT_AWAY_MS);
    if (gone.length) {
      const next = seats.map((x) => (gone.includes(x) ? { ...x, userId: null, ready: false } : x));
      await prisma.yutGame.updateMany({ where: { id: row.id, version: row.version }, data: { seatsJson: JSON.stringify(next), version: { increment: 1 } } });
      return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
    }
    return row;
  }
  if (row.status !== "playing") return row;
  const s = stateOf(row);
  if (!s) return row;
  const seat = currentSeat(seats, s);
  const since = now - (row.turnAt?.getTime() ?? now);
  let due = since > TURN_MS + 800;
  if (seat && (seat.bot || seat.left || !seat.userId) && since > botMs(row.mode)) due = true;
  if (!due && seat?.userId && since > 1500) {
    const seen = await lastSeenMap(row.id, [seat.userId]);
    if (now - (seen.get(seat.userId) ?? 0) > ABSENT_MS) due = true;
  }
  if (!due) return row;
  const next = autoStep(s, Math.random, now);
  return saveState(row, next, now, { auto: true });
}

/** 상태 저장(이기면 끝내고 전적 · 보상) */
async function saveState(row: Row, s: YutState, now: number, _meta: { auto?: boolean } = {}): Promise<Row> {
  void _meta;
  const done = Boolean(s.winner);
  const saved = await prisma.yutGame.updateMany({
    where: { id: row.id, version: row.version, status: "playing" },
    data: {
      stateJson: JSON.stringify(s),
      turnAt: new Date(now),
      version: { increment: 1 },
      ...(done ? { status: "done", winner: s.winner!, endReason: "finish" } : {}),
    },
  });
  const fresh = (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
  if (saved.count === 1 && done) await recordYut(fresh, s).catch(() => undefined);
  return fresh;
}

/* ───────── 화면에 보낼 모양 ───────── */

export type YutPlayer = { nickname: string; yokai: { species: YokaiSpecies; stage: number } | null };
export type YutSeatView = { team: Team; idx: number; player: YutPlayer | null; ready: boolean; bot: boolean; left: boolean; me: boolean; host: boolean };
export type YutView = {
  id: string;
  code: string | null;
  /** 방 제목(비면 「방장의 방」) */
  title: string;
  mode: number;
  status: "waiting" | "playing" | "done";
  isHost: boolean;
  isPrivate: boolean;
  withBots: boolean;
  host: string;
  seats: YutSeatView[];
  mySeat: { team: Team; idx: number } | null;
  state: YutState | null;
  /** 지금 차례 자리 · 내 차례인지 · 남은 시간 계산 */
  turnSeat: { team: Team; idx: number } | null;
  myTurn: boolean;
  turnAt: number | null;
  turnMs: number;
  serverNow: number;
  version: number;
  winner: Team | "";
  endReason: string;
  emote: { seat: string; e: string; at: number } | null;
  cheers: Cheer[];
  nextId: string | null;
  watchers?: number;
  watcherNames?: string[];
};

async function playerOf(userId: string, cache: Map<string, YutPlayer | null>): Promise<YutPlayer | null> {
  if (cache.has(userId)) return cache.get(userId) ?? null;
  const [u, yk] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, withdrawnAt: true } }).catch(() => null),
    profileYokai(userId).catch(() => null),
  ]);
  const p = u ? { nickname: u.withdrawnAt ? "(탈퇴 회원)" : u.nickname, yokai: yk ? { species: yk.species, stage: yk.stage } : null } : null;
  cache.set(userId, p);
  return p;
}

async function toView(row: Row, viewerId: string | null): Promise<YutView> {
  const cache = new Map<string, YutPlayer | null>();
  const seats = seatsOf(row);
  const s = stateOf(row);
  const views: YutSeatView[] = await Promise.all(
    seats.map(async (x) => ({
      team: x.team,
      idx: x.idx,
      player: x.userId ? await playerOf(x.userId, cache) : x.bot ? { nickname: `요괴봇 ${x.team}${x.idx + 1}`, yokai: { species: x.botYokai ?? "dokkaebi", stage: 3 } } : null,
      ready: x.ready || Boolean(x.bot),
      bot: Boolean(x.bot),
      left: Boolean(x.left),
      me: Boolean(viewerId && x.userId === viewerId),
      host: Boolean(x.userId && x.userId === row.hostId),
    })),
  );
  const mine = seats.find((x) => viewerId && x.userId === viewerId);
  const cur = s ? currentSeat(seats, s) : null;
  const host = (await playerOf(row.hostId, cache))?.nickname ?? "?";
  const em = emoteOf(row);
  return {
    id: row.id,
    code: row.code,
    title: roomTitle(row.title, host),
    mode: row.mode,
    status: row.status as YutView["status"],
    isHost: viewerId === row.hostId,
    isPrivate: row.isPrivate,
    withBots: row.withBots,
    host,
    seats: views,
    mySeat: mine ? { team: mine.team, idx: mine.idx } : null,
    state: s,
    turnSeat: cur ? { team: cur.team, idx: cur.idx } : null,
    myTurn: Boolean(row.status === "playing" && cur && viewerId && cur.userId === viewerId && !cur.left),
    turnAt: row.turnAt?.getTime() ?? null,
    turnMs: TURN_MS,
    serverNow: Date.now(),
    version: row.version,
    winner: (row.winner as Team | "") ?? "",
    endReason: row.endReason,
    emote: em.last,
    cheers: em.cheers.filter((c) => Date.now() - c.at < 15_000),
    nextId: row.nextId,
  };
}

async function watchersOf(gameId: string) {
  const rows = await prisma.gameWatch
    .findMany({ where: { gameId, seenAt: { gte: new Date(Date.now() - 15_000) }, NOT: { viewer: { startsWith: "p:" } } }, select: { nickname: true }, take: 60 })
    .catch(() => []);
  return { count: rows.length, names: [...new Set(rows.map((r) => r.nickname).filter((n): n is string => Boolean(n)))] };
}

export async function yutState(id: string, viewerId: string | null, knownVersion?: number, watcher?: string) {
  const found = await prisma.yutGame.findUnique({ where: { id } }).catch(() => null);
  if (!found) return null;
  const row = await settle(found).catch(() => found);
  const seated = seatsOf(row).some((x) => viewerId && x.userId === viewerId);
  if (watcher && /^[a-z0-9]{8,40}$/.test(watcher) && row.status !== "done") {
    const now = new Date();
    if (seated && viewerId) {
      await prisma.gameWatch.upsert({ where: { gameId_viewer: { gameId: id, viewer: `p:${viewerId}` } }, create: { gameId: id, viewer: `p:${viewerId}`, seenAt: now }, update: { seenAt: now } }).catch(() => undefined);
    } else {
      const nickname = viewerId ? ((await prisma.user.findUnique({ where: { id: viewerId }, select: { nickname: true } }).catch(() => null))?.nickname ?? null) : null;
      await prisma.gameWatch.upsert({ where: { gameId_viewer: { gameId: id, viewer: watcher } }, create: { gameId: id, viewer: watcher, seenAt: now, nickname }, update: { seenAt: now, nickname } }).catch(() => undefined);
    }
  }
  const w = row.status !== "done" ? await watchersOf(id) : { count: 0, names: [] };
  if (knownVersion !== undefined && row.version === knownVersion) return { same: true as const, serverNow: Date.now(), watchers: w.count, watcherNames: w.names };
  return { same: false as const, view: { ...(await toView(row, viewerId)), watchers: w.count, watcherNames: w.names } };
}

/* ───────── 동작 ───────── */

export type YutAction = "sit" | "leave" | "ready" | "shuffle" | "mode" | "kick" | "start" | "throw" | "move" | "emote" | "cheer" | "exit" | "rematch";
type ActResult = { ok: true; view: YutView } | { ok: false; error: string; status: number };

export async function yutAct(
  id: string,
  userId: string,
  action: YutAction,
  payload: { team?: unknown; idx?: unknown; ready?: unknown; mode?: unknown; bots?: unknown; ri?: unknown; pi?: unknown; e?: unknown; target?: unknown; power?: unknown },
): Promise<ActResult> {
  const found = await prisma.yutGame.findUnique({ where: { id } });
  if (!found) return { ok: false, error: "방을 찾을 수 없어요.", status: 404 };
  const row = await settle(found).catch(() => found);
  const fail = (error: string, status = 400): ActResult => ({ ok: false, error, status });
  const seats = seatsOf(row);
  const mine = seats.find((x) => x.userId === userId) ?? null;
  const isHost = userId === row.hostId;
  const now = Date.now();
  const done = async () => {
    const fresh = await prisma.yutGame.findUnique({ where: { id } });
    const w = fresh?.status !== "done" ? await watchersOf(id) : { count: 0, names: [] };
    return { ok: true as const, view: { ...(await toView(fresh ?? row, userId)), watchers: w.count, watcherNames: w.names } };
  };
  const saveSeats = async (next: Seat[], extra: Record<string, unknown> = {}) => {
    const r = await prisma.yutGame.updateMany({ where: { id, version: row.version, status: "waiting" }, data: { seatsJson: JSON.stringify(next), version: { increment: 1 }, ...extra } });
    return r.count === 1;
  };

  /* 대기실 */
  if (action === "sit") {
    if (row.status !== "waiting") return fail("이미 시작한 방이에요. 관전만 할 수 있어요.", 409);
    if (kickedOf(row).includes(userId)) return fail("방장이 내보낸 방이라 앉을 수 없어요.", 403);
    if (!(await hasYokai(userId))) return fail(NO_YOKAI, 403);
    const team = payload.team === "B" ? "B" : "A";
    const idx = Number(payload.idx);
    const target = seats.find((x) => x.team === team && x.idx === idx);
    if (!target) return fail("그 자리가 없어요.");
    if (target.userId && target.userId !== userId) return fail("이미 누가 앉은 자리예요.", 409);
    const next = seats.map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x)).map((x) => (x.team === team && x.idx === idx ? { ...x, userId, ready: false } : x));
    if (!(await saveSeats(next))) return fail("자리가 바뀌었어요. 다시 골라 주세요.", 409);
    return done();
  }
  if (action === "leave") {
    if (row.status !== "waiting" || !mine) return fail("대기실에서만 일어날 수 있어요.", 409);
    if (isHost) return fail("방장은 「나가기(방 닫기)」를 눌러 주세요.", 409);
    await saveSeats(seats.map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x)));
    return done();
  }
  if (action === "ready") {
    if (row.status !== "waiting" || !mine) return fail("자리에 앉아야 준비할 수 있어요.", 409);
    await saveSeats(seats.map((x) => (x.userId === userId ? { ...x, ready: payload.ready !== false } : x)));
    return done();
  }
  if (action === "shuffle") {
    if (!isHost || row.status !== "waiting") return fail("방장만 팀을 섞을 수 있어요.", 403);
    const people = seats.filter((x) => x.userId).map((x) => x.userId!);
    for (let i = people.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [people[i], people[j]] = [people[j], people[i]];
    }
    // A · B 번갈아(인원이 고르게)
    const next = emptySeats(row.mode);
    const aSeats = next.filter((x) => x.team === "A");
    const bSeats = next.filter((x) => x.team === "B");
    people.forEach((uid, i) => {
      const list = i % 2 === 0 ? aSeats : bSeats;
      const slot = list[Math.floor(i / 2)];
      if (slot) slot.userId = uid;
    });
    if (!(await saveSeats(next))) return fail("다시 해 주세요.", 409);
    return done();
  }
  if (action === "mode") {
    if (!isHost || row.status !== "waiting") return fail("방장만 바꿀 수 있어요.", 403);
    if (!isYutMode(Number(payload.mode))) return fail("1:1 ~ 4:4 중에서 골라 주세요.");
    const mode = Number(payload.mode) as YutMode;
    const people = seats.filter((x) => x.userId);
    if (people.length > mode * 2) return fail(`지금 ${people.length}명이라 ${mode}:${mode}로는 줄일 수 없어요.`, 409);
    const next = emptySeats(mode);
    // 같은 팀 자리를 최대한 유지, 넘치면 빈자리로
    for (const p of people) {
      const slot = next.find((x) => x.team === p.team && !x.userId && x.idx >= 0) ?? next.find((x) => !x.userId);
      if (slot) slot.userId = p.userId;
    }
    if (!(await saveSeats(next, { mode }))) return fail("다시 해 주세요.", 409);
    return done();
  }
  if (action === "kick") {
    if (!isHost || row.status !== "waiting") return fail("방장만 내보낼 수 있어요.", 403);
    const target = String(payload.target ?? "");
    const t = seats.find((x) => x.userId && `${x.team}${x.idx}` === target);
    if (!t || t.userId === row.hostId) return fail("내보낼 사람을 골라 주세요.");
    const kicked = [...new Set([...kickedOf(row), t.userId!])].slice(-30);
    await saveSeats(
      seats.map((x) => (x === t ? { ...x, userId: null, ready: false } : x)),
      { kickedJson: JSON.stringify(kicked) },
    );
    return done();
  }
  if (action === "start") {
    if (!isHost || row.status !== "waiting") return fail("방장만 시작할 수 있어요.", 403);
    const bots = payload.bots === true;
    const empty = seats.filter((x) => !x.userId);
    if (empty.length && !bots) return fail("빈자리가 있어요. 사람을 더 부르거나 「빈자리 요괴봇」을 켜 주세요.", 409);
    const notReady = seats.filter((x) => x.userId && x.userId !== row.hostId && !x.ready);
    if (notReady.length) return fail(`아직 준비 안 한 사람이 ${notReady.length}명 있어요.`, 409);
    const teamA = seats.filter((x) => x.team === "A" && x.userId).length;
    const teamB = seats.filter((x) => x.team === "B" && x.userId).length;
    // 혼자서는 못 함: 두 팀에 사람이 한 명 이상씩(봇은 빈자리 채우기만)
    if (teamA === 0 || teamB === 0) return fail("홍팀 · 청팀에 사람이 한 명 이상씩 있어야 시작할 수 있어요.", 409);
    const next = seats.map((x) => (x.userId ? { ...x, ready: true } : { ...x, bot: true, ready: true, botYokai: YOKAI_ORDER[randomInt(YOKAI_ORDER.length)] }));
    const first: Team = randomInt(2) === 0 ? "A" : "B";
    const r = await prisma.yutGame.updateMany({
      where: { id, version: row.version, status: "waiting" },
      data: { status: "playing", seatsJson: JSON.stringify(next), stateJson: JSON.stringify(newState(piecesFor(row.mode), first)), withBots: empty.length > 0, turnAt: new Date(now), version: { increment: 1 } },
    });
    if (r.count !== 1) return fail("다시 해 주세요.", 409);
    return done();
  }

  /* 대국 */
  if (action === "throw" || action === "move") {
    if (row.status !== "playing") return fail("진행 중인 판이 아니에요.", 409);
    const s = stateOf(row);
    if (!s) return fail("판 정보를 읽지 못했어요.", 500);
    const cur = currentSeat(seats, s);
    if (!cur || cur.userId !== userId) return fail("지금은 내 차례가 아니에요.", 409);
    if (action === "throw") {
      if (s.phase !== "throw") return fail("먼저 말을 움직여 주세요.", 409);
      const power = Number(payload.power);
      await saveState(row, applyThrow(s, Math.random, now, Number.isFinite(power) ? power : undefined), now);
      return done();
    }
    const r = applyMove(s, Number(payload.ri), Number(payload.pi), now);
    if (!r.ok) return fail(r.error);
    await saveState(row, r.state, now);
    return done();
  }
  if (action === "emote" || action === "cheer") {
    const e = String(payload.e ?? "");
    if (!isOniEmote(e)) return fail("보낼 수 없는 이모티콘이에요.");
    const em = emoteOf(row);
    if (action === "emote") {
      if (!mine) return fail("자리에 앉은 사람만 보낼 수 있어요.", 403);
      await prisma.yutGame.update({ where: { id }, data: { emoteJson: JSON.stringify({ ...em, last: { seat: `${mine.team}${mine.idx}`, e, at: now } }), version: { increment: 1 } } });
      return done();
    }
    if (mine) return fail("자리에 앉은 사람은 이모티콘 버튼을 써 주세요.", 403);
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (!me) return fail("로그인해 주세요.", 401);
    if (em.cheers.some((c) => c.n === me.nickname && now - c.at < 2500)) return done();
    const cheers = [...em.cheers.filter((c) => now - c.at < 15_000), { n: me.nickname, e, at: now }].slice(-8);
    await prisma.yutGame.update({ where: { id }, data: { emoteJson: JSON.stringify({ ...em, cheers }), version: { increment: 1 } } });
    return done();
  }
  if (action === "exit") {
    if (row.status === "waiting") {
      if (isHost) await prisma.yutGame.updateMany({ where: { id, status: "waiting" }, data: { status: "done", endReason: "cancel", version: { increment: 1 } } });
      else if (mine) await saveSeats(seats.map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x)));
    } else if (row.status === "playing" && mine) {
      // 대국 중에 나가면 그 자리는 요괴 AI가 이어서(게임은 계속)
      await prisma.yutGame.updateMany({ where: { id, status: "playing" }, data: { seatsJson: JSON.stringify(seats.map((x) => (x.userId === userId ? { ...x, left: true } : x))), version: { increment: 1 } } });
    }
    await prisma.gameWatch.deleteMany({ where: { gameId: id, viewer: `p:${userId}` } }).catch(() => undefined);
    return done();
  }
  if (action === "rematch") {
    if (row.status !== "done" || !mine) return fail("끝난 판의 참가자만 한 판 더 할 수 있어요.", 409);
    if (row.nextId) return done();
    // 같은 사람 · 같은 팀으로 새 대기실(봇 · 나간 사람 자리는 비움) — 누른 사람이 방장
    const next = seats.map((x) => ({ team: x.team, idx: x.idx, userId: x.bot || x.left ? null : x.userId, ready: false }));
    const made = await makeRoom({ hostId: userId, mode: row.mode, seatsJson: JSON.stringify(next), isPrivate: row.isPrivate, title: row.title });
    const linked = await prisma.yutGame.updateMany({ where: { id, nextId: null }, data: { nextId: made.id, version: { increment: 1 } } });
    if (linked.count !== 1) await prisma.yutGame.delete({ where: { id: made.id } }).catch(() => undefined);
    return done();
  }
  return fail("알 수 없는 요청이에요.");
}

/** 로비: 기다리는 방 · 진행 중 · 최근 5판 */
export async function yutLobby() {
  const waitingRows = await prisma.yutGame.findMany({ where: { status: "waiting", isPrivate: false, updatedAt: { gte: new Date(Date.now() - WAIT_MS) } }, orderBy: { updatedAt: "desc" }, take: 12 });
  const waiting = (await Promise.all(waitingRows.map((r) => settle(r).catch(() => r)))).filter((r) => r.status === "waiting");
  const [live, latest] = await Promise.all([
    prisma.yutGame.findMany({ where: { status: "playing", isPrivate: false, updatedAt: { gte: new Date(Date.now() - 10 * 60_000) } }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.yutGame.findMany({ where: { status: "done", endReason: "finish", isPrivate: false }, orderBy: { updatedAt: "desc" }, take: 5 }),
  ]);
  const cache = new Map<string, YutPlayer | null>();
  const names = async (r: Row, team?: Team) => {
    const list = seatsOf(r).filter((x) => !team || x.team === team);
    return Promise.all(list.map(async (x) => (x.userId ? ((await playerOf(x.userId, cache))?.nickname ?? "?") : x.bot ? "요괴봇" : null))).then((a) => a.filter((n): n is string => Boolean(n)));
  };
  const card = async (r: Row) => ({
    id: r.id,
    code: r.code,
    mode: r.mode,
    host: (await playerOf(r.hostId, cache))?.nickname ?? "?",
    title: roomTitle(r.title, (await playerOf(r.hostId, cache))?.nickname ?? "?"),
    filled: seatsOf(r).filter((x) => x.userId).length,
    total: r.mode * 2,
    teamA: await names(r, "A"),
    teamB: await names(r, "B"),
    winner: r.winner as Team | "",
    withBots: r.withBots,
  });
  return { waiting: await Promise.all(waiting.map(card)), live: await Promise.all(live.map(card)), latest: await Promise.all(latest.map(card)) };
}

export { other };
