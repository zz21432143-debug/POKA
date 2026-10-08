import { SITE_HOST, siteUrl } from "@/lib/site";

export const KAKAO_CALLBACK_PATH = "/api/auth/kakao/callback";
export const KAKAO_PRODUCTION_REDIRECT = `https://${SITE_HOST}${KAKAO_CALLBACK_PATH}`;

export function kakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() || null;
}

export function kakaoConfigured() {
  return Boolean(kakaoRestApiKey());
}

/** 콘솔에 등록한 운영 콜백만 씁니다. 미리보기·로컬 호스트는 KOE205가 납니다. */
export function kakaoRedirectUri() {
  return KAKAO_PRODUCTION_REDIRECT;
}

export function kakaoAuthorizeUrl(state: string) {
  const key = kakaoRestApiKey();
  if (!key) return null;
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("redirect_uri", kakaoRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export function kakaoSiteDomain() {
  return siteUrl();
}
