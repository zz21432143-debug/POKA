import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMaster } from "@/lib/admin";
import { CONTENT_PLAN, EXTRA_PLAN } from "@/lib/content-plan";

const PLAN_IDS = new Set([...CONTENT_PLAN, ...EXTRA_PLAN].map((item) => item.id));

/** 콘텐츠 발행 계획에서 글 빼기·되돌리기: { id, skip } (마스터 전용) */
export async function POST(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { id?: string; skip?: boolean };
  const id = body.id ?? "";
  if (!PLAN_IDS.has(id) || typeof body.skip !== "boolean") {
    return NextResponse.json({ error: "계획에 없는 글입니다." }, { status: 400 });
  }
  if (body.skip) {
    await prisma.contentPlanSkip.upsert({ where: { planId: id }, create: { planId: id }, update: {} });
  } else {
    await prisma.contentPlanSkip.deleteMany({ where: { planId: id } });
  }
  return NextResponse.json({ ok: true, id, skip: body.skip });
}
