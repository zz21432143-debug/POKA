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
import { gameRecord, recordGameResult } from "@/lib/game-stats";

/**
 * 요괴 오목 친구 대전(서버가 차례 · 금수 · 승패 · 시간을 판정).
 * 방 = 방 코드(5글자) + 대기실(방장 자리 · 손님 자리 · 둘 다 READY면 시작) → 대국 → 결과.
 * 화면은 1초마다 version만 물어보고, 바뀌었을 때만 판 전체를 받음.
 * 비공개 기간: 로비 · 방 만들기 · AI 대전은 마스터만(GAMES_PUBLIC=1이면 모두). 방 링크 · 코드를 받은 회원은 착석, 누구나 관전.
 * 요괴가 없으면 방을 만들거나 앉을 수 없음(요괴 고르기로).
 */
export function gamesOpen(
  user: { isMaster?: boolean | null } | null | undefined,
) {
  return Boolean(user?.isMaster) || process.env.GAMES_PUBLIC === "1";
}

/** 대기실은 마지막 움직임 뒤 60분이면 닫힘 */
const WAIT_MS = 60 * 60_000;
/** 시간 초과 판정 여유(네트워크) */
const GRACE_MS = 3_000;
export const OMOK_EMOTES = ["👍", "😮", "😈", "🔥", "😭", "🙏"] as const;
/** 한 판에 물리기 요청 횟수(사람마다) */
export const UNDO_LIMIT = 3;
/** 방 코드: 헷갈리는 글자(0 O 1 I L) 뺀 5글자 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_RE = /^[A-HJKMNP-Z2-9]{5}$/;
export const NO_YOKAI = "NO_YOKAI";

type UndoState = {
  ask: { by: Stone; at: number; len: number } | null;
  used: Record<string, number>;
  denied: { by: Stone; at: number } | null;
};
function undoOf(row: { undoJson: string }): UndoState {
  try {
    const v = row.undoJson ? JSON.parse(row.undoJson) : null;
    return {
      ask: v?.ask ?? null,
      used: v?.used ?? {},
      denied: v?.denied ?? null,
    };
  } catch {
    return { ask: null, used: {}, denied: null };
  }
}

type Row = NonNullable<Awaited<ReturnType<typeof prisma.omokGame.findUnique>>>;
export type OmokPlayer = {
  nickname: string;
  yokai: { species: YokaiSpecies; stage: number; name: string } | null;
};
export type OmokRecord = {
  wins: number;
  losses: number;
  resigns: number;
  draws: number;
};
export type OmokView = {
  id: string;
  code: string | null;
  status: "waiting" | "playing" | "done";
  moves: number[];
  winner: Stone;
  endReason: string;
  version: number;
  /** 지금 차례 시작(ms) · 서버 시각(ms): 남은 시간 계산 */
  turnAt: number | null;
  serverNow: number;
  host: OmokPlayer | null;
  /** 대기실 손님 자리(시작 전) */
  guest: OmokPlayer | null;
  hostReady: boolean;
  guestReady: boolean;
  /** 보는 사람 자리: host · guest · null(관전) */
  seat: "host" | "guest" | null;
  black: OmokPlayer | null;
  white: OmokPlayer | null;
  /** 보는 사람의 돌 색(0 = 관전) */
  me: Stone;
  isHost: boolean;
  emote: { by: Stone; e: string; at: number } | null;
  nextId: string | null;
  line: number[] | null;
  /** 관전자: 로그인한 사람 닉네임 · 손님 수 */
  watchers?: number;
  watcherNames?: string[];
  /** 물리기: 지금 요청한 사람 · 거절된 요청 · 남은 횟수(흑 · 백) */
  undo: {
    askBy: Stone;
    deniedBy: Stone;
    deniedAt: number;
    left: Record<1 | 2, number>;
  };
  /** 두 사람 전적(가끔만 같이 옴) */
  records?: { black: OmokRecord | null; white: OmokRecord | null };
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

/** 요괴가 있는지(게임은 요괴가 있어야) */
export async function hasYokai(userId: string) {
  return Boolean(await profileYokai(userId).catch(() => null));
}

/** 끝난 판이면 전적에 기록(한 판에 한 번 · 짧은 판은 game-stats가 뺌) */
async function recordIfDone(row: Row) {
  if (
    row.status !== "done" ||
    !row.blackId ||
    !row.whiteId ||
    row.endReason === "cancel"
  )
    return;
  await recordGameResult({
    game: "omok",
    gameId: row.id,
    playerAId: row.blackId,
    playerBId: row.whiteId,
    winnerId:
      row.winner === BLACK
        ? row.blackId
        : row.winner === WHITE
          ? row.whiteId
          : null,
    reason: row.endReason,
    moves: movesOf(row).length,
  }).catch(() => undefined);
}

/** 관전자(최근 15초 안에 신호): 수 · 로그인한 사람 닉네임 */
const WATCH_MS = 15_000;
async function watchersOf(gameId: string) {
  const rows = await prisma.gameWatch
    .findMany({
      where: { gameId, seenAt: { gte: new Date(Date.now() - WATCH_MS) } },
      select: { nickname: true },
      take: 60,
    })
    .catch(() => []);
  const names = [
    ...new Set(
      rows.map((r) => r.nickname).filter((n): n is string => Boolean(n)),
    ),
  ];
  return { count: rows.length, names };
}

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
    const fresh =
      (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? row;
    await recordIfDone(fresh);
    return fresh;
  }
  if (row.status === "waiting" && now - row.updatedAt.getTime() > WAIT_MS) {
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

async function recordOf(userId: string | null): Promise<OmokRecord | null> {
  if (!userId) return null;
  const r = await gameRecord(userId, "omok").catch(() => null);
  return r
    ? { wins: r.wins, losses: r.losses, resigns: r.resigns, draws: r.draws }
    : null;
}

async function toView(
  row: Row,
  viewerId: string | null,
  withRecords = false,
): Promise<OmokView> {
  const cache = new Map<string, OmokPlayer | null>();
  const moves = movesOf(row);
  const undo = undoOf(row);
  const [host, guest, black, white] = await Promise.all([
    player(row.hostId, cache),
    player(row.guestId, cache),
    player(row.blackId, cache),
    player(row.whiteId, cache),
  ]);
  let emote: OmokView["emote"] = null;
  try {
    emote = row.emoteJson ? JSON.parse(row.emoteJson) : null;
  } catch {
    emote = null;
  }
  // 대기실 전적: 방장(흑 자리) · 손님(백 자리)로 보여 줌
  const recA = withRecords ? await recordOf(row.blackId ?? row.hostId) : null;
  const recB = withRecords ? await recordOf(row.whiteId ?? row.guestId) : null;
  return {
    id: row.id,
    code: row.code,
    status: row.status as OmokView["status"],
    moves,
    winner: row.winner as Stone,
    endReason: row.endReason,
    version: row.version,
    turnAt: row.turnAt?.getTime() ?? null,
    serverNow: Date.now(),
    host,
    guest,
    hostReady: row.hostReady,
    guestReady: row.guestReady,
    seat:
      viewerId && viewerId === row.hostId
        ? "host"
        : viewerId && viewerId === row.guestId
          ? "guest"
          : null,
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
    undo: {
      askBy:
        row.status === "playing" && undo.ask && undo.ask.len === moves.length
          ? undo.ask.by
          : 0,
      deniedBy: undo.denied?.by ?? 0,
      deniedAt: undo.denied?.at ?? 0,
      left: {
        1: UNDO_LIMIT - (undo.used["1"] ?? 0),
        2: UNDO_LIMIT - (undo.used["2"] ?? 0),
      },
    },
    ...(withRecords ? { records: { black: recA, white: recB } } : {}),
  };
}

/** 방 보기(바뀐 게 없으면 same) · 관전자 신호 */
export async function omokState(
  id: string,
  viewerId: string | null,
  knownVersion?: number,
  /** 관전자 화면이 몇 초마다 보내는 무작위 키 */
  watcher?: string,
  /** 두 사람 전적도(처음 · 시작 · 끝났을 때만) */
  withRecords = false,
) {
  const found = await prisma.omokGame
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!found) return null;
  const row = await settle(found);
  const isPlayer = Boolean(
    viewerId &&
    [row.blackId, row.whiteId, row.hostId, row.guestId].includes(viewerId),
  );
  if (
    watcher &&
    !isPlayer &&
    row.status !== "done" &&
    /^[a-z0-9]{8,40}$/.test(watcher)
  ) {
    const now = new Date();
    const nickname = viewerId
      ? ((
          await prisma.user
            .findUnique({ where: { id: viewerId }, select: { nickname: true } })
            .catch(() => null)
        )?.nickname ?? null)
      : null;
    await prisma.gameWatch
      .upsert({
        where: { gameId_viewer: { gameId: id, viewer: watcher } },
        create: { gameId: id, viewer: watcher, seenAt: now, nickname },
        update: { seenAt: now, nickname },
      })
      .catch(() => undefined);
    if (Math.random() < 0.02)
      await prisma.gameWatch
        .deleteMany({
          where: { seenAt: { lt: new Date(Date.now() - 86_400_000) } },
        })
        .catch(() => undefined);
  }
  const w =
    row.status !== "done" ? await watchersOf(id) : { count: 0, names: [] };
  if (knownVersion !== undefined && row.version === knownVersion)
    return {
      same: true as const,
      serverNow: Date.now(),
      watchers: w.count,
      watcherNames: w.names,
    };
  return {
    same: false as const,
    view: {
      ...(await toView(row, viewerId, withRecords)),
      watchers: w.count,
      watcherNames: w.names,
    },
  };
}

/** 방 코드로 방 찾기 */
export async function roomByCode(code: string) {
  const c = code.trim().toUpperCase();
  if (!ROOM_CODE_RE.test(c)) return null;
  return prisma.omokGame
    .findUnique({ where: { code: c }, select: { id: true, status: true } })
    .catch(() => null);
}

/** 방 만들기(이미 기다리는 내 방이 있으면 그 방) · 요괴가 없으면 NO_YOKAI */
export async function createOmok(
  hostId: string,
): Promise<{ id: string } | { error: string }> {
  if (!(await hasYokai(hostId))) return { error: NO_YOKAI };
  const open = await prisma.omokGame.findFirst({
    where: {
      hostId,
      status: "waiting",
      updatedAt: { gte: new Date(Date.now() - WAIT_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (open) return open;
  return makeRoom({ hostId });
}

async function makeRoom(data: { hostId: string; guestId?: string | null }) {
  for (let i = 0; i < 8; i += 1) {
    const code = Array.from(
      { length: 5 },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join("");
    const made = await prisma.omokGame
      .create({ data: { ...data, code }, select: { id: true } })
      .catch(() => null);
    if (made) return made;
  }
  throw new Error("방을 만들지 못했어요.");
}

export type OmokAction =
  | "join"
  | "sit"
  | "leave"
  | "ready"
  | "move"
  | "resign"
  | "cancel"
  | "emote"
  | "rematch"
  | "undo-ask"
  | "undo-yes"
  | "undo-no";
type ActResult =
  { ok: true; view: OmokView } | { ok: false; error: string; status: number };

export async function omokAct(
  id: string,
  userId: string,
  action: OmokAction,
  payload: { p?: unknown; e?: unknown; ready?: unknown },
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
  const done = async (withRecords = false) => {
    const fresh = await prisma.omokGame.findUnique({ where: { id } });
    if (fresh) await recordIfDone(fresh);
    const w =
      fresh?.status !== "done" ? await watchersOf(id) : { count: 0, names: [] };
    return {
      ok: true as const,
      view: {
        ...(await toView(
          fresh ?? row,
          userId,
          withRecords || fresh?.status === "done",
        )),
        watchers: w.count,
        watcherNames: w.names,
      },
    };
  };

  /* ── 대기실 ── */
  if (action === "join" || action === "sit") {
    if (userId === row.hostId || userId === row.guestId) return done(true);
    if (row.status !== "waiting")
      return fail("이미 시작했거나 끝난 대국이에요. 관전만 할 수 있어요.", 409);
    if (row.guestId)
      return fail("자리가 다 찼어요. 관전으로 볼 수 있어요.", 409);
    if (!(await hasYokai(userId))) return fail(NO_YOKAI, 403);
    const sat = await prisma.omokGame.updateMany({
      where: { id, status: "waiting", guestId: null },
      data: { guestId: userId, guestReady: false, version: { increment: 1 } },
    });
    if (sat.count !== 1)
      return fail("다른 사람이 먼저 앉았어요. 관전으로 볼 수 있어요.", 409);
    const guest = await prisma.user
      .findUnique({ where: { id: userId }, select: { nickname: true } })
      .catch(() => null);
    const { notifyUser } = await import("@/lib/push");
    await notifyUser(row.hostId, {
      title: "⚔️ 오목 상대가 앉았어요!",
      body: `${guest?.nickname ?? "친구"}님이 착석했어요. READY를 누르면 시작해요!`,
      url: `/games/omok/${id}`,
    }).catch(() => undefined);
    return done(true);
  }

  if (action === "leave") {
    if (row.status !== "waiting" || userId !== row.guestId)
      return fail("대기실 손님만 일어날 수 있어요.", 403);
    await prisma.omokGame.updateMany({
      where: { id, status: "waiting", guestId: userId },
      data: {
        guestId: null,
        guestReady: false,
        hostReady: false,
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "ready") {
    if (row.status !== "waiting")
      return fail("대기실에서만 READY할 수 있어요.", 409);
    const isHostSeat = userId === row.hostId;
    if (!isHostSeat && userId !== row.guestId)
      return fail("자리에 앉아야 READY할 수 있어요.", 403);
    const ready = payload.ready !== false;
    await prisma.omokGame.updateMany({
      where: { id, status: "waiting" },
      data: {
        ...(isHostSeat ? { hostReady: ready } : { guestReady: ready }),
        version: { increment: 1 },
      },
    });
    // 둘 다 READY면 시작(흑백 무작위)
    const fresh = await prisma.omokGame.findUnique({ where: { id } });
    if (
      fresh &&
      fresh.status === "waiting" &&
      fresh.guestId &&
      fresh.hostReady &&
      fresh.guestReady
    ) {
      const hostBlack = randomInt(2) === 0;
      await prisma.omokGame.updateMany({
        where: {
          id,
          status: "waiting",
          hostReady: true,
          guestReady: true,
          guestId: fresh.guestId,
        },
        data: {
          status: "playing",
          blackId: hostBlack ? fresh.hostId : fresh.guestId,
          whiteId: hostBlack ? fresh.guestId : fresh.hostId,
          turnAt: new Date(),
          version: { increment: 1 },
        },
      });
      return done(true);
    }
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

  /* ── 대국 ── */
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
        undoJson: JSON.stringify({ ...undoOf(row), ask: null }),
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

  if (action === "emote") {
    const seat: Stone =
      mine ||
      (row.status === "waiting"
        ? userId === row.hostId
          ? BLACK
          : userId === row.guestId
            ? WHITE
            : 0
        : 0);
    if (!seat) return fail("대국하는 사람만 보낼 수 있어요.", 403);
    const e = String(payload.e ?? "");
    if (!(OMOK_EMOTES as readonly string[]).includes(e))
      return fail("보낼 수 없는 이모티콘이에요.");
    await prisma.omokGame.update({
      where: { id },
      data: {
        emoteJson: JSON.stringify({ by: seat, e, at: now.getTime() }),
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "undo-ask") {
    if (!mine) return fail("대국하는 사람만 물리기를 할 수 있어요.", 403);
    if (row.status !== "playing")
      return fail("진행 중인 대국이 아니에요.", 409);
    const moves = movesOf(row);
    const undo = undoOf(row);
    if (!moves.some((_, i) => colorOfMove(i) === mine))
      return fail("아직 둔 수가 없어요.");
    if ((undo.used[String(mine)] ?? 0) >= UNDO_LIMIT)
      return fail(`물리기는 한 판에 ${UNDO_LIMIT}번까지예요.`);
    if (undo.ask && undo.ask.len === moves.length)
      return fail("이미 물리기를 요청했어요. 상대 대답을 기다려 주세요.", 409);
    const saved = await prisma.omokGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: {
        undoJson: JSON.stringify({
          ...undo,
          ask: { by: mine, at: now.getTime(), len: moves.length },
        }),
        version: { increment: 1 },
      },
    });
    if (saved.count !== 1) return fail("판이 바뀌었어요. 다시 해 주세요.", 409);
    return done();
  }

  if (action === "undo-yes" || action === "undo-no") {
    if (!mine) return fail("대국하는 사람만 대답할 수 있어요.", 403);
    const moves = movesOf(row);
    const undo = undoOf(row);
    if (row.status !== "playing" || !undo.ask || undo.ask.len !== moves.length)
      return fail("지금은 물리기 요청이 없어요.", 409);
    if (undo.ask.by === mine) return fail("상대가 대답할 차례예요.", 409);
    const by = undo.ask.by;
    if (action === "undo-no") {
      await prisma.omokGame.updateMany({
        where: { id, version: row.version },
        data: {
          undoJson: JSON.stringify({
            ...undo,
            ask: null,
            denied: { by, at: now.getTime() },
          }),
          version: { increment: 1 },
        },
      });
      return done();
    }
    // 요청한 사람의 마지막 수까지 되돌림(그 뒤에 둔 상대 수도) → 요청한 사람 차례
    let cut = moves.length - 1;
    while (cut >= 0 && colorOfMove(cut) !== by) cut -= 1;
    if (cut < 0) return fail("되돌릴 수가 없어요.");
    const saved = await prisma.omokGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: {
        movesJson: JSON.stringify(moves.slice(0, cut)),
        turnAt: now,
        undoJson: JSON.stringify({
          ask: null,
          denied: null,
          used: {
            ...undo.used,
            [String(by)]: (undo.used[String(by)] ?? 0) + 1,
          },
        }),
        version: { increment: 1 },
      },
    });
    if (saved.count !== 1) return fail("판이 바뀌었어요. 다시 해 주세요.", 409);
    return done();
  }

  if (action === "rematch") {
    if (!mine) return fail("대국한 사람만 한 판 더 할 수 있어요.", 403);
    if (row.status !== "done" || !row.blackId || !row.whiteId)
      return fail("끝난 대국에서만 할 수 있어요.", 409);
    if (row.nextId) return done();
    // 다음 판: 같은 두 사람이 대기실에 앉은 채로(둘 다 READY 누르면 시작)
    const other = userId === row.blackId ? row.whiteId : row.blackId;
    const next = await makeRoom({ hostId: userId, guestId: other });
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

/** 로비: 대기 중인 방 · 지금 대국 중(관전) · 내 최근 대국 */
export async function omokLobby(userId: string | null) {
  const cache = new Map<string, OmokPlayer | null>();
  const [waiting, live, recent] = await Promise.all([
    prisma.omokGame.findMany({
      where: {
        status: "waiting",
        updatedAt: { gte: new Date(Date.now() - WAIT_MS) },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.omokGame.findMany({
      where: {
        status: "playing",
        updatedAt: { gte: new Date(Date.now() - 10 * 60_000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    userId
      ? prisma.omokGame.findMany({
          where: {
            status: "done",
            endReason: { not: "cancel" },
            OR: [{ blackId: userId }, { whiteId: userId }],
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);
  const card = async (row: Row) => ({
    id: row.id,
    code: row.code,
    host: (await player(row.hostId, cache))?.nickname ?? "?",
    guest: (await player(row.guestId, cache))?.nickname ?? null,
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
    waiting: await Promise.all(waiting.map(card)),
    live: await Promise.all(live.map(card)),
    recent: await Promise.all(recent.map(card)),
  };
}
