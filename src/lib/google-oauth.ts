import { siteUrl } from "@/lib/site";

export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || null;
}

export function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || null;
}

export function googleConfigured() {
  return Boolean(googleClientId() && googleClientSecret());
}

export function googleRedirectUri(requestUrl?: string) {
  const fromEnv = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  try {
    return new URL("/api/auth/google/callback", `${siteUrl()}/`).toString();
  } catch {
    if (requestUrl) return new URL("/api/auth/google/callback", requestUrl).toString();
    return "https://pokerwiki.co.kr/api/auth/google/callback";
  }
}

export function googleAuthorizeUrl(requestUrl: string, state: string) {
  const id = googleClientId();
  if (!id) return null;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", googleRedirectUri(requestUrl));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}
