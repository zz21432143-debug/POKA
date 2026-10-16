import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { isLockedRewardSlug } from "@/lib/yokai-catalog";
import { publicErrorMessage } from "@/lib/public-error";
import { markPriceFor } from "@/lib/yokai-marks";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const mark = await prisma.mark.findUnique({ where: { id } });
    if (!mark) {
      return NextResponse.json({ error: "마크를 찾을 수 없습니다." }, { status: 404 });
    }
    if (isLockedRewardSlug(mark.slug) || mark.pricePoints <= 0) {
      return NextResponse.json({ error: "이 마크는 상점에서 구매할 수 없습니다." }, { status: 400 });
    }
    const owned = await prisma.userMark.findUnique({
      where: { userId_markId: { userId: user.id, markId: id } },
    });
    if (owned) {
      return NextResponse.json({ error: "이미 보유한 마크입니다." }, { status: 409 });
    }
    // 그 요괴를 키우고 있으면 요괴 마을 마크 반값
    const pets = await prisma.yokaiOwned.findMany({ where: { userId: user.id }, select: { species: true } }).catch(() => []);
    const price = markPriceFor(mark.slug, mark.pricePoints, new Set(pets.map((p) => p.species)));
    // 포인트 확인과 차감을 한 번에(동시에 두 번 눌러도 마이너스가 되지 않게)
    const paid = await prisma.$transaction(async (tx) => {
      const r = await tx.user.updateMany({ where: { id: user.id, points: { gte: price } }, data: { points: { decrement: price } } });
      if (r.count !== 1) return false;
      await tx.userMark.create({ data: { userId: user.id, markId: id } });
      // 산 값 기록 — 운영자 환불 때 기본 금액(반값으로 산 경우까지 정확히)
      await tx.auditLog.create({ data: { kind: "mark-buy", userId: user.id, ip: "-", detail: `${id}:${price}` } });
      return true;
    });
    if (!paid) {
      return NextResponse.json({ error: "포인트가 부족합니다." }, { status: 400 });
    }

    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `MARK:${user.id}:${mark.id}`,
      message: `🎰 ${user.nickname}님이 마크 상점에서 [${mark.name}]를 구매하셨습니다!`,
      href: "/shop",
    });

    // 요괴 마을 도감 단계 보상
    const { checkVillageCollection } = await import("@/lib/village-collection");
    const collection = await checkVillageCollection(user.id).catch(() => null);
    return NextResponse.json({ ok: true, spent: price, collection: collection?.got ?? [] });
  } catch (error) {
    const message = publicErrorMessage(error, "구매에 실패했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
