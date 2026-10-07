export type PromoBanner = {
  id: number;
  href: string;
  title: string;
  sponsor: string;
  image: string;
};

export const PREMIUM_BANNERS: PromoBanner[] = [1, 2, 3, 4, 5, 6].map((id) => ({
  id,
  href: "/advertise",
  title: "제휴 / 광고 문의하기",
  sponsor: `구좌 ${id}`,
  image: "",
}));
