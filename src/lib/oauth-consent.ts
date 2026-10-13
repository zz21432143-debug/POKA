import { readSessionValue, signSessionValue } from "@/lib/session";

export const CONSENT_COOKIE = "poka_oauth_consent";
export const OAUTH_NEXT_COOKIE = "poka_oauth_next";
export const OAUTH_INTENT_COOKIE = "poka_oauth_intent";
export const GOOGLE_STATE_COOKIE = "poka_google_state";

export type OauthIntent = "login" | "signup";

export function parseOauthIntent(raw: string | undefined | null): OauthIntent {
  return raw === "signup" ? "signup" : "login";
}

const CONSENT_TTL_MS = 20 * 60 * 1000;

export function packOauthConsent() {
  return signSessionValue(`1.${Date.now()}`);
}

export function consentIsValid(raw: string | undefined | null) {
  const value = readSessionValue(raw);
  if (!value?.startsWith("1.")) return false;
  const issued = Number(value.slice(2));
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued <= CONSENT_TTL_MS;
}

/** 사이트 안 경로인지(다른 사이트로 나가는 "//host", "/\host", 탭·줄바꿈 섞인 주소는 막음) */
export function isInternalPath(raw: string | undefined | null): raw is string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return false;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return false;
  try {
    return new URL(raw, "https://pokerwiki.co.kr").origin === "https://pokerwiki.co.kr";
  } catch {
    return false;
  }
}

export function safeNextPath(raw: string | undefined | null) {
  return isInternalPath(raw) ? raw : "/";
}

export const CONSENT_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 20,
};
