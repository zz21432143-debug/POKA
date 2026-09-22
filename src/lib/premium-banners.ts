import { prisma } from "@/lib/db";
import { PREMIUM_BANNERS, type PromoBanner } from "@/lib/banners";

export async function ensureBannerSlots() {
  const existing = await prisma.bannerSlot.findMany();
  const have = new Set(existing.map((row) => row.slot));
  const missing = [1, 2, 3, 4, 5, 6].filter((slot) => !have.has(slot));
  if (missing.length) {
    await prisma.bannerSlot.createMany({
      data: missing.map((slot) => ({ slot, mode: "AUTO", enabled: true })),
    });
  }
}

export async function getPremiumBanners(): Promise<
  (PromoBanner & {
    mode: string;
    enabled: boolean;
    vacant: boolean;
    location?: string | null;
    tag?: string | null;
    isPaid?: boolean;
  })[]
> {
  try {
    await ensureBannerSlots();
    const [slots, promoPosts] = await Promise.all([
      prisma.bannerSlot.findMany({
        orderBy: { slot: "asc" },
        include: { post: true },
      }),
      prisma.post.findMany({
        where: { boardType: "PROMO", hidden: false, storeVerified: true },
        orderBy: [{ isPaid: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const used = new Set<string>();
    const autoPool = [...promoPosts];

    return PREMIUM_BANNERS.map((fallback) => {
      const slot = slots.find((row) => row.slot === fallback.id);
      if (!slot || !slot.enabled) {
        return {
          ...fallback,
          href: "/boards/official/write",
          title: "홍보 등록 문의",
          sponsor: `구좌 ${fallback.id}`,
          mode: slot?.mode ?? "AUTO",
          enabled: false,
          vacant: true,
        };
      }

      if (slot.mode === "MANUAL" && slot.post && !slot.post.hidden) {
        used.add(slot.post.id);
        return {
          id: fallback.id,
          href: `/posts/${slot.post.id}`,
          title: slot.post.title,
          sponsor: `구좌 ${fallback.id} · 수동`,
          image: slot.post.bannerImageUrl || fallback.image,
          mode: "MANUAL",
          enabled: true,
          vacant: false,
          location: slot.post.promoLocation,
          tag: slot.post.promoTag,
          isPaid: slot.post.isPaid,
        };
      }

      const auto = autoPool.find((post) => !used.has(post.id));
      if (auto) {
        used.add(auto.id);
        return {
          id: fallback.id,
          href: `/posts/${auto.id}`,
          title: auto.title,
          sponsor: `구좌 ${fallback.id} · 자동`,
          image: auto.bannerImageUrl || fallback.image,
          mode: "AUTO",
          enabled: true,
          vacant: false,
          location: auto.promoLocation,
          tag: auto.promoTag,
          isPaid: auto.isPaid,
        };
      }

      return {
        ...fallback,
        href: "/boards/official/write",
        title: "홍보 등록 문의",
        sponsor: `구좌 ${fallback.id}`,
        mode: "AUTO",
        enabled: true,
        vacant: true,
      };
    });
  } catch {
    return PREMIUM_BANNERS.map((banner) => ({
      ...banner,
      mode: "AUTO",
      enabled: true,
      vacant: true,
    }));
  }
}
