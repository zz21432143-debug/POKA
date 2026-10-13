import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 배포 번호: 오래 켜 둔 화면(현황판 TV 등)이 새 배포를 알아채고 새로고침하는 데 씁니다.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
  compress: true,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["127.0.0.1", "pokerwiki.co.kr", "www.pokerwiki.co.kr"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pokerwiki.co.kr" }],
        destination: "https://pokerwiki.co.kr/:path*",
        permanent: true,
      },
      // 종료·통합된 주소. 페이지 파일 없이 여기서만 관리합니다.
      { source: "/boards/anonymous", destination: "/community", permanent: true },
      { source: "/boards/anonymous/:path*", destination: "/community", permanent: true },
      { source: "/boards/store-review/:path*", destination: "/community", permanent: true },
      { source: "/intro", destination: "/about", permanent: true },
      { source: "/plan", destination: "/about", permanent: true },
      { source: "/schema", destination: "/", permanent: true },
      { source: "/issues", destination: "/boards/free", permanent: true },
      { source: "/codex", destination: "/shop", permanent: true },
      { source: "/practice", destination: "/", permanent: true },
      { source: "/practice/:path*", destination: "/", permanent: true },
      { source: "/boards/jobs/seek", destination: "/boards/jobs", permanent: true },
      { source: "/boards/jobs/seek/:path*", destination: "/boards/jobs", permanent: true },
      { source: "/notifications", destination: "/", permanent: false },
    ];
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  outputFileTracingIncludes: {
    "*": ["./prisma/migrations/**/*"],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
