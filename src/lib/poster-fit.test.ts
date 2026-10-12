import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitRects } from "./poster-fit";

describe("promo poster fit", () => {
  it("keeps a wide photo whole, centered, with a blurred fill", () => {
    const { background, image } = fitRects(1600, 900);
    assert.ok(background);
    assert.equal(image.w, 1000);
    assert.equal(Math.round(image.h), 563);
    assert.equal(Math.round(image.y), 419);
    assert.equal(image.x, 0);
  });

  it("keeps a tall phone photo whole", () => {
    const { background, image } = fitRects(1080, 2340);
    assert.ok(background);
    assert.equal(image.h, 1400);
    assert.ok(image.x > 0);
  });

  it("fills edge to edge when already about 5:7", () => {
    const { background, image } = fitRects(2000, 2800);
    assert.equal(background, null);
    assert.equal(image.w, 1000);
    assert.equal(image.h, 1400);
    assert.equal(fitRects(1240, 1754).background, null); // A4 세로(약 1:1.414)
  });
});
