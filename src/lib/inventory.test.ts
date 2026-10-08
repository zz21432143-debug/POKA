import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adsensePublisherId } from "./adsense";
import { isDirectFilled, normalizeMark, pickFill, type DirectCreative } from "./inventory-policy";

const sample: DirectCreative = {
  placement: "SIDEBAR",
  imageUrl: "/ads/sidebar.png",
  href: "/posts/1",
  title: "뉴스톤 토너먼트",
  advertiser: "뉴스톤",
  mark: "제휴",
};

describe("ad inventory fill", () => {
  it("tags paid creatives as AD and the rest as 제휴", () => {
    assert.equal(normalizeMark("토너먼트", true), "AD");
    assert.equal(normalizeMark("제휴", false), "제휴");
    assert.equal(normalizeMark("AD", false), "AD");
  });

  it("prefers a direct sponsor over AdSense or CTA", () => {
    assert.equal(pickFill(sample, "adsense", true).kind, "direct");
    assert.equal(pickFill(sample, "cta", true).kind, "direct");
  });

  it("falls back to AdSense only when the exclusive slot is empty", () => {
    assert.equal(pickFill(null, "adsense", true).kind, "adsense");
    assert.equal(pickFill({ ...sample, imageUrl: null }, "adsense", true).kind, "adsense");
  });

  it("uses a CTA on unpaid exclusive inventory instead of Google", () => {
    assert.equal(pickFill(null, "cta", true).kind, "cta");
    assert.ok(!isDirectFilled({ enabled: true, imageUrl: null, title: "" }, true));
  });

  it("fills empty A1–A3 feed slots with AdSense", () => {
    const emptyA: DirectCreative = {
      placement: "A1",
      imageUrl: null,
      href: "/advertise",
      title: "",
      advertiser: "",
      mark: "AD",
    };
    assert.equal(pickFill(emptyA, "adsense", true).kind, "adsense");
  });

  it("hides native rows without a title", () => {
    assert.equal(pickFill({ ...sample, placement: "NATIVE", imageUrl: null, title: "" }, "hide").kind, "hide");
    assert.equal(pickFill({ ...sample, placement: "NATIVE", imageUrl: null }, "hide").kind, "direct");
  });
});

describe("adsense publisher", () => {
  it("uses the POKA ca-pub id by default", () => {
    const previous = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    assert.equal(adsensePublisherId(), "ca-pub-9633875249094546");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = previous;
  });
});
