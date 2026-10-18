import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  MAX_BOARDS,
  MAX_PRESETS,
  applyClock,
  defaultBoard,
  newBoardData,
  normalizeBoard,
  type BoardPreset,
  type BoardTemplate,
  type ClockOp,
  type GameBoardData,
} from "@/lib/game-board";

export { MAX_BOARDS };
/** ToolSaved 종류: 현황판 구조 */
const KIND_PRESET = "board-structure";

export class GameBoardError extends Error {}

export type BoardSummary = { id: string; name: string; updatedAt: string };
export type BoardState = { id: string; name: string; version: number; shareToken: string | null; data: GameBoardData; serverNow: number };
export type SharedBoard = { version: number; data: GameBoardData; serverNow: number };

const parse = (json: string) => {
  try {
    return normalizeBoard(JSON.parse(json));
  } catch {
    return defaultBoard();
  }
};

export async function listBoards(ownerId: string): Promise<BoardSummary[]> {
  const rows = await prisma.gameBoard.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, updatedAt: true }, take: MAX_BOARDS });
  return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt.toISOString() }));
}

/** 내 현황판 하나(남의 것은 없는 것처럼) */
export async function loadBoard(ownerId: string, id: string): Promise<BoardState | null> {
  const row = await prisma.gameBoard.findFirst({ where: { id, ownerId } });
  if (!row) return null;
  return { id: row.id, name: row.name, version: row.version, shareToken: row.shareToken, data: parse(row.dataJson), serverNow: Date.now() };
}

export async function boardVersion(ownerId: string, id: string) {
  const row = await prisma.gameBoard.findFirst({ where: { id, ownerId }, select: { version: true } });
  return row?.version ?? -1;
}

export async function createBoard(ownerId: string, name?: string, template: BoardTemplate = "basic", copyFrom?: string) {
  if ((await prisma.gameBoard.count({ where: { ownerId } })) >= MAX_BOARDS) throw new GameBoardError(`현황판은 ${MAX_BOARDS}개까지 만들 수 있습니다. 안 쓰는 것을 지워 주세요.`);
  let source: GameBoardData | null = null;
  if (template === "copy") {
    // 내 현황판에서만 가져옴
    const from = copyFrom ? await prisma.gameBoard.findFirst({ where: { id: copyFrom, ownerId }, select: { dataJson: true } }) : null;
    if (!from) throw new GameBoardError("가져올 현황판을 찾을 수 없습니다.");
    source = normalizeBoard(parse(from.dataJson));
  } else if (template === "saved") {
    const preset = copyFrom ? await prisma.toolSaved.findFirst({ where: { id: copyFrom, ownerId, kind: KIND_PRESET }, select: { dataJson: true } }) : null;
    if (!preset) throw new GameBoardError("저장한 구조를 찾을 수 없습니다.");
    source = parse(preset.dataJson);
  }
  const data = normalizeBoard(newBoardData(template, name ?? "", source));
  const row = await prisma.gameBoard.create({ data: { ownerId, name: data.name, dataJson: JSON.stringify(data) } });
  return row.id;
}

/** 바꾸기: 설정 저장(시계는 서버 것 유지) · 시계 조작(서버 시각 기준) */
export async function updateBoard(ownerId: string, id: string, change: { data?: unknown; clock?: ClockOp }) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.gameBoard.findFirst({ where: { id, ownerId } });
    if (!row) throw new GameBoardError("현황판을 찾을 수 없습니다.");
    let data = parse(row.dataJson);
    if (change.data !== undefined) {
      const next = normalizeBoard({ ...(change.data as object), clock: data.clock });
      // 레벨을 지워 기준 레벨이 사라졌으면 마지막 레벨로
      next.clock = { ...data.clock, level: Math.min(data.clock.level, next.levels.length - 1) };
      data = next;
    }
    if (change.clock) data = { ...data, clock: applyClock(data, change.clock, Date.now()) };
    await tx.gameBoard.update({ where: { id: row.id }, data: { name: data.name, dataJson: JSON.stringify(data), version: { increment: 1 } } });
  });
}

export async function setBoardShare(ownerId: string, id: string, on: boolean) {
  const row = await prisma.gameBoard.findFirst({ where: { id, ownerId }, select: { id: true } });
  if (!row) throw new GameBoardError("현황판을 찾을 수 없습니다.");
  await prisma.gameBoard.update({ where: { id }, data: { shareToken: on ? randomBytes(18).toString("base64url") : null, version: { increment: 1 } } });
}

/** 따로 저장한 현황판 구조(오래된 것부터) */
export async function listPresets(ownerId: string): Promise<BoardPreset[]> {
  const rows = await prisma.toolSaved
    .findMany({ where: { ownerId, kind: KIND_PRESET }, orderBy: { createdAt: "asc" }, take: MAX_PRESETS, select: { id: true, name: true, dataJson: true } })
    .catch(() => []);
  return rows.map((r) => ({ id: r.id, name: r.name, levels: parse(r.dataJson).levels.filter((l) => !l.isBreak).length }));
}

/** 지금 현황판 구조를 이름 붙여 저장(인원 · 시계는 빼고). 현황판을 지워도 남음 */
export async function savePreset(ownerId: string, name: string, data: unknown) {
  if ((await prisma.toolSaved.count({ where: { ownerId, kind: KIND_PRESET } })) >= MAX_PRESETS) {
    throw new GameBoardError(`구조는 ${MAX_PRESETS}개까지 저장할 수 있습니다. 안 쓰는 구조를 지워 주세요.`);
  }
  const title = name.trim().slice(0, 20);
  const clean = newBoardData("copy", title, normalizeBoard(data));
  await prisma.toolSaved.create({ data: { ownerId, kind: KIND_PRESET, name: title || clean.name, dataJson: JSON.stringify(clean) } });
}

/** 저장한 구조 하나(새 현황판 미리보기용) */
export async function loadPreset(ownerId: string, id: string): Promise<GameBoardData | null> {
  const row = await prisma.toolSaved.findFirst({ where: { id, ownerId, kind: KIND_PRESET }, select: { dataJson: true } }).catch(() => null);
  return row ? normalizeBoard(parse(row.dataJson)) : null;
}

export async function deletePreset(ownerId: string, id: string) {
  await prisma.toolSaved.deleteMany({ where: { id, ownerId, kind: KIND_PRESET } });
}

export async function deleteBoard(ownerId: string, id: string) {
  await prisma.gameBoard.deleteMany({ where: { id, ownerId } });
}

/** 보기 전용(TV 링크): 공유를 끄면 못 봄 */
export async function loadSharedBoard(token: string): Promise<SharedBoard | null> {
  if (!token || token.length > 64) return null;
  const row = await prisma.gameBoard.findUnique({ where: { shareToken: token }, select: { version: true, dataJson: true } });
  return row ? { version: row.version, data: parse(row.dataJson), serverNow: Date.now() } : null;
}
