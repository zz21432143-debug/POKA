import { prisma } from "@/lib/db";

/** 올린 문서 파일(PDF)을 보여 줍니다. 한 번 올린 파일은 바뀌지 않으므로 오래 캐시합니다. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!file || file.mime !== "application/pdf") return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
