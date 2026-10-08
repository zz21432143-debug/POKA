import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KAKAO_PRODUCTION_REDIRECT, kakaoRedirectUri } from "./kakao-oauth";

describe("kakao redirect", () => {
  it("points at the pokerwiki callback in production", () => {
    assert.equal(KAKAO_PRODUCTION_REDIRECT, "https://pokerwiki.co.kr/api/auth/kakao/callback");
  });

  it("does not append a trailing slash", () => {
    const uri = process.env.KAKAO_REDIRECT_URI?.trim() || kakaoRedirectUri();
    assert.equal(uri.endsWith("/"), false);
    assert.match(uri, /\/api\/auth\/kakao\/callback$/);
  });
});
