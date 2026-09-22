export type PromoBanner = {
  id: number;
  href: string;
  title: string;
  sponsor: string;
  image: string;
};

export const PREMIUM_BANNERS: PromoBanner[] = [
  {
    id: 1,
    href: "/boards/official",
    title: "강남 캐주얼 나이트",
    sponsor: "프리미엄 A",
    image: "/banners/slot-1.svg",
  },
  {
    id: 2,
    href: "/boards/jobs/dealer",
    title: "주말 딜러 오픈",
    sponsor: "프리미엄 B",
    image: "/banners/slot-2.svg",
  },
  {
    id: 3,
    href: "/boards/hand-review",
    title: "핸드스터디 시즌2",
    sponsor: "프리미엄 C",
    image: "/banners/slot-3.svg",
  },
  {
    id: 4,
    href: "/boards/anonymous",
    title: "룸 투어 위크",
    sponsor: "프리미엄 D",
    image: "/banners/slot-4.svg",
  },
  {
    id: 5,
    href: "/attendance",
    title: "출석 더블 EXP",
    sponsor: "프리미엄 E",
    image: "/banners/slot-5.svg",
  },
  {
    id: 6,
    href: "/boards/official",
    title: "클럽 멤버십",
    sponsor: "프리미엄 F",
    image: "/banners/slot-6.svg",
  },
];
