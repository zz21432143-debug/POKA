import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { clientIp } from "@/lib/request";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import type { BoardType, JobKind } from "@/generated/prisma/enums";

const BOARDS: BoardType[] = ["FREE", "HAND_REVIEW", "ANONYMOUS_REVIEW", "JOBS", "PROMO"];
const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM"];

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
      jobKind?: JobKind;
      jobLocation?: string;
      jobPay?: string;
      jobSchedule?: string;
      jobHeadcount?: string;
      isPaid?: boolean;
      bannerSlot?: number | null;
      bannerImageUrl?: string;
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

    let jobKind: JobKind | null = null;
    if (boardType === "JOBS") {
      if (!body.jobKind || !JOB_KINDS.includes(body.jobKind)) {
        return NextResponse.json({ error: "구인 종류를 선택하세요." }, { status: 400 });
      }
      jobKind = body.jobKind;
    }

    let bannerSlot: number | null = null;
    let bannerImageUrl: string | null = null;
    if (boardType === "PROMO" && body.bannerSlot) {
      const slot = Number(body.bannerSlot);
      if (!Number.isInteger(slot) || slot < 1 || slot > 6) {
        return NextResponse.json({ error: "배너 구좌는 1~6만 가능합니다." }, { status: 400 });
      }
      const taken = await prisma.post.findFirst({ where: { bannerSlot: slot } });
      if (taken) {
        return NextResponse.json({ error: `${slot}번 구좌는 이미 사용 중입니다.` }, { status: 409 });
      }
      bannerSlot = slot;
      bannerImageUrl = body.bannerImageUrl?.trim() || `/banners/slot-${slot}.svg`;
    }

    const post = await prisma.post.create({
      data: {
        boardType,
        authorId: user.id,
        title,
        content,
        handReviewJson,
        authorIp: clientIp(request),
        jobKind,
        jobLocation: body.jobLocation?.trim() || null,
        jobPay: body.jobPay?.trim() || null,
        jobSchedule: body.jobSchedule?.trim() || null,
        jobHeadcount: body.jobHeadcount?.trim() || null,
        isPaid: boardType === "JOBS" ? Boolean(body.isPaid) : false,
        bannerSlot,
        bannerImageUrl,
      },
    });

    await grantRewards(user.id, POST_EXP[boardType], POST_POINTS[boardType]);

    return NextResponse.json({
      id: post.id,
      exp: POST_EXP[boardType],
      points: POST_POINTS[boardType],
      anonymous: boardType === "ANONYMOUS_REVIEW",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
