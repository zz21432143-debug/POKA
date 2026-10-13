import type { Metadata, Viewport } from "next";
import { Black_Han_Sans, Caveat, Dokdo, Noto_Sans_KR } from "next/font/google";
import { SiteShell } from "@/components/layout/site-shell";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { adsensePublisherId, DEFAULT_ADSENSE_CLIENT } from "@/lib/adsense";
import { PWA_APPLE_ICON, PWA_ICON_192, PWA_SHORT_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import {
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  searchEngineVerificationMeta,
} from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { APP_STRIP_BOOT_SCRIPT, PWA_INSTALL_BOOT_SCRIPT } from "@/lib/app-strip";
import "./globals.css";

/** 검색엔진용 사이트 정보(사이트 이름 · 검색창 · 운영 주체) */
function siteJsonLd() {
  const base = siteUrl();
  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: ["포카", "POKA 홀덤 딜러 커뮤니티"],
      url: base,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: base,
      logo: `${base}/icon.png`,
      sameAs: ["https://open.kakao.com/o/gewUD9jc"],
    },
  ]).replace(/</g, "\\u003c");
}

const sans = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const script = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["600"],
});

const display = Black_Han_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const brush = Dokdo({
  variable: "--font-brush",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // canonical은 페이지마다 따로 둡니다. 여기서 "/"를 주면 모든 페이지가 홈으로 합쳐집니다.
  verification: searchEngineVerificationMeta(),
  other: {
    "google-adsense-account": DEFAULT_ADSENSE_CLIENT,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: PWA_SHORT_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: PWA_ICON_192, type: "image/png", sizes: "192x192" }],
    apple: [{ url: PWA_APPLE_ICON, type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const adsense = adsensePublisherId();
  return (
    <html
      lang="ko"
      className={`${sans.variable} ${script.variable} ${display.variable} ${brush.variable} h-full antialiased`}
      // 아래 첫 화면 스크립트가 html에 data-app-strip을 달 수 있어 그 차이는 경고하지 않습니다.
      suppressHydrationWarning
    >
      <head>
        {/* 앱 다운로드 띠를 닫아 둔 경우 첫 화면부터 숨깁니다(나타났다 사라지는 깜빡임 방지). */}
        <script dangerouslySetInnerHTML={{ __html: APP_STRIP_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PWA_INSTALL_BOOT_SCRIPT }} />
        <link rel="icon" type="image/png" href={PWA_ICON_192} />
        {adsense ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd() }} />
        <GoogleAnalytics />
        <PwaRegister />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
