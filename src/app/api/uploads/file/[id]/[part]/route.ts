import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { PDF_PART_BYTES, PDF_PENDING_MIME, pdfPartCount } from "@/lib/uploads";

/**
 * PDF 조각 올리기(2단계). 본문은 조각 바이트 그대로. 파일 자리를 만든 사람만 올릴 수 있습니다.
 * part가 "complete"이면 3단계: 조각이 다 왔는지, PDF 머리(%PDF-)가 맞는지 확인하고 마칩니다.
 */
async function loadPending(id: string, userId: string) {
  const file = await prisma.uploadedImage.findUnique({ where: { id }, select: { id: true, mime: true, size: true, uploaderId: true } });
  if (!file || file.uploaderId !== userId || file.mime !== PDF_PENDING_MIME) return null;
  return file;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; part: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  const { id, part } = await context.params;
  const file = await loadPending(id, user.id);
  if (!file) return NextResponse.json({ error: "올리는 중인 파일을 찾을 수 없습니다." }, { status: 404 });
  const idx = Number(part);
  const parts = pdfPartCount(file.size);
  if (!Number.isInteger(idx) || idx < 0 || idx >= parts) {
    return NextResponse.json({ error: "조각 번호가 맞지 않습니다." }, { status: 400 });
  }
  const data = new Uint8Array(await request.arrayBuffer());
  const expected = idx === parts - 1 ? file.size - PDF_PART_BYTES * (parts - 1) : PDF_PART_BYTES;
  if (data.byteLength !== expected) {
    return NextResponse.json({ error: "조각 크기가 맞지 않습니다." }, { status: 400 });
  }
  await prisma.uploadChunk.upsert({
    where: { fileId_idx: { fileId: id, idx } },
    create: { fileId: id, idx, data },
    update: { data },
  });
  return NextResponse.json({ ok: true, idx });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string; part: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  const { id, part } = await context.params;
  if (part !== "complete") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const file = await loadPending(id, user.id);
  if (!file) return NextResponse.json({ error: "올리는 중인 파일을 찾을 수 없습니다." }, { status: 404 });
  const parts = pdfPartCount(file.size);
  const count = await prisma.uploadChunk.count({ where: { fileId: id } });
  if (count !== parts) return NextResponse.json({ error: "아직 다 올라가지 않았습니다." }, { status: 400 });
  const first = await prisma.uploadChunk.findUnique({ where: { fileId_idx: { fileId: id, idx: 0 } }, select: { data: true } });
  // 확장자가 아니라 파일 머리(%PDF-)로 PDF인지 확인합니다.
  if (!first || Buffer.from(first.data.slice(0, 5)).toString("latin1") !== "%PDF-") {
    await prisma.$transaction([
      prisma.uploadChunk.deleteMany({ where: { fileId: id } }),
      prisma.uploadedImage.delete({ where: { id } }),
    ]);
    return NextResponse.json({ error: "PDF 파일만 올릴 수 있습니다." }, { status: 400 });
  }
  await prisma.uploadedImage.update({ where: { id }, data: { mime: "application/pdf" } });
  return NextResponse.json({ id, url: `/api/files/${id}` });
}
