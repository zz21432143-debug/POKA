import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { grantRewards } from "@/lib/exp";
import { parseHandReview, validateHandReview } from "@/lib/hand-review";
import { listingFromBody } from "@/lib/listing";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";
import { clientIp } from "@/lib/request";
import { POST_EXP, POST_POINTS } from "@/lib/rewards";
import { CoolDownError, assertWriteCooldown, writeAudit } from "@/lib/security";
import { ensureBannerSlots } from "@/lib/premium-banners";
import type { BoardType } from "@/generated/prisma/enums";

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

const LISTING_BOARDS: BoardType[] = ["JOBS", "TALENT", "PICKUP"];

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

    const listing = LISTING_BOARDS.includes(boardType) ? listingFromBody(body) : null;
    if (listing) title = listing.title || title;

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
        jobKind: null,
        jobLocation: listing?.jobLocation ?? (typeof body.promoLocation === "string" ? body.promoLocation : null),
        jobPay: listing?.jobPay ?? null,
        jobBenefits: listing?.jobBenefits ?? null,
        jobPayType: listing?.jobPayType ?? null,
        jobPayAmount: listing?.jobPayAmount ?? null,
        jobExperience: listing?.jobExperience ?? null,
        jobContact: listing?.jobContact ?? null,
        jobWorkDate: listing?.jobWorkDate ?? null,
        jobDateFlexible: listing?.jobDateFlexible ?? false,
        jobApplyMethod: listing?.jobApplyMethod ?? null,
        jobApplyValue: listing?.jobApplyValue ?? null,
        jobPositions: listing?.jobPositions ?? null,
        jobWorkType: listing?.jobWorkType ?? null,
        jobAlwaysOpen: listing?.jobAlwaysOpen ?? false,
        eventDate: typeof body.eventDate === "string" ? body.eventDate : listing?.jobWorkDate,
        isPaid: false,
        bannerSlot,
        bannerImageUrl,
        promoLocation:
          boardType === "PROMO" || boardType === "SCHEDULE"
            ? body.promoLocation?.trim() || listing?.jobLocation || null
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
