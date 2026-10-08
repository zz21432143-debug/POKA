import { SITE_HOST, siteUrl } from "@/lib/site";

export const KAKAO_CALLBACK_PATH = "/api/auth/kakao/callback";
export const KAKAO_PRODUCTION_REDIRECT = `https://${SITE_HOST}${KAKAO_CALLBACK_PATH}`;

export function kakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() || null;
}

export function kakaoConfigured() {
  return Boolean(kakaoRestApiKey());
}

/** 운영은 콘솔에 등록한 pokerwiki 콜백만 씁니다. 환경변수·미리보기 주소로 바꾸지 않습니다. */
export function kakaoRedirectUri() {
  if (process.env.NODE_ENV === "development") {
    const fromEnv = process.env.KAKAO_REDIRECT_URI?.trim().replace(/\/$/, "");
    return fromEnv || `http://127.0.0.1:43123${KAKAO_CALLBACK_PATH}`;
  }
  return KAKAO_PRODUCTION_REDIRECT;
}

export function kakaoAuthorizeUrl(state: string) {
  const key = kakaoRestApiKey();
  if (!key) return null;
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("redirect_uri", kakaoRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile_nickname");
  url.searchParams.set("state", state);
  return url.toString();
}

export function kakaoSiteDomain() {
  return siteUrl();
}
