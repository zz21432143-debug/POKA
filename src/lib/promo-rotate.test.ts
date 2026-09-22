import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOME_PROMO_MAX_POOL,
  HOME_PROMO_ROTATE_MS,
  HOME_PROMO_SLIDE_MS,
  HOME_PROMO_VISIBLE,
  buildLoopTrack,
  carouselCloneCount,
  loopTrackStartIndex,
  shiftCarouselIndex,
  snapLoopIndex,
  wrapIndex,
} from "./promo-rotate";

describe("home promo carousel", () => {
  it("keeps 3 visible, pool cap 9, 3s step, ~650ms slide", () => {
    assert.equal(HOME_PROMO_VISIBLE, 3);
    assert.equal(HOME_PROMO_MAX_POOL, 9);
    assert.equal(HOME_PROMO_ROTATE_MS, 3000);
    assert.equal(HOME_PROMO_SLIDE_MS, 650);
  });

  it("wraps indexes in both directions", () => {
    assert.equal(wrapIndex(0, 5), 0);
    assert.equal(wrapIndex(5, 5), 0);
    assert.equal(wrapIndex(-1, 5), 4);
    assert.equal(shiftCarouselIndex(0, 1, 5), 1);
    assert.equal(shiftCarouselIndex(4, 1, 5), 0);
    assert.equal(shiftCarouselIndex(0, -1, 5), 4);
  });

  it("builds a cloned-edge track so the last card can slide into the first", () => {
    const items = ["a", "b", "c", "d"];
    const clones = carouselCloneCount(items.length);
    assert.equal(clones, 3);
    assert.deepEqual(buildLoopTrack(items, clones), ["b", "c", "d", "a", "b", "c", "d", "a", "b", "c"]);
    assert.equal(loopTrackStartIndex(clones), 3);
  });

  it("snaps from clone slides back onto the matching real slide", () => {
    const length = 4;
    const clones = 3;
    const start = loopTrackStartIndex(clones);
    const end = start + length;
    assert.equal(snapLoopIndex(end, length, clones), start);
    assert.equal(snapLoopIndex(start - 1, length, clones), end - 1);
    assert.equal(snapLoopIndex(start, length, clones), null);
  });

  it("does not clone a single-card pool", () => {
    assert.equal(carouselCloneCount(1), 0);
    assert.deepEqual(buildLoopTrack(["only"], 0), ["only"]);
    assert.equal(snapLoopIndex(0, 1, 0), null);
  });
});
