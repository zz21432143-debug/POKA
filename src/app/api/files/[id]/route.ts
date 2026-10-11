import { prisma } from "@/lib/db";

/** 4MB 이하만 한 번에 내려줄 수 있습니다(서버 응답 한도 4.5MB). 큰 PDF는 …/meta와 조각으로 받습니다. */
const DIRECT_MAX = 4 * 1024 * 1024;

/** 올린 PDF 원본. 작은 파일은 그대로 내려 주고, 큰 파일은 조각 주소를 안내합니다. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, size: true, data: true } });
  if (!file || file.mime !== "application/pdf") return new Response("Not found", { status: 404 });
  let bytes: Uint8Array;
  if (file.data.byteLength > 0) {
    bytes = file.data;
  } else if (file.size <= DIRECT_MAX) {
    const chunks = await prisma.uploadChunk.findMany({ where: { fileId: id }, orderBy: { idx: "asc" }, select: { data: true } });
    bytes = Buffer.concat(chunks.map((c) => Buffer.from(c.data)));
  } else {
    return Response.json(
      { error: "큰 PDF는 게시글의 PDF 보기에서 열어 주세요.", meta: `/api/files/${id}/meta` },
      { status: 413 },
    );
  }
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
