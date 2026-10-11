import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";
import { PDF_MAX_BYTES, PDF_PART_BYTES, PDF_PENDING_MIME, pdfPartCount } from "@/lib/uploads";

/**
 * TDA 룰 PDF 원본 올리기 1단계: 크기를 알려 주면 파일 자리를 만들고 조각 크기를 알려 줍니다.
 * 이어서 PUT /api/uploads/file/{id}/{조각 번호}로 조각을 올리고, POST …/{id}/complete로 마칩니다.
 * 마스터(POKA 공식 계정)만 올릴 수 있습니다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  if (!canWriteBoard(user, "TDA")) {
    return NextResponse.json({ error: writeDeniedMessage("TDA") }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { size?: number; name?: string };
  const size = Number(body.size);
  if (!Number.isInteger(size) || size <= 0) return NextResponse.json({ error: "PDF 파일을 골라 주세요." }, { status: 400 });
  if (size > PDF_MAX_BYTES) {
    return NextResponse.json({ error: "PDF가 너무 큽니다(최대 30MB)." }, { status: 413 });
  }
  const saved = await prisma.uploadedImage.create({
    data: { mime: PDF_PENDING_MIME, data: new Uint8Array(0), size, uploaderId: user.id },
    select: { id: true },
  });
  return NextResponse.json({ id: saved.id, partSize: PDF_PART_BYTES, parts: pdfPartCount(size) });
}
