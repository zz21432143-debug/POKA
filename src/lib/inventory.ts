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

/** 개발 중 시안 광고주 이름. 운영에 남아 있으면 지웁니다. */
const DEMO_ADVERTISER = "DEALER FIT";

let unitsReady: Promise<void> | null = null;
let creativeMemo: { at: number; byPlacement: Map<string, DirectCreative | null> } | null = null;
const CREATIVE_TTL_MS = 20_000;

export async function ensureSponsorUnits() {
  if (!unitsReady) {
    unitsReady = (async () => {
      // 예전에 시안으로 넣어 둔 가짜 광고주 소재를 비웁니다. 실제 광고는 /admin/banners에서 넣습니다.
      await prisma.sponsorUnit.updateMany({
        where: { advertiser: DEMO_ADVERTISER },
        data: { title: "", advertiser: "", imageUrl: null, href: "/advertise" },
      });
      const existing = await prisma.sponsorUnit.findMany();
      const have = new Set(existing.map((row) => row.placement));
      const missing = SPONSOR_PLACEMENTS.filter((placement) => !have.has(placement));
      if (!missing.length) return;
      await prisma.sponsorUnit.createMany({
        data: missing.map((placement) => ({
          placement,
          href: "/advertise",
          title: "",
          advertiser: "",
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
