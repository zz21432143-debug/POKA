import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  BLACK,
  TURN_SECONDS,
  WHITE,
  colorOfMove,
  findWinLine,
  play,
  type Stone,
} from "@/lib/omok";
import { profileYokai } from "@/lib/yokai-server";
import type { YokaiSpecies } from "@/lib/yokai";

/**
 * 요괴 오목 친구 대전(서버가 차례 · 금수 · 승패 · 시간을 판정).
 * 화면은 1초마다 version만 물어보고, 바뀌었을 때만 판 전체를 받음.
 * 비공개 기간: 로비 · 방 만들기 · AI 대전은 마스터만(GAMES_PUBLIC=1이면 모두). 방 링크를 받은 회원은 참가, 누구나 관전.
 */
export function gamesOpen(
  user: { isMaster?: boolean | null } | null | undefined,
) {
  return Boolean(user?.isMaster) || process.env.GAMES_PUBLIC === "1";
}

/** 상대를 기다리는 방은 30분 지나면 닫힘 */
const WAIT_MS = 30 * 60_000;
/** 시간 초과 판정 여유(네트워크) */
const GRACE_MS = 3_000;
export const OMOK_EMOTES = ["👍", "😮", "😈", "🔥", "😭", "🙏"] as const;

type Row = NonNullable<Awaited<ReturnType<typeof prisma.omokGame.findUnique>>>;
export type OmokPlayer = {
  nickname: string;
  yokai: { species: YokaiSpecies; stage: number; name: string } | null;
};
export type OmokView = {
  id: string;
  status: "waiting" | "playing" | "done";
  moves: number[];
  winner: Stone;
  endReason: string;
  version: number;
  /** 지금 차례 시작(ms) · 서버 시각(ms): 남은 시간 계산 */
  turnAt: number | null;
  serverNow: number;
  host: OmokPlayer | null;
  black: OmokPlayer | null;
  white: OmokPlayer | null;
  /** 보는 사람의 돌 색(0 = 관전) */
  me: Stone;
  isHost: boolean;
  emote: { by: Stone; e: string; at: number } | null;
  nextId: string | null;
  line: number[] | null;
};

const movesOf = (row: Row) => {
  try {
    const v = JSON.parse(row.movesJson);
    return Array.isArray(v)
      ? (v.filter((n) => Number.isInteger(n)) as number[])
      : [];
  } catch {
    return [];
  }
};

/** 시간 초과 · 오래 기다린 방 정리(볼 때마다 · 원자적으로) */
async function settle(row: Row): Promise<Row> {
  const now = Date.now();
  if (
    row.status === "playing" &&
    row.turnAt &&
    now - row.turnAt.getTime() > TURN_SECONDS * 1000 + GRACE_MS
  ) {
    const loser = colorOfMove(movesOf(row).length);
    await prisma.omokGame.updateMany({
      where: { id: row.id, version: row.version, status: "playing" },
      data: {
        status: "done",
        winner: loser === BLACK ? WHITE : BLACK,
        endReason: "timeout",
        version: { increment: 1 },
      },
    });
    return (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? row;
  }
  if (row.status === "waiting" && now - row.createdAt.getTime() > WAIT_MS) {
    await prisma.omokGame.updateMany({
      where: { id: row.id, status: "waiting" },
      data: { status: "done", endReason: "cancel", version: { increment: 1 } },
    });
    return (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? row;
  }
  return row;
}

async function player(
  userId: string | null,
  cache: Map<string, OmokPlayer | null>,
): Promise<OmokPlayer | null> {
  if (!userId) return null;
  if (cache.has(userId)) return cache.get(userId) ?? null;
  const [user, yk] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { nickname: true, withdrawnAt: true },
      })
      .catch(() => null),
    profileYokai(userId).catch(() => null),
  ]);
  const p = user
    ? {
        nickname: user.withdrawnAt ? "(탈퇴 회원)" : user.nickname,
        yokai: yk
          ? { species: yk.species, stage: yk.stage, name: yk.name }
          : null,
      }
    : null;
  cache.set(userId, p);
  return p;
}

async function toView(row: Row, viewerId: string | null): Promise<OmokView> {
  const cache = new Map<string, OmokPlayer | null>();
  const moves = movesOf(row);
  const [host, black, white] = await Promise.all([
    player(row.hostId, cache),
    player(row.blackId, cache),
    player(row.whiteId, cache),
  ]);
  let emote: OmokView["emote"] = null;
  try {
    emote = row.emoteJson ? JSON.parse(row.emoteJson) : null;
  } catch {
    emote = null;
  }
  return {
    id: row.id,
    status: row.status as OmokView["status"],
    moves,
    winner: row.winner as Stone,
    endReason: row.endReason,
    version: row.version,
    turnAt: row.turnAt?.getTime() ?? null,
    serverNow: Date.now(),
    host,
    black,
    white,
    me:
      viewerId && viewerId === row.blackId
        ? BLACK
        : viewerId && viewerId === row.whiteId
          ? WHITE
          : 0,
    isHost: Boolean(viewerId && viewerId === row.hostId),
    emote,
    nextId: row.nextId,
    line: row.winner && row.endReason === "five" ? findWinLine(moves) : null,
  };
}

/** 방 보기(바뀐 게 없으면 same) */
export async function omokState(
  id: string,
  viewerId: string | null,
  knownVersion?: number,
) {
  const found = await prisma.omokGame
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!found) return null;
  const row = await settle(found);
  if (knownVersion !== undefined && row.version === knownVersion)
    return { same: true as const, serverNow: Date.now() };
  return { same: false as const, view: await toView(row, viewerId) };
}

/** 방 만들기(이미 기다리는 내 방이 있으면 그 방) */
export async function createOmok(hostId: string) {
  const open = await prisma.omokGame.findFirst({
    where: {
      hostId,
      status: "waiting",
      createdAt: { gte: new Date(Date.now() - WAIT_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (open) return open.id;
  const made = await prisma.omokGame.create({
    data: { hostId },
    select: { id: true },
  });
  return made.id;
}

export type OmokAction =
  "join" | "move" | "resign" | "cancel" | "emote" | "rematch";
type ActResult =
  { ok: true; view: OmokView } | { ok: false; error: string; status: number };

export async function omokAct(
  id: string,
  userId: string,
  action: OmokAction,
  payload: { p?: unknown; e?: unknown },
): Promise<ActResult> {
  const found = await prisma.omokGame.findUnique({ where: { id } });
  if (!found)
    return { ok: false, error: "대국을 찾을 수 없어요.", status: 404 };
  const row = await settle(found);
  const fail = (error: string, status = 400): ActResult => ({
    ok: false,
    error,
    status,
  });
  const mine: Stone =
    userId === row.blackId ? BLACK : userId === row.whiteId ? WHITE : 0;
  const now = new Date();
  const done = async () => {
    const fresh = await prisma.omokGame.findUnique({ where: { id } });
    return { ok: true as const, view: await toView(fresh ?? row, userId) };
  };

  if (action === "join") {
    if (mine) return done();
    if (row.status !== "waiting")
      return fail("이미 시작했거나 끝난 대국이에요. 관전만 할 수 있어요.", 409);
    if (userId === row.hostId)
      return fail("친구에게 링크를 보내 주세요. 친구가 들어오면 시작해요.");
    // 흑백은 무작위
    const hostBlack = randomInt(2) === 0;
    const joined = await prisma.omokGame.updateMany({
      where: { id, status: "waiting", version: row.version },
      data: {
        status: "playing",
        blackId: hostBlack ? row.hostId : userId,
        whiteId: hostBlack ? userId : row.hostId,
        turnAt: now,
        version: { increment: 1 },
      },
    });
    if (joined.count !== 1)
      return fail("다른 사람이 먼저 들어왔어요. 관전으로 볼 수 있어요.", 409);
    return done();
  }

  if (action === "move") {
    if (!mine) return fail("대국하는 사람만 둘 수 있어요.", 403);
    if (row.status !== "playing")
      return fail("진행 중인 대국이 아니에요.", 409);
    const moves = movesOf(row);
    if (colorOfMove(moves.length) !== mine) return fail("상대 차례예요.", 409);
    const result = play(moves, Number(payload.p));
    if (!result.ok) return fail(result.error);
    const finished = Boolean(result.winner) || result.draw;
    const saved = await prisma.omokGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: {
        movesJson: JSON.stringify(result.moves),
        turnAt: now,
        version: { increment: 1 },
        ...(finished
          ? {
              status: "done",
              winner: result.winner,
              endReason: result.winner ? "five" : "draw",
            }
          : {}),
      },
    });
    if (saved.count !== 1)
      return fail("판이 바뀌었어요. 다시 확인해 주세요.", 409);
    return done();
  }

  if (action === "resign") {
    if (!mine) return fail("대국하는 사람만 기권할 수 있어요.", 403);
    if (row.status !== "playing")
      return fail("진행 중인 대국이 아니에요.", 409);
    await prisma.omokGame.updateMany({
      where: { id, status: "playing" },
      data: {
        status: "done",
        winner: mine === BLACK ? WHITE : BLACK,
        endReason: "resign",
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "cancel") {
    if (userId !== row.hostId || row.status !== "waiting")
      return fail("기다리는 내 방만 닫을 수 있어요.", 403);
    await prisma.omokGame.updateMany({
      where: { id, status: "waiting" },
      data: { status: "done", endReason: "cancel", version: { increment: 1 } },
    });
    return done();
  }

  if (action === "emote") {
    if (!mine) return fail("대국하는 사람만 보낼 수 있어요.", 403);
    const e = String(payload.e ?? "");
    if (!(OMOK_EMOTES as readonly string[]).includes(e))
      return fail("보낼 수 없는 이모티콘이에요.");
    // 이모티콘은 차례 · 판에 영향 없음(version만 올려 화면이 받게)
    await prisma.omokGame.update({
      where: { id },
      data: {
        emoteJson: JSON.stringify({ by: mine, e, at: now.getTime() }),
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "rematch") {
    if (!mine) return fail("대국한 사람만 한 판 더 할 수 있어요.", 403);
    if (row.status !== "done" || !row.blackId || !row.whiteId)
      return fail("끝난 대국에서만 할 수 있어요.", 409);
    if (row.nextId) return done();
    // 다음 판: 흑백을 바꿔서 바로 시작
    const next = await prisma.omokGame.create({
      data: {
        hostId: userId,
        blackId: row.whiteId,
        whiteId: row.blackId,
        status: "playing",
        turnAt: now,
      },
      select: { id: true },
    });
    const linked = await prisma.omokGame.updateMany({
      where: { id, nextId: null },
      data: { nextId: next.id, version: { increment: 1 } },
    });
    if (linked.count !== 1)
      await prisma.omokGame
        .delete({ where: { id: next.id } })
        .catch(() => undefined);
    return done();
  }

  return fail("알 수 없는 요청이에요.");
}

/** 로비: 지금 대국 중(관전) · 내 최근 대국 */
export async function omokLobby(userId: string | null) {
  const cache = new Map<string, OmokPlayer | null>();
  const live = await prisma.omokGame.findMany({
    where: {
      status: "playing",
      updatedAt: { gte: new Date(Date.now() - 10 * 60_000) },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  const recent = userId
    ? await prisma.omokGame.findMany({
        where: {
          status: "done",
          endReason: { not: "cancel" },
          OR: [{ blackId: userId }, { whiteId: userId }],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      })
    : [];
  const card = async (row: Row) => ({
    id: row.id,
    black: (await player(row.blackId, cache))?.nickname ?? "?",
    white: (await player(row.whiteId, cache))?.nickname ?? "?",
    moves: movesOf(row).length,
    winner: row.winner as Stone,
    endReason: row.endReason,
    mine: (userId === row.blackId
      ? BLACK
      : userId === row.whiteId
        ? WHITE
        : 0) as Stone,
    at: row.updatedAt.getTime(),
  });
  return {
    live: await Promise.all(live.map(card)),
    recent: await Promise.all(recent.map(card)),
  };
}
