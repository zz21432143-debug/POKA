import { AD_SLOTS } from "@/lib/ad-slots";

export type SponsorMark = "AD" | "제휴";

/**
 * 광고 문의 페이지에 소개하는 상품. 금액은 상담 후 안내합니다.
 * 홍보 자리(B·A·S·C)는 관리자 「홍보 자리 관리」와 같은 설명(AD_SLOTS)을 씁니다.
 */
export const AD_PRODUCTS = [
  ...AD_SLOTS.map((slot) => ({
    id: `slot-${slot.key}`,
    key: slot.key as string | null,
    code: `${slot.key} · ${slot.code}`,
    name: slot.name,
    size: slot.size,
    exclusive: slot.count,
    where: slot.where,
    detail: slot.buyer as string,
  })),
  {
    id: "premium-job",
    key: null,
    code: "구인",
    name: "구인공고 프리미엄 상단 고정",
    size: "공고 1건",
    exclusive: "기간 동안 목록 맨 위",
    where: "지원 딜러·대회 딜러·급구·고정 구인 목록 맨 위에 금색 '프리미엄' 배지와 함께 고정됩니다.",
    detail: "딜러를 빨리 구해야 하는 매장에 효과적입니다.",
  },
  {
    id: "official",
    key: null,
    code: "홍보",
    name: "공식 홍보 게시판 등록",
    size: "포스터 + 소개글",
    exclusive: "기간 협의",
    where: "POKA → 공식 홍보 게시판에 포스터와 상세 소개를 올려 드립니다.",
    detail: "메인 포스터(B)와 함께 하면 포스터를 누른 회원이 바로 상세 소개를 봅니다.",
  },
];
