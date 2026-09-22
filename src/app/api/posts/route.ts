import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import type { BoardType } from "@/generated/prisma/enums";

const BOARDS: BoardType[] = ["FREE", "HAND_REVIEW", "ANONYMOUS_REVIEW", "JOBS", "PROMO"];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }

    const body = (await request.json()) as {
      boardType?: BoardType;
      title?: string;
      content?: string;
      handReview?: unknown;
    };

    const boardType = body.boardType;
    if (!boardType || !BOARDS.includes(boardType)) {
      return NextResponse.json({ error: "게시판을 확인하세요." }, { status: 400 });
    }

    const title = body.title?.trim() ?? "";
    const content = body.content?.trim() ?? "";
    if (title.length < 2) {
      return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
    }

    let handReviewJson: string | null = null;
    if (boardType === "HAND_REVIEW") {
      const parsed = parseHandReview(JSON.stringify(body.handReview ?? {}));
      if (!parsed) {
        return NextResponse.json({ error: "핸드 데이터가 올바르지 않습니다." }, { status: 400 });
      }
      const invalid = validateHandReview(parsed);
      if (invalid) {
        return NextResponse.json({ error: invalid }, { status: 400 });
      }
      handReviewJson = JSON.stringify(parsed);
    }

    const post = await prisma.post.create({
      data: {
        boardType,
        authorId: boardType === "ANONYMOUS_REVIEW" ? null : user.id,
        title,
        content,
        handReviewJson,
        authorIp: "127.0.0.1",
      },
    });

    await grantRewards(user.id, POST_EXP[boardType], POST_POINTS[boardType]);

    return NextResponse.json({ id: post.id, exp: POST_EXP[boardType], points: POST_POINTS[boardType] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

