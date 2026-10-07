import { siteUrl } from "@/lib/site";

export function kakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() || null;
}

export function kakaoConfigured() {
  return Boolean(kakaoRestApiKey());
}

export function kakaoRedirectUri(requestUrl?: string) {
  const fromEnv = process.env.KAKAO_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  try {
    return new URL("/api/auth/kakao/callback", `${siteUrl()}/`).toString();
  } catch {
    if (requestUrl) return new URL("/api/auth/kakao/callback", requestUrl).toString();
    return "https://pokerwiki.co.kr/api/auth/kakao/callback";
  }
}

export function kakaoAuthorizeUrl(requestUrl: string, state: string) {
  const key = kakaoRestApiKey();
  if (!key) return null;
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("redirect_uri", kakaoRedirectUri(requestUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile_nickname account_email");
  url.searchParams.set("state", state);
  return url.toString();
}
