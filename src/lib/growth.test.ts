import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildJobTitle } from "./jobs";
import {
  HoldemOnlyError,
  assertHoldemOnly,
  holdemOnlyViolation,
  normalizeHandTitle,
  normalizeReviewTitle,
} from "./holdem-only";
import { DEALER_CREW_NICKNAMES, weeklyHubContent, weeklyHubTitle } from "./growth";
import { GUIDE_ARTICLES, getGuideArticle } from "./info-pages";
import { catalogPosts } from "./seed-catalog";

describe("holdem-only", () => {
  it("rejects baccarat and casino-dealer copy", () => {
    assert.ok(holdemOnlyViolation("바카라 딜러 구인"));
    assert.ok(holdemOnlyViolation("카지노 딜러 이직"));
    assert.equal(holdemOnlyViolation("서울 강남 홀덤펍 딜러 구인"), null);
    assert.throws(() => assertHoldemOnly("블랙잭 후기"), HoldemOnlyError);
  });

  it("prefixes hand and store-review titles", () => {
    assert.equal(normalizeHandTitle("BTN vs BB"), "홀덤 핸드리뷰 | BTN vs BB");
    assert.equal(normalizeHandTitle("홀덤 핸드리뷰 | 이미 있음"), "홀덤 핸드리뷰 | 이미 있음");
    assert.equal(normalizeReviewTitle("강남 분위기", true), "강남 분위기 · 홀덤펍 후기");
    assert.equal(normalizeReviewTitle("잡담입니다", false), "잡담입니다");
  });
});

describe("job seo titles", () => {
  it("puts region and holdem in the title", () => {
    assert.equal(
      buildJobTitle("FIXED", { location: "서울 강남", companyName: "펠트하우스" }),
      "[서울 강남] 홀덤펍 딜러 구인 · 펠트하우스",
    );
    assert.match(buildJobTitle("APPLY", { location: "부산 서면", payAmount: "20000" }), /홀덤 스팟 딜러 구인/);
    assert.match(buildJobTitle("URGENT", { location: "수원", workDate: "즉시" }), /홀덤펍 급구/);
  });
});

describe("weekly hub and kakao lines", () => {
  it("builds a dated hub title", () => {
    assert.equal(weeklyHubTitle("2026-09-21"), "이번 주 홀덤 대회 일정 (2026.09.21–2026.09.27)");
  });

  it("lists holdem events and skips nested hubs", () => {
    const body = weeklyHubContent([
      { title: "이번 주 홀덤 대회 일정 (x)", eventDate: "2026-09-21" },
      { title: "서울 홀덤 위클리", eventDate: "2026-09-22", promoLocation: "서울 강남" },
    ]);
    assert.match(body, /서울 홀덤 위클리/);
    assert.equal(body.includes("이번 주 홀덤 대회 일정 (x)"), false);
  });
});

describe("evergreen guides and crew", () => {
  it("has ten indexed holdem guides", () => {
    assert.equal(GUIDE_ARTICLES.length, 10);
    assert.ok(getGuideArticle("hand-rankings"));
    assert.equal(getGuideArticle("missing"), null);
    for (const row of GUIDE_ARTICLES) {
      assert.equal(/바카라/.test(row.body), false, row.slug);
    }
  });

  it("keeps a ten-dealer crew", () => {
    assert.equal(DEALER_CREW_NICKNAMES.length, 10);
  });

  it("seeds holdem-only catalog titles", () => {
    const catalog = catalogPosts("2026-09-22");
    assert.match(catalog["hand-review"][0].title, /오늘의 홀덤 핸드리뷰/);
    assert.match(catalog.anonymous[0].title, /홀덤펍 후기/);
    assert.match(catalog["jobs/fixed"][0].title, /홀덤펍 딜러 구인/);
    const blob = JSON.stringify(catalog);
    assert.equal(/바카라/.test(blob), false);
  });
});
