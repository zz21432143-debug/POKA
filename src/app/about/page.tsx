import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/legal/info-page";
import { POKA_TAGLINE } from "@/lib/brand-copy";

export const metadata: Metadata = {
  title: "사이트 소개",
  description: "POKA는 홀덤 딜러 구인·급구 알림부터 게임 현황판, 딜러 로테이션, 매장 관리까지 한곳에서 하는 홀덤 딜러·매장 커뮤니티입니다.",
  alternates: { canonical: "/about" },
};

const FEATURES = [
  {
    title: "딜러 구인구직 · 급구 알림",
    href: "/boards/jobs",
    body: "지역·상호·시급이 제목에 붙는 구인 공고를 보고 사이트 안에서 바로 지원합니다. 앱을 설치하고 급구 알림을 켜 두면 내 지역(또는 전국) 급구가 올라오는 즉시 휴대폰으로 알려 드립니다.",
  },
  {
    title: "게임 현황판",
    href: "/tools/board",
    body: "대회 블라인드 타이머, 플레이어 수, 평균 스택, 레지 마감·브레이크까지 남은 시간, 프라이즈를 매장 TV에 크게 띄웁니다.",
  },
  {
    title: "딜러 로테이션 · 싯드로우",
    href: "/tools/rotation",
    body: "딜러 교대 시간표를 자동으로 짜고, 딜러들은 링크·QR로 자기 다음 테이블을 확인합니다. 싯드로우는 칩이 고르게 나뉘도록 좌석을 배정합니다.",
  },
  {
    title: "급여 계산기 · 팟 계산",
    href: "/tools/pay",
    body: "시급·일당과 근무 시간으로 3.3%·4대보험 공제 후 실수령액을 계산하고, 사이드팟 계산을 연습하며 랭킹에 도전합니다.",
  },
  {
    title: "홀덤 공부 도구 (무료 · 로그인 없이)",
    href: "/info/push-fold",
    body: "포지션별 GTO 푸시폴드 차트(ICM 버블 포함), 승률 계산기, ICM 딜 계산기, 핸드 레인지 순위, 족보 순위. 모두 직접 계산하고 검증한 값입니다.",
  },
  {
    title: "커뮤니티 · 대회 정보",
    href: "/community",
    body: "자유게시판, 핸드리뷰, 현장 스케치, 전국 홀덤 대회 캘린더, TDA 룰을 한곳에서 봅니다.",
  },
] as const;

export default function AboutPage() {
  return (
    <InfoPage title="사이트 소개" lead={`${POKA_TAGLINE}. POKA(pokerwiki.co.kr)는 홀덤 딜러와 매장을 잇는 커뮤니티입니다.`} current="/about">
      <ul className="grid gap-3">
        {FEATURES.map((item) => (
          <li key={item.title}>
            <InfoSection title={item.title}>
              <p>{item.body}</p>
              <Link href={item.href} className="inline-flex min-h-10 w-fit items-center font-bold text-[#f3d9a4] underline underline-offset-4">
                바로 가기
              </Link>
            </InfoSection>
          </li>
        ))}
      </ul>
      <InfoSection title="이용 안내">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>회원 가입 후 모든 기능을 무료로 쓸 수 있습니다.</li>
          <li>급구는 근무일이 지나면, 일반 공고는 30일이 지나면 자동으로 마감됩니다.</li>
          <li>운영진이 확인한 딜러는 닉네임 옆에 골드 뱃지가 붙습니다.</li>
          <li>POKA는 홀덤 딜러 일자리, 대회 정보, 매장 운영 도구만 다룹니다.</li>
          <li>만 19세 이상만 이용할 수 있습니다.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
