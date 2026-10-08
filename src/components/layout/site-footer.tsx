import { PokaLogo } from "@/components/brand/poka-logo";
import { FooterLegalLinks } from "@/components/layout/footer-legal-links";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
  const settings = await getSiteSettings().catch(() => null);
  const email = settings?.footerEmail || "contact@pokerwiki.co.kr";
  const kakao = settings?.kakaoChannelUrl?.trim() || KAKAO_OPEN_CHAT_URL;

  return (
    <footer className="mt-auto border-t border-border bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-3">
            <PokaLogo compact />
            <p className="text-sm font-semibold text-foreground">POKA</p>
          </div>
          <p className="text-sm text-muted-foreground">홀덤·딜러 커뮤니티 · 만 19세 이상</p>
          <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-foreground">
            운영 문의 {email}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {kakao ? (
            <a
              href={kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full bg-[#FEE500] px-3 text-sm font-semibold text-[#191919] hover:bg-[#F6DC00]"
            >
              카카오톡 1:1 문의
            </a>
          ) : null}
          <FooterLegalLinks />
        </div>
      </div>
    </footer>
  );
}
