import sharp from "sharp";
import { prisma } from "@/lib/db";
import { IMAGE_WIDTHS } from "@/lib/image-url";

/**
 * 업로드한 이미지를 보여 줍니다. 한 번 올린 이미지는 바뀌지 않으므로 오래 캐시합니다.
 * ?w=480 처럼 폭을 주면 그 폭 이하로 줄인 WebP를 돌려줍니다(움직이는 GIF는 원본).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const image = await prisma.uploadedImage.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!image || !image.mime.startsWith("image/")) return new Response("Not found", { status: 404 });
  const headers = {
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  const width = Number(new URL(request.url).searchParams.get("w"));
  if ((IMAGE_WIDTHS as readonly number[]).includes(width) && image.mime !== "image/gif" && image.mime !== "image/svg+xml") {
    try {
      const small = await sharp(Buffer.from(image.data)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      return new Response(new Uint8Array(small), { headers: { ...headers, "Content-Type": "image/webp" } });
    } catch {
      // 줄이지 못하면 원본
    }
  }
  return new Response(Buffer.from(image.data), { headers: { ...headers, "Content-Type": image.mime } });
}
