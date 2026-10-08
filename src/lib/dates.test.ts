import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRelativeKst, toIsoString } from "./dates";

describe("cached dates", () => {
  it("accepts ISO strings from unstable_cache without throwing", () => {
    const iso = "2026-10-08T19:22:02.958Z";
    assert.equal(toIsoString(iso), iso);
    assert.equal(typeof formatRelativeKst(toIsoString(iso)), "string");
  });

  it("accepts Date objects from a fresh prisma query", () => {
    const date = new Date("2026-10-08T19:22:02.958Z");
    assert.equal(toIsoString(date), date.toISOString());
  });
});
