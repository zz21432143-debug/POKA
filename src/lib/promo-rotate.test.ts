import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOME_PROMO_MAX_POOL,
  HOME_PROMO_ROTATE_MS,
  HOME_PROMO_VISIBLE,
  nextRotateSlot,
  pickReplacement,
  type HomePromo,
} from "./promo-rotate";

function promo(key: string): HomePromo {
  return { key, href: `/posts/${key}`, title: key, image: `/${key}.jpg` };
}

describe("home promo rotation", () => {
  it("keeps 3 visible, pool cap 9, 6s step", () => {
    assert.equal(HOME_PROMO_VISIBLE, 3);
    assert.equal(HOME_PROMO_MAX_POOL, 9);
    assert.equal(HOME_PROMO_ROTATE_MS, 6000);
  });

  it("advances one slot at a time", () => {
    assert.equal(nextRotateSlot(0), 1);
    assert.equal(nextRotateSlot(1), 2);
    assert.equal(nextRotateSlot(2), 0);
  });

  it("replaces only from posters not currently shown", () => {
    const pool = ["a", "b", "c", "d", "e"].map(promo);
    const visible = pool.slice(0, 3);
    const next = pickReplacement(visible, pool, 0, () => 0);
    assert.ok(next);
    assert.equal(next.key, "d");
    assert.equal(visible.some((item) => item.key === next.key), false);
  });

  it("does not rotate when the pool fits in 3 slots", () => {
    const pool = ["a", "b", "c"].map(promo);
    assert.equal(pickReplacement(pool, pool, 1), null);
  });
});
