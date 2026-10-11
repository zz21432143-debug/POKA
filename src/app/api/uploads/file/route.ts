import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";
import { PDF_MAX_BYTES, fileUrl } from "@/lib/uploads";

/** TDA 룰 PDF 원본 업로드. 마스터(POKA 공식 계정)만 올릴 수 있습니다. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  if (!canWriteBoard(user, "TDA")) {
    return NextResponse.json({ error: writeDeniedMessage("TDA") }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "PDF 파일을 골라 주세요." }, { status: 400 });
  if (file.size > PDF_MAX_BYTES) {
    return NextResponse.json({ error: "PDF가 너무 큽니다(최대 4MB). 용량을 줄여 다시 올려 주세요." }, { status: 413 });
  }
  const data = new Uint8Array(await file.arrayBuffer());
  // 확장자·형식 이름이 아니라 파일 머리(%PDF-)로 PDF인지 확인합니다.
  if (String.fromCharCode(...data.slice(0, 5)) !== "%PDF-") {
    return NextResponse.json({ error: "PDF 파일만 올릴 수 있습니다." }, { status: 400 });
  }
  const saved = await prisma.uploadedImage.create({
    data: { mime: "application/pdf", data, size: data.byteLength, uploaderId: user.id },
    select: { id: true },
  });
  return NextResponse.json({ id: saved.id, url: fileUrl(saved.id) });
}
