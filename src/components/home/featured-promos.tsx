import Link from "next/link";
import { MegaphoneIcon } from "lucide-react";
import { FeaturedPromoRotator } from "@/components/home/featured-promo-rotator";
import { prisma } from "@/lib/db";
import {
  HOME_PROMO_MAX_POOL,
  HOME_PROMO_ROTATE_MS,
  shuffleInPlaceCopy,
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

  const pool: HomePromo[] = shuffleInPlaceCopy(
    posts
      .filter((post) => Boolean(post.bannerImageUrl))
      .map((post) => ({
        key: post.id,
        href: `/posts/${post.id}`,
        title: post.title,
        image: post.bannerImageUrl as string,
        location: post.promoLocation,
        tag: post.promoTag,
        isPaid: post.isPaid,
      })),
  );

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
        들어올 때마다 순서가 바뀌고, {seconds}초마다 한 칸씩 왼쪽으로 밀립니다. 좌우 화살표로도
        넘길 수 있습니다.
      </p>
      <FeaturedPromoRotator pool={pool} />
    </section>
  );
}
