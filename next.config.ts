import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      { source: "/boards/anonymous", destination: "/community", permanent: false },
      { source: "/boards/anonymous/:path*", destination: "/community", permanent: false },
    ];
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  outputFileTracingIncludes: {
    "*": ["./prisma/migrations/**/*"],
  },
  async headers() {
    return [
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
