import { PokaLogo } from "@/components/brand/poka-logo";
import { FooterLegalLinks } from "@/components/layout/footer-legal-links";
import { KakaoInquiryLink } from "@/components/layout/kakao-inquiry-link";
import { KAKAO_INQUIRY_ID } from "@/lib/kakao";
import { LEGAL_SERVICE_NAME } from "@/lib/legal";
import { publicContactEmail } from "@/lib/legal-contact";
import { DEFAULT_SITE_SETTINGS, getSiteSettings, type PublicSiteSettings } from "@/lib/site-settings";

function FooterFrame({ settings }: { settings: PublicSiteSettings }) {
  const email = publicContactEmail(settings.footerEmail);

  return (
    <footer className="footer-on-felt relative z-20 mt-auto pb-[max(6.25rem,calc(5rem+env(safe-area-inset-bottom)))] lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="wood-rail h-2 w-full" aria-hidden />
      <div>
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-6 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <div className="flex min-w-0 flex-col gap-1 text-sm leading-6 text-muted-foreground">
            <div className="flex items-center gap-3">
              <PokaLogo compact />
              <p className="font-semibold text-foreground">서비스명: {LEGAL_SERVICE_NAME}</p>
            </div>
            <p>홀덤·딜러 커뮤니티 · 만 19세 이상</p>
            <a href={`mailto:${email}`} className="break-all hover:text-foreground">
              문의 이메일: {email}
            </a>
            <p className="text-foreground">
              문의 카카오톡 ID: <span className="font-semibold">{KAKAO_INQUIRY_ID}</span>
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <KakaoInquiryLink href={settings.kakaoChannelUrl} className="w-full sm:w-auto" />
            <p className="text-xs leading-5 text-muted-foreground sm:text-right">
              버튼이 앱을 열지 않으면 카카오톡에서 {KAKAO_INQUIRY_ID}를 검색해 친구 추가하세요.
            </p>
            <FooterLegalLinks />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Copyright © {LEGAL_SERVICE_NAME}. All rights reserved.</p>
      </div>
      </div>
    </footer>
  );
}

export function SiteFooterFallback() {
  return <FooterFrame settings={DEFAULT_SITE_SETTINGS} />;
}

export async function SiteFooter() {
  const settings = await getSiteSettings().catch(() => DEFAULT_SITE_SETTINGS);
  return <FooterFrame settings={settings} />;
}
