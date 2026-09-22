import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ensureSponsorUnits, SPONSOR_PLACEMENTS } from "@/lib/inventory";
import { normalizeMark, type SponsorPlacement } from "@/lib/inventory-policy";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  await ensureSponsorUnits();
  const units = await prisma.sponsorUnit.findMany({ orderBy: { placement: "asc" } });
  return NextResponse.json({ units });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    placement?: string;
    imageUrl?: string | null;
    href?: string;
    title?: string;
    advertiser?: string;
    mark?: string;
    enabled?: boolean;
  };
  const placement = body.placement as SponsorPlacement;
  if (!SPONSOR_PLACEMENTS.includes(placement)) {
    return NextResponse.json({ error: "placement이 올바르지 않습니다." }, { status: 400 });
  }
  await ensureSponsorUnits();
  const updated = await prisma.sponsorUnit.update({
    where: { placement },
    data: {
      imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl || null,
      href: body.href?.trim() || undefined,
      title: body.title === undefined ? undefined : body.title,
      advertiser: body.advertiser === undefined ? undefined : body.advertiser,
      mark: body.mark ? normalizeMark(body.mark) : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    },
  });
  return NextResponse.json(updated);
}
