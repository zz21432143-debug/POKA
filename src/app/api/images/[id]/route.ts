import { prisma } from "@/lib/db";

/** 업로드한 이미지를 보여 줍니다. 한 번 올린 이미지는 바뀌지 않으므로 오래 캐시합니다. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!image || !image.mime.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
