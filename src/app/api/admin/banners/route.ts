import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ensureBannerSlots } from "@/lib/premium-banners";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  await ensureBannerSlots();
  const slots = await prisma.bannerSlot.findMany({
    orderBy: { slot: "asc" },
    include: { post: { select: { id: true, title: true, hidden: true } } },
  });
  const promo = await prisma.post.findMany({
    where: { boardType: "PROMO" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, title: true, hidden: true, isPaid: true },
  });
  return NextResponse.json({ slots, promo });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    slot?: number;
    mode?: "MANUAL" | "AUTO";
    enabled?: boolean;
    postId?: string | null;
  };
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 6) {
    return NextResponse.json({ error: "구좌 번호는 1~6입니다." }, { status: 400 });
  }
  await ensureBannerSlots();
  const updated = await prisma.bannerSlot.update({
    where: { slot },
    data: {
      mode: body.mode === "MANUAL" ? "MANUAL" : body.mode === "AUTO" ? "AUTO" : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      postId: body.postId === undefined ? undefined : body.postId,
    },
  });
  return NextResponse.json(updated);
}
