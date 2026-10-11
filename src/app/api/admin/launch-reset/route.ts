import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMaster } from "@/lib/admin";
import { RESET_CONFIRM_TEXT, RESET_GROUPS, parseResetGroups } from "@/lib/launch-reset";
import { clientIp } from "@/lib/request";
import type { BoardType } from "@/generated/prisma/enums";

/**
 * 오픈 준비: 고른 묶음의 게시물을 모두 지웁니다(마스터 전용, 되돌릴 수 없음).
 * 댓글·추천·신고·투표·지원 기록은 게시물과 함께 지워지고, 회원·포인트·마크는 그대로 둡니다.
 */
export async function POST(request: Request) {
  const { user, error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { groups?: unknown; confirm?: unknown };
  const groups = parseResetGroups(body.groups);
  if (groups.length === 0) {
    return NextResponse.json({ error: "지울 묶음을 하나 이상 고르세요." }, { status: 400 });
  }
  if (body.confirm !== RESET_CONFIRM_TEXT) {
    return NextResponse.json({ error: `확인 문구 "${RESET_CONFIRM_TEXT}"를 정확히 입력하세요.` }, { status: 400 });
  }

  const boards = groups.flatMap((group) => [...RESET_GROUPS[group].boards]) as BoardType[];
  const withAttendance = groups.includes("attendance");
  const where = {
    OR: [
      ...(boards.length ? [{ boardType: { in: boards }, isAttendanceThread: false }] : []),
      ...(withAttendance ? [{ isAttendanceThread: true }] : []),
    ],
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.post.deleteMany({ where });
      // 전광판은 테스트 기간 소식(지운 글 링크·테스트 닉네임)이 남으므로 함께 비웁니다.
      await tx.tickerEvent.deleteMany();
      await tx.auditLog.create({
        data: {
          kind: "LAUNCH_POSTS_RESET",
          userId: user!.id,
          ip: clientIp(request),
          detail: JSON.stringify({ groups, deleted: deleted.count }),
        },
      });
      return deleted.count;
    });
    return NextResponse.json({ ok: true, deleted: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "삭제에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
