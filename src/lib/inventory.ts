import { prisma } from "@/lib/db";
import {
  SPONSOR_PLACEMENTS,
  normalizeMark,
  type DirectCreative,
  type SponsorPlacement,
} from "@/lib/inventory-policy";

export {
  SPONSOR_PLACEMENTS,
  normalizeMark,
  isDirectFilled,
  pickFill,
  type DirectCreative,
  type SponsorPlacement,
} from "@/lib/inventory-policy";

function asCreative(
  row: {
    placement: string;
    imageUrl: string | null;
    href: string;
    title: string;
    advertiser: string;
    mark: string;
    enabled: boolean;
  } | null,
): DirectCreative | null {
  if (!row) return null;
  if (row.placement !== "SIDEBAR" && row.placement !== "NATIVE") return null;
  return {
    placement: row.placement,
    imageUrl: row.imageUrl,
    href: row.href || "/advertise",
    title: row.title,
    advertiser: row.advertiser,
    mark: normalizeMark(row.mark),
  };
}

export async function ensureSponsorUnits() {
  const existing = await prisma.sponsorUnit.findMany();
  const have = new Set(existing.map((row) => row.placement));
  const missing = SPONSOR_PLACEMENTS.filter((placement) => !have.has(placement));
  if (!missing.length) return;
  await prisma.sponsorUnit.createMany({
    data: missing.map((placement) => ({
      placement,
      href: "/advertise",
      title: placement === "NATIVE" ? "딜러 전용 유니폼, 지금 런칭 혜택으로 맞추세요" : "",
      advertiser: placement === "NATIVE" ? "DEALER FIT" : "",
      mark: "제휴",
      enabled: true,
    })),
  });
}

export async function getSponsorCreative(placement: SponsorPlacement): Promise<DirectCreative | null> {
  try {
    await ensureSponsorUnits();
    const row = await prisma.sponsorUnit.findUnique({ where: { placement } });
    if (!row?.enabled) return null;
    return asCreative(row);
  } catch {
    return null;
  }
}
