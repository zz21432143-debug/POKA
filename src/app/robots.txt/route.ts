import { ROBOTS_DISALLOW } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

/** 다음(Daum) 웹마스터도구 사이트 확인 코드. robots.txt 맨 위 주석 한 줄로 확인합니다. */
const DAUM_WEBMASTER =
  "#DaumWebMasterTool:00cb58f3a2166ca3cc31cf1edc80286af9f28b5492aae72e8a7e52a678d4171d:98GztZ5EvdKnUPTh2E62HA==";

/**
 * robots.txt. Next의 robots.ts는 주석 줄을 못 넣어서 직접 씁니다.
 * 애드센스·광고 로봇은 전부 허용, 그 밖은 관리·계정 경로만 막습니다.
 */
export function GET() {
  const base = siteUrl();
  const body = [
    DAUM_WEBMASTER,
    "",
    "User-Agent: Mediapartners-Google",
    "Allow: /",
    "",
    "User-Agent: AdsBot-Google",
    "Allow: /",
    "",
    "User-Agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Host: ${base}`,
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
