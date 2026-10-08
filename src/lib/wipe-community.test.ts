import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAUNCH_EMPTY_KIND, LAUNCH_MASTER_NICKNAME, LAUNCH_MASTER_TICKETS } from "./wipe-community";

describe("launch wipe", () => {
  it("uses a stable audit marker so the wipe runs once", () => {
    assert.equal(LAUNCH_EMPTY_KIND, "LAUNCH_EMPTY_COMMUNITY");
    assert.equal(LAUNCH_MASTER_NICKNAME, "포카의봄");
    assert.equal(LAUNCH_MASTER_TICKETS, 10);
  });
});
