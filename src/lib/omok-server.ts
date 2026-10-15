import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { roomTitle } from "@/lib/game-room";
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
import { isOniEmote } from "@/lib/omok-emotes";
import { gameRecord, headToHead, recordGameResult } from "@/lib/game-stats";

/**
 * 요괴 오목 친구 대전(서버가 차례 · 금수 · 승패 · 시간을 판정).
 * 방 = 방 코드(5글자) + 대기실(방장 자리 · 손님 자리 · 둘 다 READY면 시작) → 대국 → 결과.
 * 화면은 1초마다 version만 물어보고, 바뀌었을 때만 판 전체를 받음.
 * 공개(기본): 누구나 로비 · 방 만들기 · AI 대전. 다시 닫으려면 GAMES_PUBLIC=0(그때는 마스터만).
 * 요괴가 없으면 방을 만들거나 앉을 수 없음(요괴 고르기로).
 */
export function gamesOpen(
  user: { isMaster?: boolean | null } | null | undefined,
) {
  return Boolean(user?.isMaster) || process.env.GAMES_PUBLIC !== "0";
}

/** 대기실은 마지막 움직임 뒤 60분이면 닫힘 */
const WAIT_MS = 60 * 60_000;
/** 시간 초과 판정 여유(네트워크) */
const GRACE_MS = 3_000;
/** 대국자 이모티콘 · 관전자 응원 = 오니 이모티콘 */
export { ONI_EMOTES as OMOK_EMOTES } from "@/lib/omok-emotes";
/** 한 판에 물리기 요청 횟수(사람마다) */
export const UNDO_LIMIT = 3;
/** 방 코드: 헷갈리는 글자(0 O 1 I L) 뺀 5글자 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_RE = /^[A-HJKMNP-Z2-9]{5}$/;
export const NO_YOKAI = "NO_YOKAI";

/** 무승부 제안(상대가 받아야 무승부) · 사람마다 한 판에 3번 */
export const DRAW_LIMIT = 3;
type DrawState = {
  offer: { by: Stone; at: number; len: number } | null;
  used: Record<string, number>;
  denied: { by: Stone; at: number } | null;
};
type UndoState = {
  ask: { by: Stone; at: number; len: number } | null;
  used: Record<string, number>;
  denied: { by: Stone; at: number } | null;
  draw: DrawState;
};
function undoOf(row: { undoJson: string }): UndoState {
  try {
    const v = row.undoJson ? JSON.parse(row.undoJson) : null;
    return {
      ask: v?.ask ?? null,
      used: v?.used ?? {},
      denied: v?.denied ?? null,
      draw: {
        offer: v?.draw?.offer ?? null,
        used: v?.draw?.used ?? {},
        denied: v?.draw?.denied ?? null,
      },
    };
  } catch {
    return {
      ask: null,
      used: {},
      denied: null,
      draw: { offer: null, used: {}, denied: null },
    };
  }
}

type Cheer = { n: string; e: string; at: number };
/** 이모티콘 칸(JSON): 대국자 마지막 이모티콘 + 관전자 응원(최근 15초 · 8개) */
function emoteStateOf(row: { emoteJson: string }): {
  last: { by: Stone; e: string; at: number } | null;
  cheers: Cheer[];
} {
  try {
    const v = row.emoteJson ? JSON.parse(row.emoteJson) : null;
    const last =
      v && typeof v.e === "string" && typeof v.at === "number"
        ? { by: v.by as Stone, e: v.e as string, at: v.at as number }
        : null;
    const cheers = Array.isArray(v?.cheers)
      ? (v.cheers as Cheer[]).filter(
          (c) => c && typeof c.n === "string" && typeof c.e === "string",
        )
      : [];
    return { last, cheers };
  } catch {
    return { last: null, cheers: [] };
  }
}

type QueueEntry = { id: string; n: string; at: number };
/** 다음 판 도전 줄(최대 10명) */
function queueOf(row: { queueJson: string }): QueueEntry[] {
  try {
    const v = row.queueJson ? JSON.parse(row.queueJson) : [];
    return Array.isArray(v)
      ? v
          .filter(
            (q) => q && typeof q.id === "string" && typeof q.n === "string",
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
/** 끝난 뒤 이 시간 동안은 줄 맨 앞 사람만 도전 */
const QUEUE_HEAD_MS = 60_000;

/** 방장이 내보낸 회원 */
function kickedOf(row: { kickedJson: string }): string[] {
  try {
    const v = row.kickedJson ? JSON.parse(row.kickedJson) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
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
  /** 방 제목(비면 「방장의 방」) */
  title: string;
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
  /** 관전자 응원(최근 것) */
  cheers: Cheer[];
  /** 다음 판 도전 줄(닉네임 순서) · 내 순서(0 = 줄 안 섬) · 지금 도전할 수 있는지 */
  queue: string[];
  queueMine: number;
  canChallenge: boolean;
  isPrivate: boolean;
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
  records?: {
    black: OmokRecord | null;
    white: OmokRecord | null;
    /** 두 사람 상대 전적: black(대기실은 방장) 승 · white(손님) 승 · 무 */
    h2h: { a: number; b: number; draws: number } | null;
  };
  /** 무승부 제안: 지금 제안한 사람 · 거절 · 남은 횟수 */
  draw: {
    offerBy: Stone;
    deniedBy: Stone;
    deniedAt: number;
    left: Record<1 | 2, number>;
  };
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
/**
 * 판이 끝났는데 도전 줄이 있으면 바로 다음 판: 이긴 사람(무승부면 흑)은 남고 줄 1번이 앉음.
 * 진 사람 · 관전자 화면은 다음 판으로 넘어가 관전(진 사람은 자동으로 관전석). 남은 줄은 다음 판으로 이어짐.
 */
async function autoQueueNext(row: Row) {
  if (row.status !== "done" || row.endReason === "cancel" || row.nextId || !row.blackId || !row.whiteId) return;
  const stay = row.winner === WHITE ? row.whiteId : row.blackId;
  const q = queueOf(row).filter((e) => e.id !== row.blackId && e.id !== row.whiteId);
  const head = q[0];
  if (!head) return;
  const next = await makeRoom({
    hostId: stay,
    guestId: head.id,
    isPrivate: row.isPrivate,
    title: row.title,
    queueJson: JSON.stringify(q.slice(1)),
  });
  const linked = await prisma.omokGame.updateMany({
    where: { id: row.id, nextId: null },
    data: { nextId: next.id, version: { increment: 1 } },
  });
  if (linked.count !== 1) {
    await prisma.omokGame.delete({ where: { id: next.id } }).catch(() => undefined);
    return;
  }
  const { notifyUser } = await import("@/lib/push");
  await notifyUser(head.id, {
    title: "⚔️ 오목 도전 차례예요!",
    body: "다음 판에 자리가 잡혔어요. 들어가서 READY를 눌러 주세요.",
    url: `/games/omok/${next.id}`,
  }).catch(() => undefined);
}

async function recordIfDone(row: Row) {
  await autoQueueNext(row).catch(() => undefined);
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
      // 대국자 자리 신호(p:회원id)는 관전자 수에서 뺌
      where: {
        gameId,
        seenAt: { gte: new Date(Date.now() - WATCH_MS) },
        NOT: { viewer: { startsWith: "p:" } },
      },
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

/** 대기실 자리 신호: 방장이 이만큼 안 보이면 방을 닫고, 손님이 안 보이면 자리에서 일어남 */
const HOST_AWAY_MS = 90_000;
const GUEST_AWAY_MS = 60_000;

/** 시간 초과 · 비어 있는 대기실 정리(볼 때마다 · 원자적으로) */
async function settle(row: Row): Promise<Row> {
  const now = Date.now();
  if (row.status === "waiting") {
    const seen = await prisma.gameWatch
      .findMany({
        where: {
          gameId: row.id,
          viewer: {
            in: [
              `p:${row.hostId}`,
              ...(row.guestId ? [`p:${row.guestId}`] : []),
            ],
          },
        },
        select: { viewer: true, seenAt: true },
      })
      .catch(() => []);
    const lastSeen = (uid: string) =>
      seen.find((r) => r.viewer === `p:${uid}`)?.seenAt.getTime() ?? 0;
    // 방장: 방을 만든 지 90초가 지났는데 90초 넘게 안 보이면 방 닫기
    if (
      now - row.createdAt.getTime() > HOST_AWAY_MS &&
      now - Math.max(lastSeen(row.hostId), row.createdAt.getTime()) >
        HOST_AWAY_MS
    ) {
      await prisma.omokGame.updateMany({
        where: { id: row.id, status: "waiting" },
        data: {
          status: "done",
          endReason: "cancel",
          version: { increment: 1 },
        },
      });
      return (
        (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? row
      );
    }
    // 손님: 60초 넘게 안 보이면 자리에서 일어남(READY도 풀림)
    if (
      row.guestId &&
      now - Math.max(lastSeen(row.guestId), row.updatedAt.getTime()) >
        GUEST_AWAY_MS
    ) {
      await prisma.omokGame.updateMany({
        where: { id: row.id, status: "waiting", guestId: row.guestId },
        data: {
          guestId: null,
          guestReady: false,
          hostReady: false,
          version: { increment: 1 },
        },
      });
      return (
        (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? row
      );
    }
  }
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
    return (await prisma.omokGame.findUnique({ where: { id: row.id } })) ?? fresh;
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
  const emoteState = emoteStateOf(row);
  const emote = emoteState.last;
  // 대기실 전적: 방장(흑 자리) · 손님(백 자리)로 보여 줌
  const idA = row.blackId ?? row.hostId;
  const idB = row.whiteId ?? row.guestId;
  const recA = withRecords ? await recordOf(idA) : null;
  const recB = withRecords ? await recordOf(idB) : null;
  const h2h =
    withRecords && idA && idB
      ? await headToHead("omok", idA, idB).catch(() => null)
      : null;
  return {
    id: row.id,
    code: row.code,
    title: roomTitle(row.title, host?.nickname ?? "?"),
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
    cheers: emoteState.cheers.filter((c) => Date.now() - c.at < 15_000),
    queue: queueOf(row).map((q) => q.n),
    queueMine: viewerId
      ? queueOf(row).findIndex((q) => q.id === viewerId) + 1
      : 0,
    canChallenge: (() => {
      if (
        row.status !== "done" ||
        row.endReason === "cancel" ||
        row.nextId ||
        !viewerId
      )
        return false;
      if (viewerId === row.blackId || viewerId === row.whiteId) return false;
      const q = queueOf(row);
      return (
        !q.length ||
        q[0].id === viewerId ||
        Date.now() - row.updatedAt.getTime() > QUEUE_HEAD_MS
      );
    })(),
    isPrivate: row.isPrivate,
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
    draw: {
      offerBy:
        row.status === "playing" &&
        undo.draw.offer &&
        undo.draw.offer.len === moves.length
          ? undo.draw.offer.by
          : 0,
      deniedBy: undo.draw.denied?.by ?? 0,
      deniedAt: undo.draw.denied?.at ?? 0,
      left: {
        1: DRAW_LIMIT - (undo.draw.used["1"] ?? 0),
        2: DRAW_LIMIT - (undo.draw.used["2"] ?? 0),
      },
    },
    ...(withRecords ? { records: { black: recA, white: recB, h2h } } : {}),
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
    isPlayer &&
    viewerId &&
    row.status !== "done" &&
    /^[a-z0-9]{8,40}$/.test(watcher)
  ) {
    const now = new Date();
    await prisma.gameWatch
      .upsert({
        where: { gameId_viewer: { gameId: id, viewer: `p:${viewerId}` } },
        create: { gameId: id, viewer: `p:${viewerId}`, seenAt: now },
        update: { seenAt: now },
      })
      .catch(() => undefined);
  }
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
  opts: { isPrivate?: boolean; title?: string } = {},
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
  if (open) {
    await prisma.omokGame
      .update({
        where: { id: open.id },
        data: { isPrivate: Boolean(opts.isPrivate), title: opts.title ?? "" },
      })
      .catch(() => undefined);
    return open;
  }
  return makeRoom({ hostId, isPrivate: Boolean(opts.isPrivate), title: opts.title ?? "" });
}

async function makeRoom(data: {
  hostId: string;
  guestId?: string | null;
  isPrivate?: boolean;
  queueJson?: string;
  title?: string;
}) {
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
  | "kick"
  | "exit"
  | "challenge"
  | "queue-join"
  | "queue-leave"
  | "cheer"
  | "ready"
  | "move"
  | "resign"
  | "cancel"
  | "emote"
  | "rematch"
  | "undo-ask"
  | "undo-yes"
  | "undo-no"
  | "draw-offer"
  | "draw-yes"
  | "draw-no";
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
    let fresh = await prisma.omokGame.findUnique({ where: { id } });
    if (fresh) await recordIfDone(fresh);
    // 줄 자동 교대로 다음 판이 막 생겼으면 그것까지 담아서
    if (fresh?.status === "done" && !fresh.nextId)
      fresh = (await prisma.omokGame.findUnique({ where: { id } })) ?? fresh;
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
    if (kickedOf(row).includes(userId))
      return fail(
        "방장이 내보낸 방이라 다시 앉을 수 없어요. 관전만 할 수 있어요.",
        403,
      );
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
        undoJson: JSON.stringify({
          ...undoOf(row),
          ask: null,
          draw: { ...undoOf(row).draw, offer: null },
        }),
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
    if (!isOniEmote(e)) return fail("보낼 수 없는 이모티콘이에요.");
    await prisma.omokGame.update({
      where: { id },
      data: {
        emoteJson: JSON.stringify({
          by: seat,
          e,
          at: now.getTime(),
          cheers: emoteStateOf(row).cheers.filter(
            (c) => now.getTime() - c.at < 15_000,
          ),
        }),
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
          ...undo,
          ask: null,
          denied: null,
          draw: { ...undo.draw, offer: null },
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

  if (action === "cheer") {
    // 관전자 응원(로그인 · 대국자가 아닌 사람) · 같은 사람은 2.5초에 한 번
    if (mine || userId === row.hostId || userId === row.guestId)
      return fail("대국하는 사람은 이모티콘 버튼을 써 주세요.", 403);
    if (row.status === "done") return fail("끝난 대국이에요.", 409);
    const e = String(payload.e ?? "");
    if (!isOniEmote(e)) return fail("보낼 수 없는 이모티콘이에요.");
    const me = await prisma.user
      .findUnique({ where: { id: userId }, select: { nickname: true } })
      .catch(() => null);
    if (!me) return fail("로그인해 주세요.", 401);
    const st = emoteStateOf(row);
    const t = now.getTime();
    if (st.cheers.some((c) => c.n === me.nickname && t - c.at < 2500))
      return done();
    const cheers = [
      ...st.cheers.filter((c) => t - c.at < 15_000),
      { n: me.nickname, e, at: t },
    ].slice(-8);
    await prisma.omokGame.update({
      where: { id },
      data: {
        emoteJson: JSON.stringify({ ...(st.last ?? {}), cheers }),
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "exit") {
    // 나가기: 대기실 방장 = 방 닫기 · 손님 = 일어나기 · 대국 중 = 기권 · 그 밖엔 그냥 나감
    if (row.status === "waiting" && userId === row.hostId) {
      await prisma.omokGame.updateMany({
        where: { id, status: "waiting" },
        data: {
          status: "done",
          endReason: "cancel",
          version: { increment: 1 },
        },
      });
    } else if (row.status === "waiting" && userId === row.guestId) {
      await prisma.omokGame.updateMany({
        where: { id, status: "waiting", guestId: userId },
        data: {
          guestId: null,
          guestReady: false,
          hostReady: false,
          version: { increment: 1 },
        },
      });
    } else if (row.status === "playing" && mine) {
      await prisma.omokGame.updateMany({
        where: { id, status: "playing" },
        data: {
          status: "done",
          winner: mine === BLACK ? WHITE : BLACK,
          endReason: "resign",
          version: { increment: 1 },
        },
      });
    }
    await prisma.gameWatch
      .deleteMany({ where: { gameId: id, viewer: `p:${userId}` } })
      .catch(() => undefined);
    return done();
  }

  if (action === "queue-join" || action === "queue-leave") {
    const q = queueOf(row);
    if (action === "queue-leave") {
      await prisma.omokGame.update({
        where: { id },
        data: {
          queueJson: JSON.stringify(q.filter((e) => e.id !== userId)),
          version: { increment: 1 },
        },
      });
      return done();
    }
    if (mine || userId === row.hostId || userId === row.guestId)
      return fail("대국하는 사람은 줄을 설 수 없어요.", 409);
    if (row.status === "waiting" || row.nextId)
      return fail("지금은 줄을 설 수 없어요.", 409);
    if (q.some((e) => e.id === userId)) return done();
    if (q.length >= 10) return fail("도전 줄이 가득 찼어요(10명).", 409);
    if (!(await hasYokai(userId))) return fail(NO_YOKAI, 403);
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });
    await prisma.omokGame.update({
      where: { id },
      data: {
        queueJson: JSON.stringify([
          ...q,
          { id: userId, n: me?.nickname ?? "?", at: now.getTime() },
        ]),
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "challenge") {
    // 끝난 판의 관전자가 다음 판 도전: 이긴 사람(무승부면 흑)과 둘이 앉은 새 대기실
    if (
      row.status !== "done" ||
      row.endReason === "cancel" ||
      !row.blackId ||
      !row.whiteId
    )
      return fail("끝난 대국에서만 도전할 수 있어요.", 409);
    if (userId === row.blackId || userId === row.whiteId)
      return fail("대국한 사람은 「한 판 더」를 눌러 주세요.", 409);
    if (row.nextId)
      return fail("이미 다음 판이 열렸어요. 다음 판을 관전해 주세요.", 409);
    if (!(await hasYokai(userId))) return fail(NO_YOKAI, 403);
    const q = queueOf(row);
    if (
      q.length &&
      q[0].id !== userId &&
      Date.now() - row.updatedAt.getTime() <= QUEUE_HEAD_MS
    )
      return fail(`도전 줄 순서예요. 지금은 ${q[0].n}님 차례예요.`, 409);
    const stay = row.winner === WHITE ? row.whiteId : row.blackId;
    // 남은 줄은 다음 판으로 이어짐(나 · 남는 사람 빼고)
    const rest = q.filter((e) => e.id !== userId && e.id !== stay);
    const next = await makeRoom({
      hostId: stay,
      guestId: userId,
      isPrivate: row.isPrivate,
      title: row.title,
      queueJson: JSON.stringify(rest),
    });
    const linked = await prisma.omokGame.updateMany({
      where: { id, nextId: null },
      data: { nextId: next.id, version: { increment: 1 } },
    });
    if (linked.count !== 1) {
      await prisma.omokGame
        .delete({ where: { id: next.id } })
        .catch(() => undefined);
      return fail("다른 사람이 먼저 도전했어요.", 409);
    }
    return done();
  }

  if (action === "kick") {
    if (userId !== row.hostId || row.status !== "waiting" || !row.guestId)
      return fail("대기실의 방장만 손님을 내보낼 수 있어요.", 403);
    const kicked = [...new Set([...kickedOf(row), row.guestId])].slice(-20);
    await prisma.omokGame.updateMany({
      where: { id, status: "waiting", guestId: row.guestId },
      data: {
        guestId: null,
        guestReady: false,
        hostReady: false,
        kickedJson: JSON.stringify(kicked),
        version: { increment: 1 },
      },
    });
    return done();
  }

  if (action === "draw-offer") {
    if (!mine) return fail("대국하는 사람만 무승부를 제안할 수 있어요.", 403);
    if (row.status !== "playing")
      return fail("진행 중인 대국이 아니에요.", 409);
    const moves = movesOf(row);
    const st = undoOf(row);
    if ((st.draw.used[String(mine)] ?? 0) >= DRAW_LIMIT)
      return fail(`무승부 제안은 한 판에 ${DRAW_LIMIT}번까지예요.`);
    if (st.draw.offer && st.draw.offer.len === moves.length)
      return fail("이미 무승부를 제안했어요. 상대 대답을 기다려 주세요.", 409);
    const saved = await prisma.omokGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: {
        undoJson: JSON.stringify({
          ...st,
          draw: {
            ...st.draw,
            offer: { by: mine, at: now.getTime(), len: moves.length },
            used: {
              ...st.draw.used,
              [String(mine)]: (st.draw.used[String(mine)] ?? 0) + 1,
            },
          },
        }),
        version: { increment: 1 },
      },
    });
    if (saved.count !== 1) return fail("판이 바뀌었어요. 다시 해 주세요.", 409);
    return done();
  }

  if (action === "draw-yes" || action === "draw-no") {
    if (!mine) return fail("대국하는 사람만 대답할 수 있어요.", 403);
    const moves = movesOf(row);
    const st = undoOf(row);
    const offer = st.draw.offer;
    if (row.status !== "playing" || !offer || offer.len !== moves.length)
      return fail("지금은 무승부 제안이 없어요.", 409);
    if (offer.by === mine) return fail("상대가 대답할 차례예요.", 409);
    if (action === "draw-no") {
      await prisma.omokGame.updateMany({
        where: { id, version: row.version },
        data: {
          undoJson: JSON.stringify({
            ...st,
            draw: {
              ...st.draw,
              offer: null,
              denied: { by: offer.by, at: now.getTime() },
            },
          }),
          version: { increment: 1 },
        },
      });
      return done();
    }
    // 두 사람이 합의한 무승부
    const saved = await prisma.omokGame.updateMany({
      where: { id, version: row.version, status: "playing" },
      data: {
        status: "done",
        winner: 0,
        endReason: "draw-agree",
        undoJson: JSON.stringify({ ...st, draw: { ...st.draw, offer: null } }),
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
    const next = await makeRoom({
      hostId: userId,
      guestId: other,
      isPrivate: row.isPrivate,
      title: row.title,
      queueJson: row.queueJson,
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

/** 로비: 대기 중인 방 · 지금 대국 중(관전) · 내 최근 대국 */
export async function omokLobby(userId: string | null) {
  const cache = new Map<string, OmokPlayer | null>();
  const [waiting, live, recent] = await Promise.all([
    prisma.omokGame.findMany({
      where: {
        status: "waiting",
        isPrivate: false,
        updatedAt: { gte: new Date(Date.now() - WAIT_MS) },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.omokGame.findMany({
      where: {
        status: "playing",
        isPrivate: false,
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
  // 비어 있는 대기실은 여기서 정리(방장이 안 보이면 닫힘)
  const settled = (
    await Promise.all(waiting.map((r) => settle(r).catch(() => r)))
  ).filter((r) => r.status === "waiting");
  const latest = await prisma.omokGame.findMany({
    where: {
      status: "done",
      endReason: { not: "cancel" },
      blackId: { not: null },
      isPrivate: false,
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  const card = async (row: Row) => ({
    id: row.id,
    code: row.code,
    host: (await player(row.hostId, cache))?.nickname ?? "?",
    title: roomTitle(row.title, (await player(row.hostId, cache))?.nickname ?? "?"),
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
    waiting: await Promise.all(settled.map(card)),
    latest: await Promise.all(latest.map(card)),
    live: await Promise.all(live.map(card)),
    recent: await Promise.all(recent.map(card)),
  };
}
