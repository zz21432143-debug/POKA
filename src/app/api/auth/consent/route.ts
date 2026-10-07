import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_OPTS,
  OAUTH_NEXT_COOKIE,
  packOauthConsent,
  safeNextPath,
} from "@/lib/oauth-consent";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    adult?: boolean;
    terms?: boolean;
    privacy?: boolean;
    next?: string;
  };
  if (!body.adult || !body.terms || !body.privacy) {
    return NextResponse.json(
      { error: "만 19세 확인, 이용약관, 개인정보 수집·이용에 모두 동의해 주세요." },
      { status: 400 },
    );
  }
  const jar = await cookies();
  jar.set(CONSENT_COOKIE, packOauthConsent(), CONSENT_COOKIE_OPTS);
  jar.set(OAUTH_NEXT_COOKIE, safeNextPath(body.next), CONSENT_COOKIE_OPTS);
  return NextResponse.json({ ok: true });
}
