import { OFFICIAL_POSTER_IMAGES } from "@/lib/official-posters";

export type PromoBanner = {
  id: number;
  href: string;
  title: string;
  sponsor: string;
  image: string;
};

export const PREMIUM_BANNERS: PromoBanner[] = OFFICIAL_POSTER_IMAGES.map((image, index) => ({
  id: index + 1,
  href: "/boards/official",
  title: "공식 홍보 포스터",
  sponsor: `프리미엄 ${index + 1}`,
  image,
}));
