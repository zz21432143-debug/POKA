import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { jobFieldsFromBody } from "@/lib/job-fields";
import { ForbiddenWordError, assertNoForbiddenWords } from "@/lib/forbidden-words";
import { HoldemOnlyError, assertHoldemOnly, normalizeHandTitle } from "@/lib/holdem-only";
import { canManagePost, manageDeniedMessage } from "@/lib/post-manage";
import { fileIdFromUrl } from "@/lib/uploads";
import type { JobKind } from "@/generated/prisma/enums";
import { boardAllowsPhotos, parsePostPhotos } from "@/lib/post-photos";
import { needsTax } from "@/lib/job-tax";

const JOB_KINDS: JobKind[] = ["FIXED", "APPLY", "TEAM", "URGENT", "SEEKING", "TOURNAMENT"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(body: Record<string, unknown>, key: string, fallback: string | null): string | null {
  const value = body[key];
  if (value === undefined) return fallback;
  return typeof value === "string" ? value.trim() || null : null;
}

/** 이미지 주소: https:// 또는 이 사이트에 올린 이미지·기본 배너만 받습니다. */
function imageUrlOrNull(value: string | null) {
  if (!value) return null;
  return /^(https?:\/\/|\/api\/images\/|\/banners\/)/.test(value) ? value : null;
}

/**
 * 글 수정. 구인은 구인 칸 전체를, 그 밖의 게시판은 제목·본문(+게시판별 칸)을 고칩니다.
 * 권한: 공식 게시판(공지·대회 캘린더·공식 홍보·TDA)은 POKA 공식 계정, 그 밖은 글쓴이·관리자.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.hidden) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!canManagePost(user, post)) {
      return NextResponse.json({ error: manageDeniedMessage(post.boardType) }, { status: 403 });
    }
    const body = (await request.json()) as Record<string, unknown>;

    if (post.boardType !== "JOBS") {
      let title = text(body, "title", post.title) ?? "";
      const content = text(body, "content", post.content) ?? "";
      if (post.boardType === "HAND_REVIEW") title = normalizeHandTitle(title);
      if (title.length < 2) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });

      const data: Record<string, unknown> = { title, content };
      if (post.boardType === "TDA") {
        // PDF: 주소를 주면 바꾸고, 빈 값·null이면 뗍니다. 이 사이트에 올린 파일 주소만 받습니다.
        const pdf = text(body, "docPdfUrl", post.docPdfUrl);
        data.docPdfUrl = pdf && fileIdFromUrl(pdf) ? pdf : null;
        if (!content && !data.docPdfUrl) {
          return NextResponse.json({ error: "내용을 입력하거나 PDF를 올려 주세요." }, { status: 400 });
        }
      } else if (!content && post.boardType !== "SCHEDULE" && post.boardType !== "PROMO") {
        return NextResponse.json({ error: "내용을 입력하세요." }, { status: 400 });
      }
      if (post.boardType === "SCHEDULE") {
        const start = text(body, "eventDate", post.eventDate);
        const end = text(body, "eventEndDate", post.eventEndDate);
        if (!start || !DATE_RE.test(start)) return NextResponse.json({ error: "시작일을 선택하세요." }, { status: 400 });
        data.eventDate = start;
        data.eventEndDate = end && DATE_RE.test(end) && end >= start ? end : start;
        data.promoLocation = text(body, "promoLocation", post.promoLocation);
        data.eventPrize = text(body, "eventPrize", post.eventPrize);
        data.eventLink = text(body, "eventLink", post.eventLink);
        data.bannerImageUrl = imageUrlOrNull(text(body, "bannerImageUrl", post.bannerImageUrl)) ?? "/banners/slot-3.svg";
      }
      if (post.boardType === "PROMO") {
        data.promoLocation = text(body, "promoLocation", post.promoLocation);
        data.promoTag = text(body, "promoTag", post.promoTag);
        data.bannerImageUrl = imageUrlOrNull(text(body, "bannerImageUrl", post.bannerImageUrl)) ?? post.bannerImageUrl;
      }
      if (boardAllowsPhotos(post.boardType) && "imageUrls" in body) {
        const photos = parsePostPhotos(body.imageUrls);
        data.imageUrls = photos;
        // 현장 스케치 목록 썸네일은 첫 사진을 씁니다.
        if (post.boardType === "SKETCH") data.bannerImageUrl = photos[0] ?? null;
      } else if (post.boardType === "SKETCH") {
        data.bannerImageUrl = imageUrlOrNull(text(body, "bannerImageUrl", post.bannerImageUrl));
      }
      assertHoldemOnly(title, content, data.promoLocation as string | null);
      await assertNoForbiddenWords(title, content, data.promoLocation as string | null);
      const updated = await prisma.post.update({ where: { id }, data });
      return NextResponse.json({ id: updated.id });
    }

    if (parsePostPhotos(body.imageUrls).length) {
      return NextResponse.json({ error: "구인·구직 글에는 사진을 올릴 수 없습니다." }, { status: 400 });
    }
    const jobKind = (
      typeof body.jobKind === "string" && JOB_KINDS.includes(body.jobKind as JobKind) ? body.jobKind : post.jobKind
    ) as JobKind | null;
    if (!jobKind) {
      return NextResponse.json({ error: "구인 종류를 확인하세요." }, { status: 400 });
    }
    const jobData = jobFieldsFromBody(body, jobKind);
    if (!jobData.jobLocation) {
      return NextResponse.json({ error: "지역을 선택하세요." }, { status: 400 });
    }
    if (jobData.contactError) {
      return NextResponse.json({ error: jobData.contactError }, { status: 400 });
    }
    if (needsTax(jobKind) && !jobData.jobTaxDeduction) {
      return NextResponse.json({ error: "3.3% 공제 여부를 선택하세요." }, { status: 400 });
    }
    // 수정할 때도 새로 쓸 때와 같은 금지어 검사를 합니다.
    const nextContent = typeof body.content === "string" ? body.content : post.content;
    assertHoldemOnly(jobData.title, nextContent, jobData.jobLocation, jobData.jobCompanyName);
    await assertNoForbiddenWords(jobData.title, nextContent, jobData.jobLocation, jobData.jobCompanyName);
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: jobData.title,
        content: nextContent,
        jobKind,
        jobLocation: jobData.jobLocation,
        jobCompanyName: jobData.jobCompanyName,
        jobPayType: jobData.jobPayType,
        jobPayAmount: jobData.jobPayAmount,
        jobSchedule: jobData.jobSchedule,
        jobWorkHours: jobData.jobWorkHours,
        jobBenefits: jobData.jobBenefits,
        jobExperience: jobData.jobExperience,
        jobContact: jobData.jobContact,
        jobWorkDate: jobData.jobWorkDate,
        jobEndDate: jobData.jobEndDate,
        jobEvents: jobData.jobEvents,
        jobDeadline: jobData.jobDeadline,
        jobAlwaysOpen: jobData.jobAlwaysOpen,
        jobHeadcount: jobData.jobHeadcount,
        jobApplyValue: jobData.jobApplyValue,
        jobDateFlexible: jobData.jobDateFlexible,
        jobGuaranteedHours: jobData.jobGuaranteedHours,
        jobOvertime: jobData.jobOvertime,
        jobTravelPay: jobData.jobTravelPay,
        jobTravelPayAmount: jobData.jobTravelPayAmount,
        jobTaxDeduction: jobData.jobTaxDeduction,
        jobLodging: jobData.jobLodging,
        jobLodgingNote: jobData.jobLodgingNote,
        jobSnacks: jobData.jobSnacks,
        jobDressCode: jobData.jobDressCode,
        jobApplyMethod: jobData.jobApplyMethod,
        jobPay: jobData.jobPay,
      },
    });
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    if (error instanceof ForbiddenWordError || error instanceof HoldemOnlyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "수정에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 글 삭제(모든 게시판). 권한은 수정과 같습니다.
 * 글은 숨김 처리해 댓글·신고 기록을 남기고, 배너 구좌에 걸려 있었다면 구좌에서 뗍니다.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  }
  const { id } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, boardType: true, hidden: true, authorId: true },
  });
  if (!post || post.hidden) {
    return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!canManagePost(user, post)) {
    return NextResponse.json({ error: manageDeniedMessage(post.boardType) }, { status: 403 });
  }
  await prisma.$transaction([
    prisma.post.update({ where: { id }, data: { hidden: true, bannerSlot: null } }),
    prisma.bannerSlot.updateMany({ where: { postId: id }, data: { postId: null, mode: "AUTO" } }),
  ]);
  return NextResponse.json({ ok: true, boardType: post.boardType });
}
