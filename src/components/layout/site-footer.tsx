import { PokaLogo } from "@/components/brand/poka-logo";
import { FooterLegalLinks } from "@/components/layout/footer-legal-links";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";
import { LEGAL_SERVICE_NAME } from "@/lib/legal";
import { publicContactEmail } from "@/lib/legal-contact";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
  const settings = await getSiteSettings().catch(() => null);
  const email = publicContactEmail(settings?.footerEmail);
  const kakao = settings?.kakaoChannelUrl?.trim() || KAKAO_OPEN_CHAT_URL;

  return (
    <footer className="mt-auto border-t border-border bg-white pb-[max(5.5rem,calc(4.25rem+env(safe-area-inset-bottom)))] lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-3 py-6 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1 text-sm leading-6 text-muted-foreground">
            <div className="flex items-center gap-3">
              <PokaLogo compact />
              <p className="font-semibold text-foreground">서비스명: {LEGAL_SERVICE_NAME}</p>
            </div>
            <p>홀덤·딜러 커뮤니티 · 만 19세 이상</p>
            <a href={`mailto:${email}`} className="break-all hover:text-foreground">
              문의 이메일: {email}
            </a>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {kakao ? (
              <a
                href={kakao}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-[#FEE500] px-4 text-sm font-semibold text-[#191919] hover:bg-[#F6DC00]"
              >
                카카오톡 1:1 문의
              </a>
            ) : null}
            <FooterLegalLinks />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Copyright © {LEGAL_SERVICE_NAME}. All rights reserved.</p>
      </div>
    </footer>
  );
}
