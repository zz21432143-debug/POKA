import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/legal/info-page";
import { KAKAO_INQUIRY_ID } from "@/lib/kakao";
import { LEGAL_SERVICE_URL } from "@/lib/legal";
import { privacyOfficerName, publicContactEmail } from "@/lib/legal-contact";

export const metadata: Metadata = {
  title: "운영자 소개",
  description: "POKA를 운영하는 사람과 운영 원칙, 연락처를 안내합니다.",
  alternates: { canonical: "/operator" },
};

export default function OperatorPage() {
  const email = publicContactEmail();
  return (
    <InfoPage title="운영자 소개" lead="POKA는 홀덤 딜러와 매장이 현장에서 겪는 불편을 줄이려고 만든 사이트입니다." current="/operator">
      <InfoSection title="운영자">
        <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
          <dt className="text-[#b7ab97]">서비스명</dt>
          <dd className="font-bold">POKA (포카)</dd>
          <dt className="text-[#b7ab97]">주소</dt>
          <dd className="break-all">{LEGAL_SERVICE_URL}</dd>
          <dt className="text-[#b7ab97]">운영자</dt>
          <dd>{privacyOfficerName()}</dd>
          <dt className="text-[#b7ab97]">이메일</dt>
          <dd className="break-all">
            <a href={`mailto:${email}`} className="underline underline-offset-4">
              {email}
            </a>
          </dd>
          <dt className="text-[#b7ab97]">카카오톡</dt>
          <dd>ID {KAKAO_INQUIRY_ID}</dd>
        </dl>
      </InfoSection>
      <InfoSection title="운영자 경력">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>홀덤 딜러로 7년 넘게 근무했습니다. 지원 딜러 · 고정 딜러 · 대회 딜러를 모두 경험했습니다.</li>
          <li>홀덤 매장을 직접 운영했고, 다른 매장에서 매니저로 오래 일하며 딜러 교육 · 로테이션 · 대회 진행을 맡았습니다.</li>
          <li>딜러 가이드와 매장 관리 도구는 이 현장 경험을 바탕으로 직접 쓰고 만듭니다. (매장 이름은 공개하지 않습니다.)</li>
        </ul>
      </InfoSection>
      <InfoSection title="왜 만들었나요">
        <p>딜러 구인은 여러 단톡방에 흩어져 있고, 대회 날 매장은 타이머·교대표·좌석 배정을 각각 다른 도구로 챙겨야 했습니다.</p>
        <p>POKA는 구인부터 게임 현황판, 딜러 로테이션, 급여 계산까지 한곳에서 해결하도록 만들고 있습니다. 회원들이 남긴 건의사항으로 계속 고쳐 갑니다.</p>
      </InfoSection>
      <InfoSection title="운영 원칙">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>딜러 일자리·대회 정보·매장 운영과 관계없는 홍보 글은 받지 않습니다.</li>
          <li>허위 공고·임금 체불 신고가 들어오면 확인 후 숨김·이용 제한합니다.</li>
          <li>개인정보는 서비스에 필요한 만큼만 받고, 탈퇴하면 지웁니다.</li>
          <li>만 19세 미만은 이용할 수 없습니다.</li>
        </ul>
      </InfoSection>
      <p className="text-[#d1c7b5]">
        궁금한 점이나 제안은{" "}
        <Link href="/contact" className="font-bold text-[#f3d9a4] underline underline-offset-4">
          문의하기
        </Link>
        에 남겨 주세요.
      </p>
    </InfoPage>
  );
}
