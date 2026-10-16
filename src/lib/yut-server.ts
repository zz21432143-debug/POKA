import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { roomTitle } from "@/lib/game-room";
import { anyoneHere, watchersWithFaces, type Watcher } from "@/lib/game-watch";
import { todayKstDate } from "@/lib/dates";
import { profileYokai } from "@/lib/yokai-server";
import { YOKAI_ORDER, type YokaiSpecies } from "@/lib/yokai";
import { isGameEmote } from "@/lib/omok-emotes";
import { loadWinReward } from "@/lib/game-reward";
import { MIN_COUNTED_MOVES } from "@/lib/game-stats";
import { askRematch, declineRematch, readRematch, rematchView, type RematchView } from "@/lib/game-rematch";
import { applyMove, applyThrow, autoStep, easyStep, newState, other, type Team, type YutState } from "@/lib/yut";

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

export type Seat = { team: Team; idx: number; userId: string | null; ready: boolean; bot?: boolean; left?: boolean; botYokai?: YokaiSpecies; surrender?: boolean; /** 자리비움: 서버가 대신 둠 */ auto?: boolean; /** 쉬운 요괴봇(방 설정 · 모든 자리에 같이 저장) */ botEasy?: boolean };
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
type QueueEntry = { id: string; n: string; at: number };
const queueOf = (row: { queueJson: string }): QueueEntry[] => {
  try {
    const v = row.queueJson ? JSON.parse(row.queueJson) : [];
    return Array.isArray(v) ? v.filter((e) => e && typeof e.id === "string") : [];
  } catch {
    return [];
  }
};
const PLAYER_GONE_MS = 15_000;

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

async function makeRoom(data: { hostId: string; mode: number; seatsJson: string; isPrivate: boolean; title?: string; queueJson?: string }) {
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
  const made = await makeRoom({ hostId, mode, seatsJson: JSON.stringify(seats), isPrivate, title });
  if (!isPrivate && "id" in made) {
    // 응답을 보낸 뒤 「상대 찾는 중」 알림(켠 기기만 · 하루 2번)
    try {
      const { after } = await import("next/server");
      after(async () => {
        const { alertWaitingRoom } = await import("@/lib/game-alert");
        await alertWaitingRoom("yut", made.id, hostId).catch(() => undefined);
      });
    } catch {
      /* 요청 밖이면 알림 없이 */
    }
  }
  return made;
}

export async function yutRoomByCode(code: string) {
  const c = code.trim().toUpperCase();
  if (!YUT_CODE_RE.test(c)) return null;
  return prisma.yutGame.findFirst({ where: { code: c, NOT: { status: "done", endReason: "cancel" } }, select: { id: true, status: true } }).catch(() => null);
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
  const WIN_REWARD = await loadWinReward();
  const { rewardLose } = await import("@/lib/game-stats");
  for (const x of seats) {
    if (x.team !== s.winner && x.userId) await rewardLose("yut", x.userId).catch(() => undefined);
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

/**
 * 승자 연전: 판이 끝났는데 도전 줄이 있으면 바로 다음 판.
 * 이긴 팀은 그 자리 그대로(자동 READY) · 진 팀 자리에는 줄 앞사람부터 앉고, 자리를 내준 진 사람은 줄 맨 뒤로.
 * 줄이 모자라면 남은 진 사람은 그대로 다시 함께.
 */
async function autoYutNext(row: Row) {
  if (row.status !== "done" || row.nextId || !row.winner || row.endReason === "cancel") return;
  const q = queueOf(row);
  if (!q.length) return;
  const seats = seatsOf(row);
  const winner = row.winner as Team;
  const inGame = new Set(seats.filter((x) => x.userId).map((x) => x.userId!));
  const line = q.filter((e) => !inGame.has(e.id));
  if (!line.length) return;
  const cache = new Map<string, YutPlayer | null>();
  const pushedBack: QueueEntry[] = [];
  const next: Seat[] = seats.map((x) => {
    const keep = x.userId && !x.bot && !x.left ? x.userId : null;
    if (x.team === winner) return { team: x.team, idx: x.idx, userId: keep, ready: Boolean(keep) };
    const head = line.shift();
    if (head) {
      if (keep) pushedBack.push({ id: keep, n: "", at: Date.now() });
      return { team: x.team, idx: x.idx, userId: head.id, ready: false };
    }
    return { team: x.team, idx: x.idx, userId: keep, ready: false };
  });
  for (const p of pushedBack) p.n = (await playerOf(p.id, cache))?.nickname ?? "?";
  const host = next.find((x) => x.team === winner && x.userId)?.userId ?? next.find((x) => x.userId)?.userId;
  if (!host) return;
  const made = await makeRoom({ hostId: host, mode: row.mode, seatsJson: JSON.stringify(next), isPrivate: row.isPrivate, title: row.title, queueJson: JSON.stringify([...line, ...pushedBack.filter((p) => p.n !== "(탈퇴 회원)")]) });
  const linked = await prisma.yutGame.updateMany({ where: { id: row.id, nextId: null }, data: { nextId: made.id, version: { increment: 1 } } });
  if (linked.count !== 1) await prisma.yutGame.delete({ where: { id: made.id } }).catch(() => undefined);
}

/** 판이 끝난 뒤: 전적 · 보상 · 승자 연전 */
async function afterDone(row: Row, s: YutState) {
  await recordYut(row, s).catch(() => undefined);
  const fresh = (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
  await autoYutNext(fresh).catch(() => undefined);
}

/* ───────── 볼 때마다: 비어 있는 대기실 정리 · AI 차례 진행 ───────── */

async function lastSeenMap(gameId: string, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await prisma.gameWatch.findMany({ where: { gameId, viewer: { in: ids.map((i) => `p:${i}`) } }, select: { viewer: true, seenAt: true } }).catch(() => []);
  return new Map(rows.map((r) => [r.viewer.slice(2), r.seenAt.getTime()]));
}

/** 끝난 판: 신호가 이만큼 없으면 「나갔어요」(앉은 사람은 1초마다 · 숨긴 탭은 5초마다 신호) */
const AWAY_MS = 12_000;

/** 끝난 판에서 나를 뺀 사람 참가자 중 방을 떠난 사람 */
async function awayHumans(row: Row, userId: string) {
  const others = seatsOf(row).filter((x) => x.userId && !x.bot && !x.left && x.userId !== userId).map((x) => x.userId!);
  const seen = await lastSeenMap(row.id, others);
  const now = Date.now();
  return { others, away: others.filter((id) => now - (seen.get(id) ?? 0) > AWAY_MS) };
}

async function settle(row: Row): Promise<Row> {
  const now = Date.now();
  const seats = seatsOf(row);
  if (row.status === "waiting") {
    const humans = seats.filter((x) => x.userId).map((x) => x.userId!);
    const seen = await lastSeenMap(row.id, humans);
    const empty = now - row.createdAt.getTime() > 60_000 && !(await anyoneHere(row.id, 60_000));
    if (empty || (now - row.createdAt.getTime() > HOST_AWAY_MS && now - Math.max(seen.get(row.hostId) ?? 0, row.createdAt.getTime()) > HOST_AWAY_MS)) {
      await prisma.yutGame.updateMany({ where: { id: row.id, status: "waiting" }, data: { status: "done", endReason: "cancel", version: { increment: 1 } } });
      return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
    }
    const gone = seats.filter((x) => x.userId && x.userId !== row.hostId && now - Math.max(seen.get(x.userId) ?? 0, row.updatedAt.getTime()) > SEAT_AWAY_MS);
    if (gone.length) {
      const line = queueOf(row).filter((e) => !seats.some((x) => x.userId === e.id));
      const next = seats.map((x) => (gone.includes(x) ? { ...x, userId: line.shift()?.id ?? null, ready: false } : x));
      await prisma.yutGame.updateMany({ where: { id: row.id, version: row.version }, data: { seatsJson: JSON.stringify(next), queueJson: JSON.stringify(line), version: { increment: 1 } } });
      return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
    }
    return row;
  }
  if (row.status !== "playing") return row;
  const s = stateOf(row);
  if (!s) return row;
  if (row.mode >= 2) {
    // 팀전: 접속이 끊긴 사람 자리는 요괴 AI가 이어서(그 사람 차례마다 시간을 다 기다리지 않게)
    const humans = seats.filter((x) => x.userId && !x.bot && !x.left && !x.auto);
    const seenAll = await lastSeenMap(row.id, humans.map((x) => x.userId!));
    const startAt = row.turnAt?.getTime() ?? row.updatedAt.getTime();
    const goneIds = new Set(humans.filter((x) => now - Math.max(seenAll.get(x.userId!) ?? 0, Math.min(startAt, now)) > PLAYER_GONE_MS).map((x) => x.userId));
    if (goneIds.size && goneIds.size < humans.length) {
      const r = await prisma.yutGame.updateMany({
        where: { id: row.id, version: row.version, status: "playing" },
        data: { seatsJson: JSON.stringify(seats.map((x) => (goneIds.has(x.userId) ? { ...x, left: true } : x))), version: { increment: 1 } },
      });
      if (r.count === 1) return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
    }
  }
  if (row.mode === 1 && !row.withBots) {
    const humans = seats.filter((x) => x.userId && !x.bot && !x.auto);
    const seenAll = await lastSeenMap(row.id, humans.map((x) => x.userId!));
    const startAt = row.turnAt?.getTime() ?? row.updatedAt.getTime();
    const goneSeats = humans.filter((x) => now - Math.max(seenAll.get(x.userId!) ?? 0, Math.min(startAt, now)) > PLAYER_GONE_MS);
    if (goneSeats.length === 1 && row.mode === 1) {
      const winner = other(goneSeats[0].team);
      const ended: YutState = { ...s, winner, results: [], throws: 0, stats: s.stats ? { ...s.stats, endAt: Date.now() } : s.stats };
      const r = await prisma.yutGame.updateMany({
        where: { id: row.id, version: row.version, status: "playing" },
        data: { status: "done", winner, endReason: "leave", stateJson: JSON.stringify(ended), version: { increment: 1 } },
      });
      const fresh = (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? row;
      if (r.count === 1) await afterDone(fresh, ended);
      return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? fresh;
    }
  }
  const seat = currentSeat(seats, s);
  const since = now - (row.turnAt?.getTime() ?? now);
  let due = since > TURN_MS + 800;
  if (seat && (seat.bot || seat.left || seat.auto || !seat.userId) && since > botMs(row.mode)) due = true;
  if (!due && seat?.userId && since > 1500) {
    const seen = await lastSeenMap(row.id, [seat.userId]);
    if (now - (seen.get(seat.userId) ?? 0) > ABSENT_MS) due = true;
  }
  if (!due) return row;
  const next = seat?.bot && seat.botEasy ? easyStep(s, Math.random, now) : autoStep(s, Math.random, now);
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
  if (saved.count === 1 && done) {
    await afterDone(fresh, s);
    return (await prisma.yutGame.findUnique({ where: { id: row.id } })) ?? fresh;
  }
  return fresh;
}

/* ───────── 화면에 보낼 모양 ───────── */

export type YutPlayer = { nickname: string; yokai: { species: YokaiSpecies; stage: number } | null };
export type YutSeatView = { team: Team; idx: number; player: YutPlayer | null; ready: boolean; bot: boolean; left: boolean; me: boolean; host: boolean; surrender: boolean; auto: boolean };
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
  /** 쉬운 요괴봇 */
  botEasy: boolean;
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
  /** 「한 판 더」 신청(1:1 사람끼리) */
  rematch: RematchView;
  /** 도전 줄(닉네임 순서) · 내 순번(0 = 없음) */
  queue: string[];
  queueMine: number;
  watchers?: number;
  watcherNames?: string[];
  watcherList?: Watcher[];
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
      surrender: Boolean(x.surrender),
      auto: Boolean(x.auto),
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
    botEasy: seatsOf(row).some((x) => x.botEasy),
    nextId: row.nextId,
    rematch: row.status === "done" && !row.nextId && row.mode === 1 && !row.withBots ? rematchView(await readRematch("yut", row.id), viewerId) : null,
    queue: queueOf(row).map((e) => e.n),
    queueMine: viewerId ? queueOf(row).findIndex((e) => e.id === viewerId) + 1 : 0,
  };
}

async function watchersOf(gameId: string) {
  return watchersWithFaces(gameId);
}

export async function yutState(id: string, viewerId: string | null, knownVersion?: number, watcher?: string) {
  const found = await prisma.yutGame.findUnique({ where: { id } }).catch(() => null);
  if (!found) return null;
  const row = await settle(found).catch(() => found);
  const seated = seatsOf(row).some((x) => viewerId && x.userId === viewerId);
  const ended = row.status === "done" && !row.nextId && row.endReason !== "cancel";
  if (watcher && /^[a-z0-9]{8,40}$/.test(watcher) && (row.status !== "done" || (seated && ended))) {
    const now = new Date();
    if (seated && viewerId) {
      await prisma.gameWatch.upsert({ where: { gameId_viewer: { gameId: id, viewer: `p:${viewerId}` } }, create: { gameId: id, viewer: `p:${viewerId}`, seenAt: now }, update: { seenAt: now } }).catch(() => undefined);
    } else {
      const nickname = viewerId ? ((await prisma.user.findUnique({ where: { id: viewerId }, select: { nickname: true } }).catch(() => null))?.nickname ?? null) : null;
      await prisma.gameWatch.upsert({ where: { gameId_viewer: { gameId: id, viewer: watcher } }, create: { gameId: id, viewer: watcher, seenAt: now, nickname }, update: { seenAt: now, nickname } }).catch(() => undefined);
    }
  }
  const w = row.status !== "done" ? await watchersOf(id) : { count: 0, names: [] as string[], list: [] as Watcher[] };
  // 끝난 판: 나간 사람 이름 · 다 나갔는지(한 판 더 버튼)
  let away: { names: string[]; all: boolean } = { names: [], all: false };
  if (ended && seated && viewerId) {
    const a = await awayHumans(row, viewerId);
    if (a.away.length) {
      const users = await prisma.user.findMany({ where: { id: { in: a.away } }, select: { nickname: true } }).catch(() => []);
      away = { names: users.map((u) => u.nickname), all: a.away.length === a.others.length };
    }
  }
  if (knownVersion !== undefined && row.version === knownVersion) return { same: true as const, away, serverNow: Date.now(), watchers: w.count, watcherNames: w.names, watcherList: w.list };
  return { same: false as const, away, view: { ...(await toView(row, viewerId)), watchers: w.count, watcherNames: w.names, watcherList: w.list } };
}

/* ───────── 동작 ───────── */

export type YutAction = "sit" | "leave" | "ready" | "shuffle" | "mode" | "kick" | "start" | "throw" | "move" | "emote" | "cheer" | "exit" | "rematch" | "rematch-no" | "auto" | "bot-level" | "surrender" | "surrender-cancel" | "queue-join" | "queue-leave" | "bot-add" | "bot-remove";
type ActResult = { ok: true; view: YutView } | { ok: false; error: string; status: number };

export async function yutAct(
  id: string,
  userId: string,
  action: YutAction,
  payload: { team?: unknown; idx?: unknown; ready?: unknown; mode?: unknown; bots?: unknown; ri?: unknown; pi?: unknown; e?: unknown; target?: unknown; power?: unknown; on?: unknown; easy?: unknown },
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
    const w = fresh?.status !== "done" ? await watchersOf(id) : { count: 0, names: [] as string[], list: [] as Watcher[] };
    return { ok: true as const, view: { ...(await toView(fresh ?? row, userId)), watchers: w.count, watcherNames: w.names, watcherList: w.list } };
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
    const next = seats.map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x)).map((x) => (x.team === team && x.idx === idx ? { ...x, userId, ready: false, bot: false, botYokai: undefined } : x));
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
  if (action === "auto") {
    // 자리비움: 켜면 내 차례를 서버가 대신(보통 요괴봇처럼) · 접속이 끊겨도 기권 처리 안 함
    if (row.status !== "playing" || !mine) return fail("판에 앉은 사람만 자동을 켤 수 있어요.", 409);
    const on = payload.on !== false;
    const r = await prisma.yutGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: { seatsJson: JSON.stringify(seats.map((x) => (x.userId === userId ? { ...x, auto: on } : x))), version: { increment: 1 } },
    });
    if (r.count !== 1) return fail("판이 바뀌었어요. 다시 눌러 주세요.", 409);
    return done();
  }
  if (action === "bot-level") {
    if (!isHost || row.status !== "waiting") return fail("방장만 요괴봇 난이도를 바꿀 수 있어요.", 403);
    const easy = payload.easy === true;
    if (!(await saveSeats(seats.map((x) => ({ ...x, botEasy: easy }))))) return fail("다시 해 주세요.", 409);
    return done();
  }
  if (action === "bot-add" || action === "bot-remove") {
    if (!isHost || row.status !== "waiting") return fail("방장만 요괴봇을 넣고 뺄 수 있어요.", 403);
    const team = payload.team === "B" ? "B" : "A";
    const idx = Number(payload.idx);
    const target = seats.find((x) => x.team === team && x.idx === idx);
    if (!target) return fail("그 자리가 없어요.");
    if (target.userId) return fail("사람이 앉은 자리예요.", 409);
    const next = seats.map((x) =>
      x === target ? (action === "bot-add" ? { ...x, bot: true, ready: true, botYokai: YOKAI_ORDER[randomInt(YOKAI_ORDER.length)] } : { ...x, bot: false, ready: false, botYokai: undefined }) : x,
    );
    if (!(await saveSeats(next))) return fail("다시 해 주세요.", 409);
    return done();
  }
  if (action === "start") {
    if (!isHost || row.status !== "waiting") return fail("방장만 시작할 수 있어요.", 403);
    const notReady = seats.filter((x) => x.userId && x.userId !== row.hostId && !x.ready);
    if (notReady.length) return fail(`아직 준비 안 한 사람이 ${notReady.length}명 있어요.`, 409);
    // 빈자리는 시작할 때 요괴봇이 자동으로 채움(혼자서도 봇과 한 판) — 봇이 낀 판은 전적 · 보상 없음
    const next = seats.map((x) => (x.userId ? { ...x, bot: false, ready: true } : { ...x, bot: true, ready: true, botYokai: x.botYokai ?? YOKAI_ORDER[randomInt(YOKAI_ORDER.length)] }));
    const first: Team = randomInt(2) === 0 ? "A" : "B";
    const r = await prisma.yutGame.updateMany({
      where: { id, version: row.version, status: "waiting" },
      data: { status: "playing", seatsJson: JSON.stringify(next), stateJson: JSON.stringify(newState(piecesFor(row.mode), first)), withBots: next.some((x) => x.bot), turnAt: new Date(now), version: { increment: 1 } },
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
    if (!isGameEmote(e)) return fail("보낼 수 없는 이모티콘이에요.");
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
    // 관전 응원 보상(하루 한 번 EXP)
    const { rewardCheer } = await import("@/lib/cheer-reward");
    await rewardCheer(userId).catch(() => undefined);
    return done();
  }
  if (action === "surrender" || action === "surrender-cancel") {
    // 기권: 우리 팀 사람이 모두 기권을 누르면 즉시 패배(혼자 팀이면 바로) — 상대 팀은 승리 · 보상
    if (row.status !== "playing" || !mine || mine.left) return fail("판에 앉은 사람만 기권할 수 있어요.", 409);
    const st = stateOf(row);
    if (!st) return fail("판 정보를 읽지 못했어요.", 500);
    const flag = action === "surrender";
    const next = seats.map((x) => (x.userId === userId ? { ...x, surrender: flag } : x));
    const team = next.filter((x) => x.team === mine.team && x.userId && !x.bot && !x.left);
    if (flag && team.every((x) => x.surrender)) {
      const winner = other(mine.team);
      const ended: YutState = { ...st, winner, results: [], throws: 0, stats: st.stats ? { ...st.stats, endAt: Date.now() } : st.stats };
      const r = await prisma.yutGame.updateMany({
        where: { id, version: row.version, status: "playing" },
        data: { status: "done", winner, endReason: "resign", seatsJson: JSON.stringify(next), stateJson: JSON.stringify(ended), version: { increment: 1 } },
      });
      if (r.count !== 1) return fail("판이 바뀌었어요. 다시 해 주세요.", 409);
      const fresh = await prisma.yutGame.findUnique({ where: { id } });
      if (fresh) await afterDone(fresh, ended);
      return done();
    }
    const r = await prisma.yutGame.updateMany({ where: { id, version: row.version, status: "playing" }, data: { seatsJson: JSON.stringify(next), version: { increment: 1 } } });
    if (r.count !== 1) return fail("판이 바뀌었어요. 다시 해 주세요.", 409);
    return done();
  }
  if (action === "exit") {
    if (row.status === "waiting") {
      if (isHost) await prisma.yutGame.updateMany({ where: { id, status: "waiting" }, data: { status: "done", endReason: "cancel", version: { increment: 1 } } });
      else if (mine) await saveSeats(seats.map((x) => (x.userId === userId ? { ...x, userId: null, ready: false } : x)));
    } else if (row.status === "playing" && mine && row.mode === 1) {
      // 1:1에서 나가면 기권패(상대 승리 · 보상)
      const st = stateOf(row);
      if (st) {
        const winner = other(mine.team);
        const ended: YutState = { ...st, winner, results: [], throws: 0, stats: st.stats ? { ...st.stats, endAt: Date.now() } : st.stats };
        const r = await prisma.yutGame.updateMany({ where: { id, version: row.version, status: "playing" }, data: { status: "done", winner, endReason: "leave", stateJson: JSON.stringify(ended), version: { increment: 1 } } });
        const fresh = await prisma.yutGame.findUnique({ where: { id } });
        if (r.count === 1 && fresh) await afterDone(fresh, ended);
      }
    } else if (row.status === "playing" && mine) {
      // 팀전에서 나가면 그 자리는 요괴 AI가 이어서(게임은 계속)
      await prisma.yutGame.updateMany({ where: { id, status: "playing" }, data: { seatsJson: JSON.stringify(seats.map((x) => (x.userId === userId ? { ...x, left: true } : x))), version: { increment: 1 } } });
    }
    // 줄에 서 있었으면 빼기
    if (queueOf(row).some((e) => e.id === userId)) await prisma.yutGame.update({ where: { id }, data: { queueJson: JSON.stringify(queueOf(row).filter((e) => e.id !== userId)), version: { increment: 1 } } }).catch(() => undefined);
    await prisma.gameWatch.deleteMany({ where: { gameId: id, viewer: `p:${userId}` } }).catch(() => undefined);
    return done();
  }
  if (action === "queue-join" || action === "queue-leave") {
    const q = queueOf(row);
    if (action === "queue-leave") {
      await prisma.yutGame.update({ where: { id }, data: { queueJson: JSON.stringify(q.filter((e) => e.id !== userId)), version: { increment: 1 } } });
      return done();
    }
    if (mine) return fail("이미 자리에 앉아 있어요.", 409);
    if (row.nextId || (row.status === "done" && row.endReason === "cancel")) return fail("다음 판에서 줄을 서 주세요.", 409);
    if (row.status === "waiting" && seats.some((x) => !x.userId)) return fail("빈자리가 있어요. 바로 앉아 주세요!", 409);
    if (!(await hasYokai(userId))) return fail(NO_YOKAI, 403);
    if (q.some((e) => e.id === userId)) return done();
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (!me) return fail("로그인해 주세요.", 401);
    const nextQ = [...q, { id: userId, n: me.nickname, at: now }].slice(0, 20);
    await prisma.yutGame.update({ where: { id }, data: { queueJson: JSON.stringify(nextQ), version: { increment: 1 } } });
    // 막 끝난 판이면 바로 연전
    const fresh = await prisma.yutGame.findUnique({ where: { id } });
    if (fresh?.status === "done") await autoYutNext(fresh).catch(() => undefined);
    return done();
  }
  if (action === "rematch") {
    if (row.status !== "done" || !mine) return fail("끝난 판의 참가자만 한 판 더 할 수 있어요.", 409);
    if (row.nextId) return done();
    // 같은 사람 · 같은 팀으로 새 대기실(봇 · 나간 사람 자리는 비움) — 신청한 사람(없으면 누른 사람)이 방장
    const a = await awayHumans(row, userId);
    if (a.others.length && a.away.length === a.others.length && !row.withBots)
      return fail("다른 사람이 모두 방을 나갔어요. 로비에서 새 방을 만들어 주세요.", 409);
    // 1:1 사람끼리: 상대가 먼저 신청한 게 없으면 신청만(상대 화면에 「수락 · 거절」)
    let asker: string | null = null;
    if (row.mode === 1 && !row.withBots && a.others.length) {
      const ask = await readRematch("yut", id);
      asker = ask?.by ?? null;
      if (!ask || ask.declined || ask.by === userId) {
        if (!ask || ask.declined || ask.by !== userId) {
          await askRematch("yut", id, userId);
          await prisma.yutGame.updateMany({ where: { id }, data: { version: { increment: 1 } } });
        }
        return done();
      }
    }
    const gone = new Set(a.away);
    const next = seats.map((x) => ({ team: x.team, idx: x.idx, userId: x.bot || x.left || (x.userId && gone.has(x.userId)) ? null : x.userId, ready: false }));
    const made = await makeRoom({ hostId: asker && next.some((x) => x.userId === asker) ? asker : userId, mode: row.mode, seatsJson: JSON.stringify(next), isPrivate: row.isPrivate, title: row.title });
    const linked = await prisma.yutGame.updateMany({ where: { id, nextId: null }, data: { nextId: made.id, version: { increment: 1 } } });
    if (linked.count !== 1) await prisma.yutGame.delete({ where: { id: made.id } }).catch(() => undefined);
    return done();
  }
  if (action === "rematch-no") {
    if (row.status !== "done" || !mine) return fail("끝난 판에서만 할 수 있어요.", 409);
    if (await declineRematch("yut", id, userId)) await prisma.yutGame.updateMany({ where: { id }, data: { version: { increment: 1 } } });
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
    prisma.yutGame.findMany({ where: { status: "done", endReason: { in: ["finish", "resign"] }, isPrivate: false }, orderBy: { updatedAt: "desc" }, take: 5 }),
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
