import type { Metadata, Viewport } from "next";
import { Caveat, Noto_Sans_KR } from "next/font/google";
import { SiteShell } from "@/components/layout/site-shell";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { adsensePublisherId } from "@/lib/adsense";
import { PWA_APPLE_ICON, PWA_SHORT_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import {
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  searchEngineVerificationMeta,
} from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  verification: searchEngineVerificationMeta(),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
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
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/brand/poka-favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/brand/poka-cloud.svg", type: "image/svg+xml" },
      { url: "/icons/poka-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: PWA_APPLE_ICON, sizes: "180x180" }],
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
      className={`${sans.variable} ${script.variable} h-full antialiased`}
    >
      <head>
        {adsense ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        <PwaRegister />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
