import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POKA 소개",
  description: "POKA는 홀덤 딜러 지원·급구 대타 구인구직을 중심으로 한 홀덤 딜러·플레이어 커뮤니티입니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="prose-legal mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">사이트 소개</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        POKA(pokerwiki.co.kr)는 홀덤 딜러와 홀덤펍을 잇는 구인구직 커뮤니티입니다. 지원 딜러 구인과 급구·대타를
        중심으로 대회 일정, 핸드리뷰, 자유게시판을 한곳에 모읍니다.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7">
        <li>지원 딜러 구인 — 지역·상호·시급이 제목에 붙고, 사이트 안에서 바로 지원할 수 있습니다.</li>
        <li>급구 / 대타 — 내 지역을 정해 두면 새 급구를 알려 드립니다.</li>
        <li>공고는 급구는 근무일이 지나면, 일반 공고는 30일이 지나면 자동 마감됩니다.</li>
        <li>대회 캘린더 — 전국 홀덤 대회를 달력으로 봅니다.</li>
        <li>인증 — 운영진이 확인한 딜러는 닉네임 옆에 골드 뱃지가 붙습니다.</li>
        <li>만 19세 이상만 이용할 수 있습니다.</li>
        <li>공식 오픈채팅은 상단과 우측의 노란 카카오 버튼으로 들어갑니다.</li>
      </ul>
    </article>
  );
}
