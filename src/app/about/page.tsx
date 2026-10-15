import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/legal/info-page";
import { POKA_TAGLINE } from "@/lib/brand-copy";
import { DEFAULT_CONTACT_EMAIL } from "@/lib/legal-contact";
import { KAKAO_INQUIRY_ID } from "@/lib/kakao";
import { GUIDE_ARTICLES } from "@/lib/info-pages";

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
      <InfoSection title="POKA를 만든 이유">
        <p>
          홀덤 딜러 일자리는 대부분 단톡방과 지인 소개로 흘러 다녀서, 처음 시작하는 사람은 어디서 공고를 봐야 할지, 시급이 적당한지, 무엇을 준비해야
          할지 알기 어렵습니다. 매장은 매장대로 딜러 교대표와 대회 타이머를 엑셀과 손글씨로 관리하는 경우가 많습니다.
        </p>
        <p>
          POKA는 이 두 가지 불편을 한곳에서 풀려고 만든 사이트입니다. 딜러는 공고와 근무 정보, 실무 가이드를 보고, 매장은 무료 운영 도구로 대회와
          딜러 근무를 관리합니다.
        </p>
      </InfoSection>
      <InfoSection title="콘텐츠 작성 원칙">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            딜러 가이드 {GUIDE_ARTICLES.length}편은 POKA 운영팀이 현장에서 자주 나오는 질문을 바탕으로 직접 씁니다. 글마다 작성자와 최종 수정일을 표시합니다.
          </li>
          <li>룰 설명은 국제 토너먼트 표준 룰(TDA)을 기준으로 하고, 매장 하우스 룰이 다를 수 있음을 함께 적습니다.</li>
          <li>급여 · 세금 계산은 참고용이며, 실제 적용은 근무 형태와 계약에 따라 달라질 수 있음을 안내합니다.</li>
          <li>도박을 권하거나 돈을 걸고 하는 게임을 홍보하는 글, 불법 사이트 광고는 올리지 않고 발견하면 바로 숨깁니다.</li>
          <li>틀린 내용을 발견하면 아래 연락처로 알려 주세요. 확인 후 고치고 수정일을 갱신합니다.</li>
        </ul>
      </InfoSection>
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
      <InfoSection title="운영 정보 · 연락처">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            운영: POKA 운영팀 ·{" "}
            <Link href="/operator" className="font-bold text-[#f3d9a4] underline underline-offset-4">
              운영자 소개
            </Link>
          </li>
          <li>
            이메일: <a href={`mailto:${DEFAULT_CONTACT_EMAIL}`} className="font-bold text-[#f3d9a4] underline underline-offset-4">{DEFAULT_CONTACT_EMAIL}</a>
          </li>
          <li>카카오톡 문의: 카카오톡에서 「{KAKAO_INQUIRY_ID}」 검색 후 친구 추가</li>
          <li>
            <Link href="/contact" className="font-bold text-[#f3d9a4] underline underline-offset-4">
              문의하기
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="font-bold text-[#f3d9a4] underline underline-offset-4">
              개인정보처리방침
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="font-bold text-[#f3d9a4] underline underline-offset-4">
              이용약관
            </Link>
          </li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
