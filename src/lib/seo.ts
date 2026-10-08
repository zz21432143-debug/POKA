import { siteUrl } from "@/lib/site";

/** 검색·SNS에 쓰는 기본 제목. 페이지별 title이 없으면 이 값이 나갑니다. */
export const SITE_TITLE = "POKA - 홀덤·딜러 커뮤니티";

export const SITE_DESCRIPTION =
  "홀덤 플레이어와 딜러를 위한 커뮤니티. 핸드리뷰, 딜러 구인·구직, 대회 일정, 현장 스케치, 건의사항.";

export const SITE_NAME = "POKA";

/** Open Graph 대표 이미지. `src/app/opengraph-image.tsx`가 1200×630 PNG를 만듭니다. */
export const OG_IMAGE_PATH = "/opengraph-image";

/**
 * 검색엔진 소유확인 메타태그.
 *
 * 구글 서치 콘솔: HTML 태그 방식의 content 값만 넣습니다.
 *   <meta name="google-site-verification" content="여기" />
 *
 * 네이버 서치어드바이저: HTML 메타태그 방식의 content 값만 넣습니다.
 *   <meta name="naver-site-verification" content="여기" />
 *
 * 코드에 직접 넣거나, Vercel/로컬 환경변수로 덮어쓸 수 있습니다.
 * 비워 두면 <head>에 해당 메타를 출력하지 않습니다.
 */
export const SEARCH_ENGINE_VERIFICATION = {
  google: "",
  naver: "",
} as const;

function pickCode(envName: string, fallback: string) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  return fallback.trim();
}

export function googleSiteVerification() {
  return pickCode("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", SEARCH_ENGINE_VERIFICATION.google);
}

export function naverSiteVerification() {
  return pickCode("NEXT_PUBLIC_NAVER_SITE_VERIFICATION", SEARCH_ENGINE_VERIFICATION.naver);
}

export function searchEngineVerificationMeta() {
  const google = googleSiteVerification();
  const naver = naverSiteVerification();
  const other: Record<string, string> = {};
  if (naver) other["naver-site-verification"] = naver;
  return {
    ...(google ? { google } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

export const SITEMAP_PATHS = [
  { path: "/", changeFrequency: "hourly" as const, priority: 1 },
  { path: "/community", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/info", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/boards/free", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/boards/sketch", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/jobs", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/boards/jobs/fixed", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/jobs/apply", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/jobs/team", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/jobs/urgent", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/jobs/seek", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/rules", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/boards/hand-review", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/boards/suggestions", changeFrequency: "daily" as const, priority: 0.5 },
  { path: "/attendance", changeFrequency: "daily" as const, priority: 0.6 },
  { path: "/practice", changeFrequency: "weekly" as const, priority: 0.6 },
  { path: "/boards/schedule", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/boards/official", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/notices", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/shop", changeFrequency: "weekly" as const, priority: 0.4 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/about", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/advertise", changeFrequency: "monthly" as const, priority: 0.4 },
] as const;

export function sitemapEntries() {
  const base = siteUrl();
  return SITEMAP_PATHS.map((row) => ({
    url: `${base}${row.path}`,
    changeFrequency: row.changeFrequency,
    priority: row.priority,
  }));
}
