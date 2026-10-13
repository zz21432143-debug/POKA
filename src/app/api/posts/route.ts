import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { jobFieldsFromBody } from "@/lib/job-fields";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";
import { clientIp } from "@/lib/request";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import { CoolDownError, assertWriteCooldown } from "@/lib/security";
import { ForbiddenWordError, assertNoForbiddenWords } from "@/lib/forbidden-words";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";
import { isStaff } from "@/lib/roles";
import { hashPassword } from "@/lib/password";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { ensureBannerSlots } from "@/lib/premium-banners";
import { parseJobRegion } from "@/lib/job-status";
import { titleRegion } from "@/lib/jobs";
import { notifyRegion } from "@/lib/push";
import { fileIdFromUrl } from "@/lib/uploads";
import { boardAllowsPhotos, parsePostPhotos } from "@/lib/post-photos";
import type { BoardType, JobKind } from "@/generated/prisma/enums";
import { needsTax } from "@/lib/job-tax";
import { postTickerMessage } from "@/lib/ticker-text";
import {
  HoldemOnlyError,
  assertHoldemOnly,
  normalizeHandTitle,
} from "@/lib/holdem-only";

const BOARDS: BoardType[] = [
  "FREE",
  "RULE_QA",
  "SKETCH",
  "HAND_REVIEW",
  "JOBS",
  "PROMO",
  "SCHEDULE",
  "NOTICE",
  "SUGGESTION",
  "TDA",
];

// 개인 구직(SEEKING)은 운영 종료로 새 글을 받지 않습니다.
const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM", "URGENT", "TOURNAMENT"];

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
      isPrivate?: boolean;
      password?: string;
    };

    await assertAccountActive(user);

    const boardType = body.boardType;
    if (!boardType || !BOARDS.includes(boardType)) {
      return NextResponse.json({ error: "게시판을 확인하세요." }, { status: 400 });
    }

    // 글 사진: 회원 게시판만. 구인·구직 글에는 사진을 받지 않습니다.
    const photos = parsePostPhotos(body.imageUrls);
    if (photos.length && !boardAllowsPhotos(boardType)) {
      return NextResponse.json(
        { error: boardType === "JOBS" ? "구인·구직 글에는 사진을 올릴 수 없습니다." : "이 게시판에는 사진을 올릴 수 없습니다." },
        { status: 400 },
      );
    }
    if (!canWriteBoard(user, boardType)) {
      return NextResponse.json({ error: writeDeniedMessage(boardType) }, { status: 403 });
    }

    const content = typeof body.content === "string" ? body.content.trim() : "";
    let title = body.title?.trim() ?? "";
    if (boardType !== "JOBS" && title.length < 2) {
      return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
    }
    if (boardType === "HAND_REVIEW") {
      title = normalizeHandTitle(title);
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
      const kind = body.jobKind as JobKind | undefined;
      if (!kind || !JOB_KINDS.includes(kind)) {
        return NextResponse.json({ error: "구인 종류를 선택하세요." }, { status: 400 });
      }
      jobKind = kind;
      jobData = jobFieldsFromBody(body, jobKind);
      if (!jobData.jobLocation) {
        return NextResponse.json({ error: "지역을 선택하세요." }, { status: 400 });
      }
      if (jobData.contactError) {
        return NextResponse.json({ error: jobData.contactError }, { status: 400 });
      }
      if (needsTax(jobKind) && !jobData.jobTaxDeduction) {
        return NextResponse.json({ error: "3.3% 공제 여부를 선택하세요." }, { status: 400 });
      }
      title = jobData.title;
    }

    let bannerSlot: number | null = null;
    let bannerImageUrl: string | null = body.bannerImageUrl?.trim() || null;
    // 현장 스케치 목록 썸네일은 첫 사진을 씁니다.
    if (boardType === "SKETCH") bannerImageUrl = photos[0] ?? null;
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
    assertHoldemOnly(
      title,
      content,
      jobData?.jobLocation,
      jobData?.jobCompanyName,
      typeof body.promoLocation === "string" ? body.promoLocation : null,
    );
    await assertNoForbiddenWords(
      title,
      content,
      jobData?.jobLocation,
      jobData?.jobCompanyName,
      typeof body.promoLocation === "string" ? body.promoLocation : null,
    );

    await assertWriteCooldown({
      kind: "post",
      userId: user.id,
      ip,
      isAdmin: user.isAdmin,
    });

    // 도배 방지: 같은 회원이 같은 분류·같은 상호로 24시간 안에 같은 공고를 다시 올릴 수 없습니다.
    // 지원 딜러·급구처럼 날짜가 있는 공고는 근무 날짜가 다르면 다른 공고로 보고 허용합니다.
    if (boardType === "JOBS" && jobKind && jobData && !isStaff(user)) {
      const dated = jobKind === "APPLY" || jobKind === "URGENT" || jobKind === "TOURNAMENT";
      const duplicate = await prisma.post.findFirst({
        where: {
          boardType: "JOBS",
          authorId: user.id,
          jobKind,
          jobCompanyName: jobData.jobCompanyName,
          hidden: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...(dated ? { jobWorkDate: jobData.jobWorkDate } : {}),
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: dated
              ? "같은 상호·같은 날짜의 공고가 이미 있습니다. 다른 날짜는 따로 올릴 수 있고, 같은 날짜는 기존 공고를 수정하거나 끌어올려 주세요."
              : "같은 상호의 같은 분류 공고는 하루에 한 번만 올릴 수 있습니다. 기존 공고를 수정하거나 끌어올리기를 이용해 주세요.",
            existingId: duplicate.id,
          },
          { status: 429 },
        );
      }
    }

    const wantPrivate = boardType === "SUGGESTION" && Boolean(body.isPrivate);
    const unlockPassword = typeof body.password === "string" ? body.password : "";
    if (wantPrivate && unlockPassword.trim().length < 4) {
      return NextResponse.json({ error: "비밀글 비밀번호는 4자리 이상이어야 합니다." }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        boardType,
        authorId: user.id,
        title,
        content,
        handReviewJson,
        authorIp: ip,
        isPrivate: wantPrivate,
        unlockPasswordHash: wantPrivate ? hashPassword(unlockPassword.trim()) : null,
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
        jobEndDate: jobData?.jobEndDate ?? null,
        jobEvents: jobData?.jobEvents ?? null,
        jobDeadline: jobData?.jobDeadline ?? null,
        jobAlwaysOpen: jobData?.jobAlwaysOpen ?? false,
        jobHeadcount: jobData?.jobHeadcount ?? null,
        jobApplyValue: jobData?.jobApplyValue ?? null,
        jobDateFlexible: jobData?.jobDateFlexible ?? false,
        jobGuaranteedHours: jobData?.jobGuaranteedHours ?? null,
        jobOvertime: jobData?.jobOvertime ?? null,
        jobTravelPay: jobData?.jobTravelPay ?? false,
        jobTravelPayAmount: jobData?.jobTravelPayAmount ?? null,
        jobTaxDeduction: jobData?.jobTaxDeduction ?? null,
        jobLodging: jobData?.jobLodging ?? false,
        jobLodgingNote: jobData?.jobLodgingNote ?? null,
        jobSnacks: jobData?.jobSnacks ?? false,
        jobDressCode: jobData?.jobDressCode ?? null,
        jobApplyMethod: jobData?.jobApplyMethod ?? null,
        eventDate: typeof body.eventDate === "string" ? body.eventDate : null,
        eventEndDate: typeof body.eventEndDate === "string" ? body.eventEndDate : null,
        eventPrize: typeof body.eventPrize === "string" ? body.eventPrize.trim() || null : null,
        eventLink: typeof body.eventLink === "string" ? body.eventLink.trim() || null : null,
        storeVerified: boardType === "PROMO" ? Boolean(body.storeVerified ?? true) : false,
        ratingManner: null,
        ratingService: null,
        ratingFacility: null,
        ratingAtmosphere: null,
        isPaid: boardType === "JOBS" && isStaff(user) ? Boolean(body.isPaid) : false,
        bannerSlot,
        bannerImageUrl,
        imageUrls: photos,
        promoLocation:
          boardType === "PROMO" || boardType === "SCHEDULE"
            ? (typeof body.promoLocation === "string" ? body.promoLocation.trim() : null) || null
            : null,
        promoTag: boardType === "PROMO" ? body.promoTag?.trim() || null : null,
        // TDA 룰 PDF 원본(이 사이트에 올린 /api/files/… 주소만)
        docPdfUrl:
          boardType === "TDA" && typeof body.docPdfUrl === "string" && fileIdFromUrl(body.docPdfUrl)
            ? body.docPdfUrl.trim()
            : null,
      },
    });

    const reward = await grantRewards(user.id, POST_EXP[boardType], POST_POINTS[boardType]);
    await prisma.user.update({ where: { id: user.id }, data: { lastPostAt: new Date() } });

    const { pushTicker } = await import("@/lib/ticker");
    const boardLabel = BOARD_LABELS[boardType as BoardTypeKey] ?? "게시판";
    await pushTicker({
      kind: `POST:${post.id}`,
      message: postTickerMessage(user.nickname, boardLabel, title),
      href: `/posts/${post.id}`,
    });

    // 새 급구는 그 지역 알림 구독자에게 휴대폰 푸시를 보냅니다. 실패해도 글 등록은 그대로 성공입니다.
    let pushSent: number | null = null;
    if (jobKind === "URGENT" && jobData?.jobLocation) {
      const region = parseJobRegion(titleRegion(jobData.jobLocation));
      if (region) {
        pushSent = 0;
        const result = await notifyRegion(region, {
          title: `${region} 새 급구/대타`,
          body: title,
          url: `/posts/${post.id}`,
        }).catch(() => ({ sent: 0 }));
        pushSent = result.sent;
      }
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
      exp: reward.grantedExp,
      points: reward.grantedPoints,
      anonymous: false,
      // 급구면 알림을 보낸 기기 수(글 위에 "N명에게 보냈어요")
      ...(pushSent == null ? {} : { pushSent }),
    });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    if (error instanceof AccountRestrictedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ForbiddenWordError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof HoldemOnlyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
