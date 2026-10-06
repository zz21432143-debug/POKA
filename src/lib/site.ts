export const SITE_HOST = "pokerwiki.co.kr";

export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:43123";
  return `https://${SITE_HOST}`;
}
