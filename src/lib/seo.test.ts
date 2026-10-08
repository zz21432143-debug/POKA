import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
    for (const required of ["/", "/boards/free", "/login", "/terms", "/privacy", "/community"]) {
      assert.equal(paths.includes(required), true, required);
    }
    assert.equal(SITEMAP_PATHS[0]?.priority, 1);
  });

  it("omits empty search-engine verification tags", () => {
    assert.equal(SEARCH_ENGINE_VERIFICATION.google, "");
    assert.equal(SEARCH_ENGINE_VERIFICATION.naver, "");
    const meta = searchEngineVerificationMeta();
    if (!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && !process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION) {
      assert.equal("google" in meta, false);
      assert.equal("other" in meta, false);
    }
  });
});
