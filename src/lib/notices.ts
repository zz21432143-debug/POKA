export type OfficialNotice = {
  id: string;
  title: string;
  date: string;
  href: string;
};

/** 운영 공지. 전광판(레벨업·글작성)과 섞지 않습니다. */
export const OFFICIAL_NOTICES: OfficialNotice[] = [
  {
    id: "notice-openchat",
    title: "POKA 공식 오픈채팅방",
    date: "2026.09.24",
    href: "https://open.kakao.com/o/gewUD9jc",
  },
  {
    id: "notice-dealers",
    title: "인증 골드 뱃지 안내",
    date: "2026.09.24",
    href: "/shop",
  },
  {
    id: "notice-ads",
    title: "홈 제휴 구좌 · 광고 안내",
    date: "2026.09.24",
    href: "/advertise",
  },
];
