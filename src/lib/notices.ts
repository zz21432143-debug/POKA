import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";

/** 공지 게시판 최신 3개(1분 캐시). 사이드바 공지 위젯용입니다. */
export const getLatestNotices = unstable_cache(
  async () =>
    prisma.post.findMany({
      where: { boardType: "NOTICE", hidden: false, isAttendanceThread: false },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true },
    }),
  ["poka-latest-notices"],
  { revalidate: 60 },
);

export function formatNoticeDate(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replace(/\s/g, "")
    .replace(/\.$/, "");
}

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
    href: KAKAO_OPEN_CHAT_URL,
  },
  {
    id: "notice-dealers",
    title: "인증 골드 뱃지 안내",
    date: "2026.09.24",
    href: "/info/dealers",
  },
  {
    id: "notice-ads",
    title: "POKA 광고 · 제휴 안내",
    date: "2026.09.24",
    href: "/advertise",
  },
];
