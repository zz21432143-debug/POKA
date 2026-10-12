import { BANNER_SIZE, PLACEMENT_META, POSTER_SIZE } from "@/lib/inventory-policy";

/**
 * 홍보 자리(B·A·S·C) 설명. 관리자 「홍보 자리 관리」와 광고 문의 페이지가 같은 설명을 씁니다.
 * where: 화면 어디에 나오는지 / admin: 관리자가 채우는 법 / buyer: 광고주에게 보여 줄 설명
 */
export const AD_SLOTS = [
  {
    key: "B",
    color: "bg-[#8b2222] text-white",
    name: "메인 포스터",
    code: "B1–B6",
    count: "6자리",
    where: "홈 화면 맨 위 큰 그림 바로 아래. 세로 포스터가 한 줄에 3장씩 보이고 옆으로 넘어갑니다.",
    admin: "공식 홍보 게시판 글의 사진이 들어갑니다. 비어 있는 자리에는 'POKA 무료 홍보 이벤트' 포스터가 나옵니다.",
    buyer: "들어올 때마다 순서가 섞여 6자리가 고르게 보입니다. 누르면 공식 홍보 게시판의 상세 소개 글로 이어집니다. 대회·이벤트·매장 오픈 포스터에 잘 맞습니다.",
    size: POSTER_SIZE,
  },
  {
    key: "A",
    color: "bg-[#1e6fd9] text-white",
    name: "하단 가로 배너",
    code: "A1·A2·A3",
    count: "3자리",
    where: "홈·게시판·출석체크·검색 화면에서 글 목록이 끝난 맨 아래. 가로 배너 3개가 나란히 보입니다.",
    admin: "여기서 사진을 올려 채웁니다. 비워 두면 구글 광고가 대신 나옵니다.",
    buyer: "글을 다 읽고 내려온 회원 눈에 띄는 자리입니다. 누르면 원하는 링크(매장 소개·예약·SNS)로 이동합니다.",
    size: BANNER_SIZE,
  },
  {
    key: "S",
    color: "bg-[#c59b27] text-[#1d1611]",
    name: "오른쪽 사이드 배너",
    code: "S",
    count: "1자리",
    where: "PC: 화면 오른쪽 내 프로필 상자 바로 아래(모든 페이지). 휴대폰: 맨 아래 가로 배너(A) 밑.",
    admin: "여기서 사진을 올려 채웁니다. 비워 두면 '광고 문의' 안내가 나옵니다.",
    buyer: "PC에서는 어느 페이지를 보든 오른쪽에 계속 보이는 단독 자리입니다.",
    size: PLACEMENT_META.SIDEBAR.size,
  },
  {
    key: "C",
    color: "bg-[#2a9d55] text-white",
    name: "글 목록 속 광고",
    code: "C",
    count: "1자리",
    where: "커뮤니티 게시판(자유·질문·현장 스케치·건의 등) 글 목록과 홈 '최신글' 목록에서 3번째 글 바로 아래. 글처럼 한 줄로 끼어 들어가고 '제휴'·'AD' 표시가 붙습니다. 구인 게시판에는 나오지 않습니다.",
    admin: "제목을 넣어야 보입니다(사진은 선택, 넣으면 제목 왼쪽에 크게 보임). 제목을 비우면 이 줄은 아예 안 나옵니다.",
    buyer: "글을 읽는 흐름 안에 금테 카드로 끼어 들어가는 광고입니다. 제목과 사진 1장이 크게 들어갑니다.",
    size: PLACEMENT_META.NATIVE.size,
  },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]["key"];
