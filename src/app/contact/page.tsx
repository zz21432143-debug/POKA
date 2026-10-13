import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/legal/info-page";
import { KakaoInquiryLink } from "@/components/layout/kakao-inquiry-link";
import { KAKAO_INQUIRY_ID } from "@/lib/kakao";
import { publicContactEmail } from "@/lib/legal-contact";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "문의하기",
  description: "POKA 이용 문의, 광고·제휴 문의, 신고 방법을 안내합니다.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSiteSettings().catch(() => null);
  const email = publicContactEmail(settings?.footerEmail);
  return (
    <InfoPage title="문의하기" lead="이용 문의, 광고·제휴, 신고는 아래 방법으로 연락해 주세요. 확인하는 대로 답변드립니다." current="/contact">
      <InfoSection title="카카오톡 1:1 문의 (가장 빠름)">
        <p>
          카카오톡에서 ID <b className="text-white">{KAKAO_INQUIRY_ID}</b>를 검색해 친구 추가하거나 아래 버튼을 누르세요.
        </p>
        <KakaoInquiryLink href={settings?.kakaoChannelUrl} className="w-full sm:w-fit" />
      </InfoSection>
      <InfoSection title="이메일">
        <a href={`mailto:${email}`} className="w-fit font-bold break-all text-[#f3d9a4] underline underline-offset-4">
          {email}
        </a>
        <p className="text-sm text-[#b7ab97]">닉네임과 문의 내용을 함께 적어 주시면 빠르게 확인할 수 있어요.</p>
      </InfoSection>
      <InfoSection title="매장 · 대회 광고 문의">
        <p>메인 포스터, 왼쪽 배너, 공식 홍보 게시판 등 광고 자리와 가격을 확인하고 바로 신청할 수 있습니다.</p>
        <Link
          href="/advertise"
          className="inline-flex min-h-11 w-fit items-center rounded-full bg-[#c9a25c] px-4 text-sm font-black text-[#1d1611] hover:bg-[#e7c98a]"
        >
          광고 문의하러 가기
        </Link>
      </InfoSection>
      <InfoSection title="신고 · 건의">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>허위 공고·욕설·불법 홍보 글은 글 아래 「신고」 버튼으로 알려 주세요.</li>
          <li>
            기능 제안이나 불편한 점은{" "}
            <Link href="/boards/suggestions" className="font-bold text-[#f3d9a4] underline underline-offset-4">
              건의사항 게시판
            </Link>
            에 남겨 주세요.
          </li>
          <li>개인정보 열람·삭제 요청은 이메일로 보내 주세요.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
