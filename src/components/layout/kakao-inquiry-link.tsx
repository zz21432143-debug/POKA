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
        "relative z-30 inline-flex min-h-11 items-center justify-center rounded-full bg-[#c59b27] px-4 text-sm font-semibold text-[#1c1408] hover:bg-[#b38c22]",
        className,
      )}
    >
      {children ?? `카카오톡 1:1 문의 · ${KAKAO_INQUIRY_ID}`}
    </a>
  );
}
