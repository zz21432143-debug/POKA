import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";
import { FeaturedPromoRotator } from "@/components/home/featured-promo-rotator";
import { prisma } from "@/lib/db";
import {
  HOME_PROMO_MAX_POOL,
  HOME_PROMO_ROTATE_MS,
  HOME_PROMO_VISIBLE,
  type HomePromo,
} from "@/lib/promo-rotate";

export async function FeaturedPromos() {
  const posts = await prisma.post
    .findMany({
      where: { boardType: "PROMO", hidden: false, storeVerified: true },
      orderBy: [{ isPaid: "desc" }, { createdAt: "desc" }],
      take: HOME_PROMO_MAX_POOL,
    })
    .catch(() => []);

  const pool: HomePromo[] = posts.map((post) => ({
    key: post.id,
    href: `/posts/${post.id}`,
    title: post.title,
    image: post.bannerImageUrl || "/images/posters/official-1.png",
    location: post.promoLocation,
    tag: post.promoTag,
    isPaid: post.isPaid,
  }));

  const seconds = Math.round(HOME_PROMO_ROTATE_MS / 1000);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MegaphoneIcon className="size-4 text-primary" />
          지금, 진행중인 홍보 포스터
        </h2>
        <Link href="/boards/official" className="text-xs text-muted-foreground hover:text-primary">
          전체보기
        </Link>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {HOME_PROMO_VISIBLE}칸을 유지하고 {seconds}초마다 한 장씩 바꿉니다. 풀은 최대 {HOME_PROMO_MAX_POOL}
        장입니다.
      </p>
      <FeaturedPromoRotator pool={pool} />
    </section>
  );
}
