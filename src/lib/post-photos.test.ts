import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boardAllowsPhotos, parsePostPhotos } from "./post-photos";

describe("post photos", () => {
  it("allows member boards and blocks job boards", () => {
    assert.equal(boardAllowsPhotos("FREE"), true);
    assert.equal(boardAllowsPhotos("SKETCH"), true);
    assert.equal(boardAllowsPhotos("JOBS"), false);
    assert.equal(boardAllowsPhotos("PROMO"), false);
    assert.equal(boardAllowsPhotos(null), false);
  });

  it("keeps only uploaded image urls, unique, at most five", () => {
    assert.deepEqual(parsePostPhotos("x"), []);
    assert.deepEqual(
      parsePostPhotos(["/api/images/a1", "https://evil.example/x.png", "/api/images/a1", 3, " /api/images/b2 "]),
      ["/api/images/a1", "/api/images/b2"],
    );
    const many = Array.from({ length: 8 }, (_, i) => `/api/images/p${i}`);
    assert.equal(parsePostPhotos(many).length, 5);
  });
});
