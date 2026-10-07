import { prisma } from "@/lib/db";
import {
  SPONSOR_PLACEMENTS,
  normalizeMark,
  type DirectCreative,
  type SponsorPlacement,
} from "@/lib/inventory-policy";

export {
  SPONSOR_PLACEMENTS,
  PLACEMENT_META,
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
  if (!(SPONSOR_PLACEMENTS as readonly string[]).includes(row.placement)) return null;
  return {
    placement: row.placement as SponsorPlacement,
    imageUrl: row.imageUrl,
    href: row.href || "/advertise",
    title: row.title,
    advertiser: row.advertiser,
    mark: normalizeMark(row.mark),
  };
}

let unitsReady: Promise<void> | null = null;
let creativeMemo: { at: number; byPlacement: Map<string, DirectCreative | null> } | null = null;
const CREATIVE_TTL_MS = 20_000;

export async function ensureSponsorUnits() {
  if (!unitsReady) {
    unitsReady = (async () => {
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
    })().catch((error) => {
      unitsReady = null;
      throw error;
    });
  }
  return unitsReady;
}

async function loadCreatives() {
  if (creativeMemo && Date.now() - creativeMemo.at < CREATIVE_TTL_MS) {
    return creativeMemo.byPlacement;
  }
  await ensureSponsorUnits();
  const rows = await prisma.sponsorUnit.findMany();
  const byPlacement = new Map<string, DirectCreative | null>();
  for (const placement of SPONSOR_PLACEMENTS) {
    const row = rows.find((item) => item.placement === placement);
    byPlacement.set(placement, row?.enabled ? asCreative(row) : null);
  }
  creativeMemo = { at: Date.now(), byPlacement };
  return byPlacement;
}

export async function getSponsorCreative(placement: SponsorPlacement): Promise<DirectCreative | null> {
  try {
    const map = await loadCreatives();
    return map.get(placement) ?? null;
  } catch {
    return null;
  }
}

export async function getFeedCreatives(): Promise<
  [DirectCreative | null, DirectCreative | null, DirectCreative | null]
> {
  try {
    const map = await loadCreatives();
    return [map.get("A1") ?? null, map.get("A2") ?? null, map.get("A3") ?? null];
  } catch {
    return [null, null, null];
  }
}
