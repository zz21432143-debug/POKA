import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { clientIp } from "@/lib/request";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import { CoolDownError, assertWriteCooldown, writeAudit } from "@/lib/security";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { jobFieldsFromBody } from "@/lib/job-fields";
import type { BoardType, JobKind } from "@/generated/prisma/enums";

const BOARDS: BoardType[] = ["FREE", "HAND_REVIEW", "ANONYMOUS_REVIEW", "JOBS", "PROMO"];
const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM"];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }

    const ip = clientIp(request);

    const body = (await request.json()) as {
      boardType?: BoardType;
      title?: string;
      content?: string;
      handReview?: unknown;
      jobKind?: JobKind;
      isPaid?: boolean;
      bannerSlot?: number | null;
      bannerImageUrl?: string;
      promoLocation?: string;
      promoTag?: string;
    };

    const boardType = body.boardType;
    if (!boardType || !BOARDS.includes(boardType)) {
      return NextResponse.json({ error: "게시판을 확인하세요." }, { status: 400 });
    }

    const content = body.content?.trim() ?? "";
    let title = body.title?.trim() ?? "";
    if (boardType !== "JOBS" && title.length < 2) {
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
    let jobData: ReturnType<typeof jobFieldsFromBody> | null = null;
    if (boardType === "JOBS") {
      if (!body.jobKind || !JOB_KINDS.includes(body.jobKind)) {
        return NextResponse.json({ error: "구인 종류를 선택하세요." }, { status: 400 });
      }
      jobKind = body.jobKind;
      jobData = jobFieldsFromBody(body as Record<string, unknown>, jobKind);
      title = jobData.title;
    }

    let bannerSlot: number | null = null;
    let bannerImageUrl: string | null = body.bannerImageUrl?.trim() || null;
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
      bannerImageUrl = bannerImageUrl || `/banners/slot-${slot}.svg`;
    }

    await assertWriteCooldown({
      kind: "post",
      userId: user.id,
      ip,
      isAdmin: user.isAdmin,
    });

    const post = await prisma.post.create({
      data: {
        boardType,
        authorId: user.id,
        title,
        content,
        handReviewJson,
        authorIp: ip,
        jobKind,
        jobLocation: jobData?.jobLocation ?? null,
        jobPay: jobData?.jobPay ?? null,
        jobSchedule: jobData?.jobSchedule ?? null,
        jobHeadcount: null,
        jobBenefits: jobData?.jobBenefits ?? null,
        jobTeamGoal: null,
        jobCompanyName: jobData?.jobCompanyName ?? null,
        jobPayType: jobData?.jobPayType ?? null,
        jobPayAmount: jobData?.jobPayAmount ?? null,
        jobWorkHours: jobData?.jobWorkHours ?? null,
        jobExperience: jobData?.jobExperience ?? null,
        jobContact: jobData?.jobContact ?? null,
        jobWorkDate: jobData?.jobWorkDate ?? null,
        jobDateFlexible: jobData?.jobDateFlexible ?? false,
        jobGuaranteedHours: jobData?.jobGuaranteedHours ?? null,
        jobOvertime: jobData?.jobOvertime ?? null,
        jobTravelPay: jobData?.jobTravelPay ?? false,
        jobSnacks: jobData?.jobSnacks ?? false,
        jobDressCode: jobData?.jobDressCode ?? null,
        jobApplyMethod: jobData?.jobApplyMethod ?? null,
        isPaid: boardType === "JOBS" ? Boolean(body.isPaid) : false,
        bannerSlot,
        bannerImageUrl,
        promoLocation: boardType === "PROMO" ? body.promoLocation?.trim() || null : null,
        promoTag: boardType === "PROMO" ? body.promoTag?.trim() || null : null,
      },
    });

    await grantRewards(user.id, POST_EXP[boardType], POST_POINTS[boardType]);
    await prisma.user.update({ where: { id: user.id }, data: { lastPostAt: new Date() } });

    if (boardType === "ANONYMOUS_REVIEW") {
      await writeAudit({
        kind: "ANONYMOUS_POST",
        userId: user.id,
        ip,
        postId: post.id,
        detail: title.slice(0, 80),
      });
    }

    if (bannerSlot) {
      await ensureBannerSlots();
      await prisma.bannerSlot.update({
        where: { slot: bannerSlot },
        data: { mode: "MANUAL", postId: post.id, enabled: true },
      });
    }

    return NextResponse.json({
      id: post.id,
      exp: POST_EXP[boardType],
      points: POST_POINTS[boardType],
      anonymous: boardType === "ANONYMOUS_REVIEW",
    });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
