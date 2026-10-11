import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { canWriteBoard } from "@/lib/permissions";
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, imageUrl } from "@/lib/uploads";

/**
 * 포스터 이미지 업로드. 대회 캘린더를 쓸 수 있는 공식 계정만 올릴 수 있습니다.
 * 브라우저에서 미리 줄인 JPEG/PNG/WebP를 multipart(file)로 받아 DB에 저장합니다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  if (!canWriteBoard(user, "SCHEDULE")) {
    return NextResponse.json({ error: "POKA 공식 계정만 이미지를 올릴 수 있습니다." }, { status: 403 });
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
