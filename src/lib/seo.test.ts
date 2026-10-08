import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ROBOTS_DISALLOW,
  SEARCH_ENGINE_VERIFICATION,
  SITE_TITLE,
  SITEMAP_PATHS,
  searchEngineVerificationMeta,
} from "./seo";

describe("seo defaults", () => {
  it("uses the POKA community title", () => {
    assert.equal(SITE_TITLE, "POKA - 홀덤·딜러 커뮤니티");
  });

  it("lists home, boards, login, and terms in the sitemap", () => {
    const paths = SITEMAP_PATHS.map((row) => row.path);
    for (const required of ["/", "/boards/free", "/login", "/terms", "/privacy", "/youth", "/community"]) {
      assert.equal(paths.includes(required), true, required);
    }
    assert.equal(SITEMAP_PATHS[0]?.priority, 1);
  });

  it("blocks admin and account paths from crawlers", () => {
    for (const path of ["/admin", "/api/", "/account", "/me", "/notifications", "/welcome"]) {
      assert.equal(ROBOTS_DISALLOW.includes(path), true, path);
    }
  });

  it("omits empty search-engine verification tags", () => {
    assert.equal(SEARCH_ENGINE_VERIFICATION.google, "k3_-x7A_mpsqW1POyxM0iboyfXeOPKmZ449IQrebWBc");
    assert.equal(SEARCH_ENGINE_VERIFICATION.naver, "07d34f783c35ccad774a768783ab4c414c758027");
    const meta = searchEngineVerificationMeta();
    if (!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
      assert.equal(meta.google, SEARCH_ENGINE_VERIFICATION.google);
    }
    if (!process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION) {
      assert.equal(meta.other?.["naver-site-verification"], SEARCH_ENGINE_VERIFICATION.naver);
    }
  });
});
