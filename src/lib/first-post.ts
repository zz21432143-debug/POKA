import { prisma } from "@/lib/db";
import { ensurePointLedger, recordPointGain } from "@/lib/point-ledger";
import type { BoardType } from "@/generated/prisma/enums";
import { FIRST_POST_BOARDS, FIRST_POST_POINTS } from "@/lib/rewards";

export { FIRST_POST_POINTS };
const REASON = "first-post";

/** 첫 글 보너스를 아직 안 받았는지(포인트 기록으로 확인 — 글을 지워도 다시 못 받음) */
export async function firstPostBonusOpen(userId: string) {
  await ensurePointLedger();
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "PointLedger" WHERE "userId" = ${userId} AND reason = ${REASON}`;
  return Number(rows[0]?.n ?? 0) === 0;
}

/** 커뮤니티 게시판 첫 글이면 보너스 지급. 준 포인트(아니면 0) */
export async function grantFirstPostBonus(userId: string, boardType: BoardType) {
  if (!FIRST_POST_BOARDS.has(boardType)) return 0;
  if (!(await firstPostBonusOpen(userId))) return 0;
  await recordPointGain(userId, FIRST_POST_POINTS, REASON);
  await prisma.user.update({ where: { id: userId }, data: { points: { increment: FIRST_POST_POINTS } } });
  return FIRST_POST_POINTS;
}
