import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { jobFieldsFromBody } from "@/lib/job-fields";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";
import { clientIp } from "@/lib/request";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import { CoolDownError, assertWriteCooldown, writeAudit } from "@/lib/security";
import { ensureBannerSlots } from "@/lib/premium-banners";
import type { BoardType, JobKind } from "@/generated/prisma/enums";

const BOARDS: BoardType[] = [
  "FREE",
  "HAND_REVIEW",
  "ANONYMOUS_REVIEW",
  "JOBS",
  "PROMO",
  "EVENT_POSTER",
  "OFFICIAL_POSTER",
  "TALENT",
  "PICKUP",
  "SCHEDULE",
];

const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM"];

function clampStar(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }

    const ip = clientIp(request);
    const body = (await request.json()) as Record<string, unknown> & {
      boardType?: BoardType;
      title?: string;
      content?: string;
      handReview?: unknown;
      bannerSlot?: number | null;
      bannerImageUrl?: string;
      promoLocation?: string;
      promoTag?: string;
      eventDate?: string;
    };

    const boardType = body.boardType;
    if (!boardType || !BOARDS.includes(boardType)) {
      return NextResponse.json({ error: "게시판을 확인하세요." }, { status: 400 });
    }
    if (!canWriteBoard(user, boardType)) {
      return NextResponse.json({ error: writeDeniedMessage(boardType) }, { status: 403 });
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";
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

    if (boardType === "ANONYMOUS_REVIEW") {
      const stars = [
        clampStar(body.ratingManner),
        clampStar(body.ratingService),
        clampStar(body.ratingFacility),
        clampStar(body.ratingAtmosphere),
      ];
      if (stars.some((star) => star == null)) {
        return NextResponse.json({ error: "매너·서비스·시설·분위기 별점을 모두 입력하세요." }, { status: 400 });
      }
    }
    let jobKind: JobKind | null = null;
    let jobData: ReturnType<typeof jobFieldsFromBody> | null = null;
    if (boardType === "JOBS") {
      const kind = body.jobKind as JobKind | undefined;
      if (!kind || !JOB_KINDS.includes(kind)) {
        return NextResponse.json({ error: "구인 종류를 선택하세요." }, { status: 400 });
      }
      jobKind = kind;
      jobData = jobFieldsFromBody(body, jobKind);
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
    if ((boardType === "EVENT_POSTER" || boardType === "OFFICIAL_POSTER") && !bannerImageUrl) {
      bannerImageUrl = boardType === "EVENT_POSTER" ? "/banners/slot-1.svg" : "/banners/slot-2.svg";
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
        jobLocation: jobData?.jobLocation ?? (typeof body.promoLocation === "string" ? body.promoLocation.trim() : null),
        jobPay: jobData?.jobPay ?? null,
        jobSchedule: jobData?.jobSchedule ?? null,
        jobBenefits: jobData?.jobBenefits ?? null,
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
        eventDate: typeof body.eventDate === "string" ? body.eventDate : null,
        eventEndDate: typeof body.eventEndDate === "string" ? body.eventEndDate : null,
        eventPrize: typeof body.eventPrize === "string" ? body.eventPrize.trim() || null : null,
        eventLink: typeof body.eventLink === "string" ? body.eventLink.trim() || null : null,
        storeVerified: boardType === "PROMO" ? Boolean(body.storeVerified ?? true) : false,
        ratingManner: boardType === "ANONYMOUS_REVIEW" ? clampStar(body.ratingManner) : null,
        ratingService: boardType === "ANONYMOUS_REVIEW" ? clampStar(body.ratingService) : null,
        ratingFacility: boardType === "ANONYMOUS_REVIEW" ? clampStar(body.ratingFacility) : null,
        ratingAtmosphere: boardType === "ANONYMOUS_REVIEW" ? clampStar(body.ratingAtmosphere) : null,
        isPaid: boardType === "JOBS" ? Boolean(body.isPaid) : false,
        bannerSlot,
        bannerImageUrl,
        promoLocation:
          boardType === "PROMO" || boardType === "SCHEDULE"
            ? (typeof body.promoLocation === "string" ? body.promoLocation.trim() : null) || null
            : null,
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
