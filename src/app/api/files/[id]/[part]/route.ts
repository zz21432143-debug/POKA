import { prisma } from "@/lib/db";
import { PDF_PART_BYTES, pdfPartCount } from "@/lib/uploads";

/**
 * PDF 조각 내려받기. part가 "meta"이면 크기·조각 수를, 숫자면 그 조각 바이트를 줍니다.
 * 예전 방식(조각 없이 한 덩어리로 저장한 작은 PDF)은 조각 1개로 보여 줍니다.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string; part: string }> }) {
  const { id, part } = await context.params;
  const file = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, size: true, data: true } });
  if (!file || file.mime !== "application/pdf") return new Response("Not found", { status: 404 });
  const legacy = file.data.byteLength > 0;
  const parts = legacy ? 1 : pdfPartCount(file.size);
  const cache = { "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };

  if (part === "meta") {
    return Response.json({ size: file.size, parts, partSize: legacy ? file.size : PDF_PART_BYTES }, { headers: cache });
  }
  const idx = Number(part);
  if (!Number.isInteger(idx) || idx < 0 || idx >= parts) return new Response("Not found", { status: 404 });
  const bytes = legacy
    ? file.data
    : (await prisma.uploadChunk.findUnique({ where: { fileId_idx: { fileId: id, idx } }, select: { data: true } }))?.data;
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/octet-stream", ...cache } });
}
