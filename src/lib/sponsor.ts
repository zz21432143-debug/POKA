export type SponsorMark = "AD" | "제휴";

export type SidebarSponsor = {
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: SponsorMark;
};

/** 우측 300×150 구좌. imageUrl이 없으면 제휴 문의 플레이스홀더. */
export const SIDEBAR_SPONSOR: SidebarSponsor = {
  imageUrl: null,
  href: "/advertise",
  title: "스폰서 배너",
  advertiser: "",
  mark: "AD",
};

export const NATIVE_SPONSOR = {
  title: "딜러 전용 유니폼, 지금 런칭 혜택으로 맞추세요",
  advertiser: "DEALER FIT",
  href: "/advertise",
  hint: "커뮤니티 제휴 상품 · 사이드바·홈 카드와 함께 노출",
};

export const AD_PRODUCTS = [
  {
    id: "sidebar",
    code: "A",
    name: "사이드바 배너",
    size: "300 × 150 px",
    price: "월 180,000원",
    weekly: "주 50,000원",
    exclusive: "해당 기간 1팀 단독",
    where: "PC는 오른쪽 칼럼, 프로필 카드 바로 아래. 홈·게시판·글 상세를 옮겨도 같이 따라옵니다. 모바일·태블릿은 본문 맨 아래에 같은 배너가 붙습니다.",
    why: "페이지마다 보이지만 시선은 본문보다 약합니다. 지역 홀덤 카페 우측 배너가 보통 월 20~40만 원대라, 트래픽이 아직 검증되지 않은 오픈 시즌에는 그 아래인 월 18만으로 잡았습니다.",
  },
  {
    id: "home-card",
    code: "B",
    name: "홈 홍보 포스터",
    size: "5:7 포스터 · 홈 3칸 중 1칸",
    price: "월 450,000원",
    weekly: "주 120,000원",
    exclusive: "최대 9팀이 3칸을 순환 · 단독 고정 아님",
    where: "홈 맨 위 「지금, 진행중인 홍보 포스터」입니다. 한 번에 3장이 보이고, 3초마다 한 칸씩 왼쪽으로 밀립니다. 풀은 최대 9장입니다. 포스터에는 [AD] 또는 [제휴] 마크가 붙습니다.",
    why: "첫 화면이지만 3칸·순환이라 카페 메인 고정 배너(월 50~80만)보다 노출이 나눠집니다. 그래서 월 45만으로 맞춰 두었습니다. 자리를 혼자 쓰고 싶으면 문의 시 단독 옵션을 따로 받습니다.",
  },
  {
    id: "native",
    code: "C",
    name: "네이티브 인피드",
    size: "목록 한 줄",
    price: "월 220,000원",
    weekly: "주 60,000원",
    exclusive: "해당 목록에 1줄",
    where: "홈 최신 게시글, 게시판 목록에서 위에서 3번째와 4번째 글 사이에 삽입됩니다. 일반 글처럼 한 줄로 보이되 [AD]·[제휴] 표시가 있습니다.",
    why: "스크롤 중에만 보이므로 배너보다 싸게 잡습니다. 카페 게시글형 홍보(월 15~30만)와 비슷한 구간입니다.",
  },
  {
    id: "pack",
    code: "A+B+C",
    name: "월간 패키지",
    size: "배너 + 포스터 + 인피드 + 공식 홍보 글 1회",
    price: "월 700,000원",
    weekly: "주 단위 없음",
    exclusive: "묶음 계약 · 따로 사면 월 85만",
    where: "위 세 자리를 동시에 쓰고, 공식 홍보 게시판에 협찬 글 1개를 올립니다.",
    why: "세 구좌를 따로 사면 월 85만입니다. 한 달 단위로 묶으면 약 18% 낮춘 70만입니다. 오픈 시즌 한정 가이드가이며, 방문 수가 안정되면 단가를 다시 공지합니다.",
  },
] as const;
