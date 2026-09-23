import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Caveat, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import { SiteShell } from "@/components/layout/site-shell";
import { adsensePublisherId } from "@/lib/adsense";
import "./globals.css";

const sans = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const script = Caveat({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "POKA — 홀덤·딜러 커뮤니티",
  description: "홀덤 핸드리뷰, 딜러 구인, 대회 일정, 홀덤펍 후기.",
  icons: { icon: "/brand/poka-mark.svg", apple: "/brand/poka-mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f7f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const adsense = adsensePublisherId();
  return (
    <html
      lang="ko"
      className={`${sans.variable} ${geistMono.variable} ${script.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {adsense ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
