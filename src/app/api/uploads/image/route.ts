import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { canWriteBoard } from "@/lib/permissions";
import { isStaff } from "@/lib/roles";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";
import { MEMBER_UPLOADS_PER_HOUR } from "@/lib/post-photos";
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, imageUrl } from "@/lib/uploads";

/**
 * 이미지 업로드. 공식 계정(포스터·홍보물)·관리자(배너 소재)와 로그인한 회원(자유·질문·현장 스케치 등 글 사진)이 씁니다.
 * 구인·구직 글은 글 저장 단계에서 사진을 받지 않습니다. 회원은 1시간에 40장(MEMBER_UPLOADS_PER_HOUR)까지 올릴 수 있습니다.
 * 브라우저에서 미리 줄인 JPEG/PNG/WebP를 multipart(file)로 받아 DB에 저장합니다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  try {
    await assertAccountActive(user);
  } catch (error) {
    if (error instanceof AccountRestrictedError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
  const trusted = canWriteBoard(user, "SCHEDULE") || isStaff(user);
  if (!trusted) {
    const recent = await prisma.uploadedImage.count({
      where: { uploaderId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= MEMBER_UPLOADS_PER_HOUR) {
      return NextResponse.json({ error: "사진을 너무 많이 올렸습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    }
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "이미지 파일을 골라 주세요." }, { status: 400 });
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WebP 이미지만 올릴 수 있습니다." }, { status: 400 });
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 큽니다(최대 3MB)." }, { status: 413 });
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const saved = await prisma.uploadedImage.create({
    data: { mime: file.type, data, size: data.byteLength, uploaderId: user.id },
    select: { id: true },
  });
  return NextResponse.json({ id: saved.id, url: imageUrl(saved.id) });
}
