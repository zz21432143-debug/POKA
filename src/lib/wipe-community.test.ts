import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAUNCH_EMPTY_KIND } from "./wipe-community";

describe("launch wipe", () => {
  it("uses a stable audit marker so the wipe runs once", () => {
    assert.equal(LAUNCH_EMPTY_KIND, "LAUNCH_EMPTY_COMMUNITY");
  });
});
