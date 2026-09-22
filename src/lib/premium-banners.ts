import { prisma } from "@/lib/db";
import { PREMIUM_BANNERS, type PromoBanner } from "@/lib/banners";

export async function getPremiumBanners(): Promise<PromoBanner[]> {
  try {
    const posts = await prisma.post.findMany({
      where: { bannerSlot: { not: null } },
      orderBy: { bannerSlot: "asc" },
    });
    const bySlot = new Map(posts.map((post) => [post.bannerSlot, post]));
    return PREMIUM_BANNERS.map((fallback) => {
      const post = bySlot.get(fallback.id);
      if (!post) return fallback;
      return {
        id: fallback.id,
        href: `/posts/${post.id}`,
        title: post.title,
        sponsor: `구좌 ${fallback.id}`,
        image: post.bannerImageUrl || fallback.image,
      };
    });
  } catch {
    return PREMIUM_BANNERS;
  }
}
