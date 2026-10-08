import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KAKAO_PRODUCTION_REDIRECT } from "./kakao-oauth";

describe("kakao redirect", () => {
  it("points at the pokerwiki callback in production", () => {
    assert.equal(KAKAO_PRODUCTION_REDIRECT, "https://pokerwiki.co.kr/api/auth/kakao/callback");
  });

  it("does not append a trailing slash", () => {
    assert.equal(KAKAO_PRODUCTION_REDIRECT.endsWith("/"), false);
    assert.match(KAKAO_PRODUCTION_REDIRECT, /\/api\/auth\/kakao\/callback$/);
  });
});
