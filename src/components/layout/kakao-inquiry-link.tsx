"use client";

import { KAKAO_INQUIRY_ID, kakaoInquiryHref } from "@/lib/kakao";
import { cn } from "@/lib/utils";

export function KakaoInquiryLink({
  href,
  className,
  children,
}: {
  href?: string | null;
  className?: string;
  children?: string;
}) {
  const target = kakaoInquiryHref(href);
  return (
    <a
      href={target}
      className={cn(
        "relative z-30 inline-flex min-h-11 items-center justify-center rounded-full bg-[#FEE500] px-4 text-sm font-semibold text-[#191919] hover:bg-[#F6DC00]",
        className,
      )}
    >
      {children ?? `카카오톡 1:1 문의 · ${KAKAO_INQUIRY_ID}`}
    </a>
  );
}
