export function kakaoRestApiKey() {
  return process.env.KAKAO_REST_API_KEY?.trim() || null;
}

export function kakaoRedirectUri(requestUrl: string) {
  const fromEnv = process.env.KAKAO_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  return new URL("/api/auth/kakao/callback", requestUrl).toString();
}

export function kakaoAuthorizeUrl(requestUrl: string) {
  const key = kakaoRestApiKey();
  if (!key) return null;
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("redirect_uri", kakaoRedirectUri(requestUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile_nickname");
  return url.toString();
}
