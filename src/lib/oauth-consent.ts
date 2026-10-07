import { readSessionValue, signSessionValue } from "@/lib/session";

export const CONSENT_COOKIE = "poka_oauth_consent";
export const OAUTH_NEXT_COOKIE = "poka_oauth_next";
export const GOOGLE_STATE_COOKIE = "poka_google_state";

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

export function safeNextPath(raw: string | undefined | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return "/";
  return raw;
}

export const CONSENT_COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 20,
};
