export const FEATURED_OFFICIAL_POSTERS = [
  {
    title: "RunnerOne 총상금 11억",
    image: "/images/posters/official-1.png",
    location: "서울",
    tag: "토너먼트",
    content:
      "Runner Poker Tournament. 위성 2026.10.14~12.11, 메인 2026.12.05~12.13. 총 상금 11억.",
    isPaid: true,
    onHome: true,
    publicBoard: true,
  },
  {
    title: "홀덤 마스터스 8th WPL 메인",
    image: "/images/posters/official-2.png",
    location: "서울 광진구",
    tag: "토너먼트",
    content:
      "THE HOLDEM MASTERS 8th. 타이틀 스폰서 WPL. 아지수 서울센터. DAY1부터 FINAL 일정.",
    isPaid: true,
    onHome: true,
    publicBoard: true,
  },
  {
    title: "APL 총 23억 GTD 프리롤",
    image: "/images/posters/official-3.jpg",
    location: "온라인",
    tag: "제휴",
    content: "pokerlulu x APL. 9.28(월) 120장 온라인 프리롤. 총 23억 GTD.",
    isPaid: true,
    onHome: true,
    publicBoard: true,
  },
  {
    title: "포커룰루 APL 새틀라이트 오픈",
    image: "/images/posters/official-4.jpg",
    location: "온라인",
    tag: "제휴",
    content: "Poker Lulu x APL Online Satellite Open. 9/28 13시 시작. 멤버십·데일리 프리롤.",
    isPaid: true,
    onHome: false,
    publicBoard: true,
  },
  {
    title: "현장 스케치 포스터",
    image: "/images/posters/official-5.jpg",
    location: "홍대",
    tag: "홍보",
    content: "공식 홍보 구좌 시안 확인용 포스터입니다.",
    isPaid: false,
    onHome: false,
    publicBoard: true,
  },
  {
    title: "왕좌의 게임 3,000만 GTD",
    image: "/images/posters/official-6.jpg",
    location: "강남 뉴스톤아레나",
    tag: "토너먼트",
    content: "K-STAR 왕좌의 게임. 9월 23일(수) 18:00, 30,000,000 GTD. 뉴스톤아레나.",
    isPaid: true,
    onHome: false,
    publicBoard: true,
  },
] as const;

export const PUBLIC_OFFICIAL_POSTERS = FEATURED_OFFICIAL_POSTERS.filter((row) => row.publicBoard);
export const HOME_OFFICIAL_POSTERS = FEATURED_OFFICIAL_POSTERS.filter((row) => row.onHome);
export const OFFICIAL_POSTER_IMAGES = PUBLIC_OFFICIAL_POSTERS.map((row) => row.image);
