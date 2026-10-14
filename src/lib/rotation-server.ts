import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  INTERVAL_MAX,
  INTERVAL_MIN,
  MAX_DEALERS,
  MAX_GAMES,
  MAX_ROSTERS,
  ROSTER_TEXT_MAX,
  TRASH_DAYS,
  kstDate,
  labelText,
  kstDateAt,
  normalizeWorkDate,
  shareExpired,
  normalizeTime,
  parseTableLabels,
  tableLabelsOf,
  toDealerStatus,
  type RotationAction,
  type RotationShareView,
  type RotationStateView,
  type TableState,
} from "@/lib/rotation";
import { remapPlanTables, type RotationPlan } from "@/lib/rotation-plan";

/** 게임 목록에 보여 줄 개수(정리 창에서 전부 골라 지울 수 있게 상한만큼) */
const GAME_LIST = MAX_GAMES;
const GAME_ORDER = [{ workDate: { sort: "desc" as const, nulls: "last" as const } }, { createdAt: "desc" as const }];
/** ToolSaved 종류: 딜러 명단 · 지운 게임(휴지통) */
const KIND_ROSTER = "roster";
const KIND_TRASH = "rotation-trash";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type MetaRow = Awaited<ReturnType<typeof prisma.rotationMeta.findUniqueOrThrow>>;
type DealerRow = Awaited<ReturnType<typeof prisma.rotationDealer.findFirstOrThrow>>;
/** 휴지통에 담는 게임 통째(날짜는 글자로) */
type TrashSnapshot = {
  meta: Omit<MetaRow, "createdAt" | "dayStartedAt"> & { createdAt: string; dayStartedAt: string };
  dealers: (Omit<DealerRow, "statusSince" | "checkedInAt" | "leftAt" | "createdAt"> & {
    statusSince: string;
    checkedInAt: string | null;
    leftAt: string | null;
    createdAt: string;
  })[];
};

/** 게임 지우기 = 휴지통으로(TRASH_DAYS일 안에 되살릴 수 있음) */
async function moveToTrash(tx: Tx, ownerId: string, ids: string[]) {
  if (ids.length === 0) return;
  const metas = await tx.rotationMeta.findMany({ where: { ownerId, id: { in: ids } } });
  const dealers = await tx.rotationDealer.findMany({ where: { gameId: { in: metas.map((m) => m.id) } } });
  await tx.toolSaved.createMany({
    data: metas.map((m) => ({
      ownerId,
      kind: KIND_TRASH,
      name: `${m.workDate ?? ""}|${m.name}`,
      dataJson: JSON.stringify({
        meta: { ...m, createdAt: m.createdAt.toISOString(), dayStartedAt: m.dayStartedAt.toISOString() },
        dealers: dealers
          .filter((d) => d.gameId === m.id)
          .map((d) => ({
            ...d,
            statusSince: d.statusSince.toISOString(),
            checkedInAt: d.checkedInAt?.toISOString() ?? null,
            leftAt: d.leftAt?.toISOString() ?? null,
            createdAt: d.createdAt.toISOString(),
          })),
      } satisfies TrashSnapshot),
    })),
  });
  await tx.rotationDealer.deleteMany({ where: { gameId: { in: metas.map((m) => m.id) } } });
  await tx.rotationMeta.deleteMany({ where: { ownerId, id: { in: metas.map((m) => m.id) } } });
}

/** 시간표 칸 수 상한(5분 간격 24시간 = 288칸) */
const MAX_SLOTS = 300;

/**
 * 게임 찾기(계정마다 따로): 주어진 게임(이 계정 것만) → 없으면 이 계정의 가장 최근 날짜 게임
 * → 하나도 없으면 오늘 날짜로 새로 만듭니다. 다른 계정의 게임은 절대 돌려주지 않습니다.
 */
async function resolveGame(ownerId: string, gameId?: string | null) {
  let game = gameId ? await prisma.rotationMeta.findFirst({ where: { id: gameId, ownerId } }) : null;
  game ??= await prisma.rotationMeta.findFirst({ where: { ownerId }, orderBy: GAME_ORDER });
  // 처음 만드는 게임도 새 게임과 같이 테이블 0개로 시작(DB 기본값 20개를 쓰지 않음)
  game ??= await prisma.rotationMeta.create({ data: { id: randomUUID(), ownerId, workDate: kstDate(), tableCount: 0, tableLabels: "" } });
  if (!game.workDate) game = await prisma.rotationMeta.update({ where: { id: game.id }, data: { workDate: kstDate(game.createdAt) } });
  return game;
}

function parseTableState(json: string | null): Record<string, TableState> {
  if (!json) return {};
  try {
    const value = JSON.parse(json) as Record<string, TableState>;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function parsePlan(json: string | null): RotationPlan | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as RotationPlan;
  } catch {
    return null;
  }
}

/** 이 계정의 게임 하나 상태 전체(게임을 안 주면 가장 최근 게임) */
export async function loadRotation(ownerId: string, gameId?: string | null): Promise<RotationStateView> {
  const m = await resolveGame(ownerId, gameId);
  // 휴지통: TRASH_DAYS일 지난 게임은 완전히 지움
  await prisma.toolSaved
    .deleteMany({ where: { ownerId, kind: KIND_TRASH, createdAt: { lt: new Date(Date.now() - TRASH_DAYS * 86_400_000) } } })
    .catch(() => undefined);
  const [dealers, games, rosterRows, trashRows] = await Promise.all([
    prisma.rotationDealer.findMany({ where: { gameId: m.id }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] }),
    prisma.rotationMeta.findMany({ where: { ownerId }, orderBy: GAME_ORDER, take: GAME_LIST, select: { id: true, name: true, workDate: true } }),
    // 명단은 내용까지, 휴지통은 이름만(내용은 되살릴 때 읽음)
    prisma.toolSaved
      .findMany({ where: { ownerId, kind: KIND_ROSTER }, orderBy: { createdAt: "asc" }, take: MAX_ROSTERS, select: { id: true, name: true, dataJson: true } })
      .catch(() => []),
    prisma.toolSaved
      .findMany({ where: { ownerId, kind: KIND_TRASH }, orderBy: { createdAt: "desc" }, take: MAX_GAMES, select: { id: true, name: true, createdAt: true } })
      .catch(() => []),
  ]);
  const rosters = rosterRows.map((s) => ({ id: s.id, name: s.name, text: s.dataJson }));
  const trash = trashRows
    .map((s) => {
      const [workDate, ...rest] = s.name.split("|");
      return { id: s.id, name: rest.join("|") || "게임", workDate: workDate || null, deletedAt: s.createdAt.toISOString() };
    });
  return {
    rosters,
    trash,
    game: { id: m.id, name: m.name, workDate: m.workDate },
    games,
    shareToken: m.shareToken,
    maxStreakMinutes: m.maxStreakMinutes,
    shareDays: m.shareDays,
    version: m.version,
    tableCount: m.tableCount,
    tableLabels: tableLabelsOf({ tableCount: m.tableCount, tableLabels: m.tableLabels ? parseTableLabels(m.tableLabels).labels : null }),
    setupMinutes: m.setupMinutes,
    tableState: parseTableState(m.tableStateJson),
    interval: m.interval,
    planStart: m.planStart,
    planEnd: m.planEnd,
    plan: parsePlan(m.planJson),
    dealers: dealers.map((d) => ({
      id: d.id,
      name: d.name,
      startTime: d.startTime,
      endTime: d.endTime ?? null,
      status: toDealerStatus(d.status),
      checkedInAt: d.checkedInAt?.toISOString() ?? null,
      leftAt: d.leftAt?.toISOString() ?? null,
      sort: d.sort,
    })),
  };
}

export async function rotationVersion(ownerId: string, gameId?: string | null) {
  if (!gameId) return (await resolveGame(ownerId)).version;
  const game = await prisma.rotationMeta.findFirst({ where: { id: gameId, ownerId }, select: { version: true } });
  return game?.version ?? -1;
}

/** 보기 전용 공유: 링크 값으로 찾은 게임(공유를 끄면 null). 로그인 없이 봅니다. */
export async function loadShared(token: string): Promise<RotationShareView | null> {
  const found = await lookupShared(token);
  return "view" in found ? found.view : null;
}

/**
 * 공유 링크 열기 + 못 열면 까닭: missing(링크가 없거나 공유를 끄고 다시 켜 바뀜) · expired(근무일 다음 날이 지나 닫힘).
 * 보기 화면이 까닭을 그대로 알려 줍니다.
 */
export async function lookupShared(token: string): Promise<{ view: RotationShareView } | { reason: "missing" } | { reason: "expired"; workDate: string | null; gameName: string }> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { reason: "missing" };
  const m = await prisma.rotationMeta.findUnique({ where: { shareToken: token } });
  if (!m) return { reason: "missing" };
  if (shareExpired(m.workDate, undefined, m.shareDays)) return { reason: "expired", workDate: m.workDate, gameName: m.name };
  const dealers = await prisma.rotationDealer.findMany({ where: { gameId: m.id }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  return {
    view: {
      game: { id: m.id, name: m.name, workDate: m.workDate },
      version: m.version,
      tableLabels: tableLabelsOf({ tableCount: m.tableCount, tableLabels: m.tableLabels ? parseTableLabels(m.tableLabels).labels : null }),
      tableState: parseTableState(m.tableStateJson),
      interval: m.interval,
      planStart: m.planStart,
      plan: parsePlan(m.planJson),
      dealers: dealers.map((d) => ({ id: d.id, name: d.name, status: toDealerStatus(d.status) })),
    },
  };
}

export async function sharedVersion(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return -1;
  const m = await prisma.rotationMeta.findUnique({ where: { shareToken: token }, select: { version: true, workDate: true, shareDays: true } });
  if (!m || shareExpired(m.workDate, undefined, m.shareDays)) return -1;
  return m.version;
}

export class RotationError extends Error {}

/** 시간표가 형식에 맞는지(딜러 id는 문자열, 칸 수 상한) 확인 */
function validPlan(plan: RotationPlan, tableCount: number) {
  return (
    Array.isArray(plan.slots) &&
    plan.slots.length <= MAX_SLOTS &&
    plan.tables === tableCount &&
    plan.slots.every(
      (slot) =>
        Number.isFinite(slot.at) &&
        Array.isArray(slot.seats) &&
        slot.seats.length === tableCount &&
        slot.seats.every((id) => id === null || typeof id === "string") &&
        Array.isArray(slot.rest) &&
        slot.rest.every((id) => typeof id === "string"),
    )
  );
}

/**
 * 게임 하나의 상태를 바꿉니다. 다른 기기는 version이 바뀐 걸 보고 새로 받습니다.
 * 바꾼 뒤 보여 줄 게임 id를 돌려줍니다(새 게임을 만들면 그 게임).
 */
export async function applyRotation(ownerId: string, gameId: string | null | undefined, action: RotationAction): Promise<string> {
  const now = new Date();
  const META_ID = (await resolveGame(ownerId, gameId)).id;
  let target = META_ID;
  let deleted = false;
  await prisma.$transaction(async (tx) => {
    // 딜러를 바꾸는 요청은 이 게임 딜러만
    const own = async (id: string) => {
      const dealer = await tx.rotationDealer.findFirst({ where: { id, gameId: META_ID } });
      if (!dealer) throw new RotationError("딜러를 찾을 수 없습니다. 새로고침해 주세요.");
      return dealer;
    };
    switch (action.type) {
      case "addDealers": {
        const count = await tx.rotationDealer.count({ where: { gameId: META_ID } });
        const rows = action.dealers
          .map((d) => ({ name: String(d.name ?? "").trim().slice(0, 20), startTime: normalizeTime(d.startTime), endTime: normalizeTime(d.endTime) }))
          .filter((d) => d.name);
        if (count + rows.length > MAX_DEALERS) throw new RotationError(`딜러는 최대 ${MAX_DEALERS}명까지 등록할 수 있습니다.`);
        const last = await tx.rotationDealer.aggregate({ where: { gameId: META_ID }, _max: { sort: true } });
        let sort = (last._max.sort ?? 0) + 1;
        await tx.rotationDealer.createMany({ data: rows.map((row) => ({ ...row, gameId: META_ID, status: "WAIT", sort: sort++ })) });
        break;
      }
      case "updateDealer": {
        await own(action.id);
        await tx.rotationDealer.update({
          where: { id: action.id },
          data: {
            ...(action.name !== undefined ? { name: String(action.name).trim().slice(0, 20) } : {}),
            ...(action.startTime !== undefined ? { startTime: normalizeTime(action.startTime) } : {}),
          },
        });
        break;
      }
      case "setTimes": {
        // 출근: 출근 체크했으면 실제 출근 시각, 아니면 예정 출근 시각을 바꿉니다.
        // 퇴근: 퇴근했으면 실제 퇴근 시각, 아니면 예정 퇴근 시각을 바꿉니다.
        const dealer = await own(action.id);
        const start = normalizeTime(action.start);
        const end = normalizeTime(action.end);
        const data: { startTime?: string | null; checkedInAt?: Date; endTime?: string | null; leftAt?: Date } = {};
        if (action.start !== undefined) {
          if (dealer.checkedInAt && start) data.checkedInAt = kstDateAt(start, dealer.checkedInAt);
          else if (!dealer.checkedInAt) data.startTime = start;
        }
        if (action.end !== undefined) {
          if (dealer.status === "LEFT" && end) data.leftAt = kstDateAt(end, dealer.leftAt ?? now);
          else if (dealer.status !== "LEFT") data.endTime = end;
        }
        await tx.rotationDealer.update({ where: { id: action.id }, data });
        break;
      }
      case "removeDealer": {
        await own(action.id);
        await tx.rotationDealer.delete({ where: { id: action.id } });
        break;
      }
      case "checkIn": {
        await own(action.id);
        await tx.rotationDealer.update({ where: { id: action.id }, data: { status: "IN", checkedInAt: now, leftAt: null, statusSince: now } });
        break;
      }
      case "setStatus": {
        const status: string = action.status;
        if (status !== "WAIT" && status !== "OFF" && status !== "LEFT") throw new RotationError("상태를 확인하세요.");
        await own(action.id);
        await tx.rotationDealer.update({
          where: { id: action.id },
          data: {
            status,
            statusSince: now,
            ...(status === "LEFT" ? { leftAt: now } : { leftAt: null }),
            ...(status === "WAIT" ? { checkedInAt: null } : {}),
          },
        });
        break;
      }
      case "setSettings": {
        const data: {
          tableCount?: number;
          tableLabels?: string;
          interval?: number;
          planStart?: string;
          planEnd?: string;
          setupMinutes?: number;
          maxStreakMinutes?: number;
        } = {};
        if (action.maxStreakMinutes !== undefined) data.maxStreakMinutes = Math.max(0, Math.min(600, Math.floor(Number(action.maxStreakMinutes) || 0)));
        if (action.tableLabels !== undefined) {
          const { labels, errors } = parseTableLabels(String(action.tableLabels));
          if (labels.length === 0 || errors.length) throw new RotationError(`테이블 번호를 확인하세요${errors.length ? `: ${errors.join(", ")}` : ""} (예: 1~3, A~B)`);
          data.tableCount = labels.length;
          data.tableLabels = labels.map(labelText).join(",");
        }
        if (action.setupMinutes !== undefined) data.setupMinutes = Math.max(0, Math.min(120, Math.floor(Number(action.setupMinutes) || 0)));
        if (action.interval !== undefined) data.interval = Math.max(INTERVAL_MIN, Math.min(INTERVAL_MAX, Math.floor(Number(action.interval) || 20)));
        if (action.planStart !== undefined) {
          const t = normalizeTime(action.planStart);
          if (!t) throw new RotationError("시작 시각을 확인하세요.");
          data.planStart = t;
        }
        if (action.planEnd !== undefined) {
          const t = normalizeTime(action.planEnd);
          if (!t) throw new RotationError("끝 시각을 확인하세요.");
          data.planEnd = t;
        }
        // 테이블 번호가 바뀌면(게임 중 추가 오픈 등) 짜 둔 시간표를 번호 기준으로 옮겨 담습니다. 옮길 수 없으면 비웁니다.
        const current = await tx.rotationMeta.findUniqueOrThrow({ where: { id: META_ID } });
        const extra: { planJson?: string | null; tableStateJson?: string } = {};
        if (data.tableLabels !== undefined) {
          const oldLabels = tableLabelsOf({ tableCount: current.tableCount, tableLabels: current.tableLabels ? parseTableLabels(current.tableLabels).labels : null });
          const newLabels = parseTableLabels(data.tableLabels).labels;
          const plan = parsePlan(current.planJson);
          if (plan && oldLabels.join(",") !== newLabels.join(",")) {
            const moved = remapPlanTables(plan, oldLabels, newLabels);
            extra.planJson = moved ? JSON.stringify(moved) : null;
          }
          // 새로 연 테이블: 오픈 시각 기록(컨바인 기록은 지움)
          const added = newLabels.filter((label) => !oldLabels.includes(label));
          if (added.length) {
            const all = parseTableState(current.tableStateJson);
            const openedAt = action.openedAt !== undefined && Number.isFinite(Number(action.openedAt)) ? Math.floor(Number(action.openedAt)) : null;
            for (const label of added) all[String(label)] = { ...(all[String(label)] ?? {}), closedAt: null, openedAt };
            extra.tableStateJson = JSON.stringify(all);
          }
        }
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { ...data, ...extra } });
        break;
      }
      case "savePlan": {
        const m = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        if (action.plan && !validPlan(action.plan, m?.tableCount ?? 20)) {
          throw new RotationError("시간표 형식이 맞지 않습니다. 다시 짜 주세요.");
        }
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { planJson: action.plan ? JSON.stringify(action.plan) : null } });
        break;
      }
      case "setTable": {
        // 버튼 자리(1~10)·컨바인 시각. 값을 안 주면 그대로, null이면 지움. label 0 = 모든 테이블 공통 버튼 자리
        const m = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        const all = parseTableState(m?.tableStateJson ?? null);
        const key = String(Math.floor(Number(action.label)));
        const row: TableState = { ...(all[key] ?? {}) };
        if (action.button !== undefined) {
          const b = action.button == null ? null : Math.floor(Number(action.button));
          row.button = b != null && b >= 1 && b <= 10 ? b : null;
        }
        if (action.closedAt !== undefined) row.closedAt = action.closedAt == null || !Number.isFinite(Number(action.closedAt)) ? null : Math.floor(Number(action.closedAt));
        all[key] = row;
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { tableStateJson: JSON.stringify(all) } });
        break;
      }
      case "clearPlan": {
        // 시간표 삭제: 짜 둔 칸을 모두 지우고 컨바인도 풉니다(버튼 자리·딜러 명단·출근 기록은 그대로).
        const m = await tx.rotationMeta.findUniqueOrThrow({ where: { id: META_ID } });
        const all = parseTableState(m.tableStateJson);
        for (const key of Object.keys(all)) all[key] = { ...all[key], closedAt: null };
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { planJson: null, tableStateJson: JSON.stringify(all) } });
        break;
      }
      case "setShare": {
        // 보기 전용 링크 켜기(새 값)·끄기. 다시 켜면 예전 링크는 더 이상 열리지 않습니다.
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { shareToken: action.on ? randomBytes(18).toString("base64url") : null } });
        break;
      }
      case "createGame": {
        // 새 게임(다른 날짜 또는 같은 날 다른 이벤트). 테이블은 항상 0개로 시작하고,
        // 시간 설정(간격 · 시작/끝 · 준비 · 최대 연속)과 딜러 명단(날짜 변경일 때만)은 골라서 가져옵니다.
        const workDate = normalizeWorkDate(action.workDate);
        if (!workDate) throw new RotationError("날짜를 확인하세요.");
        if ((await tx.rotationMeta.count({ where: { ownerId } })) >= MAX_GAMES) {
          throw new RotationError(`게임은 ${MAX_GAMES}개까지 만들 수 있습니다. 지난 게임을 지워 주세요(✎ 날짜·삭제).`);
        }
        const name = String(action.name ?? "").trim().slice(0, 30) || "새 게임";
        const from = await tx.rotationMeta.findUniqueOrThrow({ where: { id: META_ID } });
        const id = randomUUID();
        await tx.rotationMeta.create({
          data: {
            id,
            ownerId,
            name,
            workDate,
            tableCount: 0,
            tableLabels: "",
            ...(action.copySettings
              ? {
                  interval: from.interval,
                  planStart: from.planStart,
                  planEnd: from.planEnd,
                  setupMinutes: from.setupMinutes,
                  maxStreakMinutes: from.maxStreakMinutes,
                }
              : {}),
          },
        });
        if (action.copyDealers) {
          const dealers = await tx.rotationDealer.findMany({ where: { gameId: META_ID }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
          await tx.rotationDealer.createMany({
            data: dealers.map((d) => ({ gameId: id, name: d.name, startTime: d.startTime, endTime: d.endTime, status: "WAIT", sort: d.sort })),
          });
        }
        target = id;
        break;
      }
      case "setGame": {
        const data: { name?: string; workDate?: string } = {};
        if (action.name !== undefined) data.name = String(action.name).trim().slice(0, 30) || "게임";
        if (action.workDate !== undefined) {
          const workDate = normalizeWorkDate(action.workDate);
          if (!workDate) throw new RotationError("날짜를 확인하세요.");
          data.workDate = workDate;
        }
        await tx.rotationMeta.update({ where: { id: META_ID }, data });
        break;
      }
      case "deleteGames": {
        const ids = Array.isArray(action.ids) ? action.ids.filter((x): x is string => typeof x === "string" && x !== META_ID).slice(0, MAX_GAMES) : [];
        if (ids.length === 0) throw new RotationError("지울 게임을 골라 주세요.");
        // 내 게임만, 지금 보는 게임은 빼고
        const mine = await tx.rotationMeta.findMany({ where: { ownerId, id: { in: ids } }, select: { id: true } });
        const targets = mine.map((m) => m.id);
        await moveToTrash(tx, ownerId, targets);
        break;
      }
      case "deleteGame": {
        if ((await tx.rotationMeta.count({ where: { ownerId } })) <= 1) throw new RotationError("게임이 하나뿐이라 지울 수 없습니다.");
        await moveToTrash(tx, ownerId, [META_ID]);
        deleted = true;
        break;
      }
      case "setShareDays": {
        const days = [0, 1, 3].includes(Number(action.days)) ? Number(action.days) : 1;
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { shareDays: days } });
        break;
      }
      case "restoreGame": {
        const row = await tx.toolSaved.findFirst({ where: { id: String(action.trashId ?? ""), ownerId, kind: KIND_TRASH } });
        if (!row) throw new RotationError("휴지통에서 찾을 수 없습니다. 7일이 지나 완전히 지워졌을 수 있어요.");
        if ((await tx.rotationMeta.count({ where: { ownerId } })) >= MAX_GAMES) {
          throw new RotationError(`게임이 ${MAX_GAMES}개라 되살릴 수 없습니다. 다른 게임을 먼저 정리해 주세요.`);
        }
        const snap = JSON.parse(row.dataJson) as TrashSnapshot;
        // 같은 id가 이미 있으면(드묾) 새 id로. 공유 링크는 꺼진 채로 되살림
        const taken = await tx.rotationMeta.findUnique({ where: { id: snap.meta.id }, select: { id: true } });
        const id = taken ? randomUUID() : snap.meta.id;
        await tx.rotationMeta.create({
          data: {
            ...snap.meta,
            id,
            ownerId,
            shareToken: null,
            createdAt: new Date(snap.meta.createdAt),
            dayStartedAt: new Date(snap.meta.dayStartedAt),
          },
        });
        if (snap.dealers.length) {
          await tx.rotationDealer.createMany({
            data: snap.dealers.map((d) => ({
              ...d,
              gameId: id,
              statusSince: new Date(d.statusSince),
              checkedInAt: d.checkedInAt ? new Date(d.checkedInAt) : null,
              leftAt: d.leftAt ? new Date(d.leftAt) : null,
              createdAt: new Date(d.createdAt),
            })),
            skipDuplicates: true,
          });
        }
        await tx.toolSaved.delete({ where: { id: row.id } });
        break;
      }
      case "saveRoster": {
        const name = String(action.name ?? "").trim().slice(0, 20) || "딜러 명단";
        const text = String(action.text ?? "").replace(/\r/g, "").trim().slice(0, ROSTER_TEXT_MAX);
        if (!text) throw new RotationError("명단이 비어 있어요. 한 줄에 한 명씩 적어 주세요.");
        if (action.id) {
          const mine = await tx.toolSaved.findFirst({ where: { id: action.id, ownerId, kind: KIND_ROSTER }, select: { id: true } });
          if (!mine) throw new RotationError("명단을 찾을 수 없습니다. 새로고침해 주세요.");
          await tx.toolSaved.update({ where: { id: mine.id }, data: { name, dataJson: text } });
        } else {
          if ((await tx.toolSaved.count({ where: { ownerId, kind: KIND_ROSTER } })) >= MAX_ROSTERS) {
            throw new RotationError(`딜러 명단은 ${MAX_ROSTERS}개까지 저장할 수 있어요.`);
          }
          await tx.toolSaved.create({ data: { ownerId, kind: KIND_ROSTER, name, dataJson: text } });
        }
        break;
      }
      case "deleteRoster": {
        await tx.toolSaved.deleteMany({ where: { id: String(action.id ?? ""), ownerId, kind: KIND_ROSTER } });
        break;
      }
    }
    if (!deleted) await tx.rotationMeta.update({ where: { id: META_ID }, data: { version: { increment: 1 } } });
  });
  return deleted ? (await resolveGame(ownerId)).id : target;
}
