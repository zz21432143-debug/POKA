import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWriteBoard, writeDeniedMessage } from "./permissions";

const admin = { isAdmin: true, memberKind: "INDIVIDUAL" as const };
const member = { isAdmin: false, memberKind: "INDIVIDUAL" as const, isDealerVerified: true };

describe("board write roles", () => {
  it("lets members write community boards but not promo or schedule", () => {
    assert.equal(canWriteBoard(member, "FREE"), true);
    assert.equal(canWriteBoard(member, "JOBS"), true);
    assert.equal(canWriteBoard(member, "HAND_REVIEW"), true);
    assert.equal(canWriteBoard(member, "ANONYMOUS_REVIEW"), true);
    assert.equal(canWriteBoard(member, "PROMO"), false);
    assert.equal(canWriteBoard(member, "SCHEDULE"), false);
    assert.match(writeDeniedMessage("PROMO"), /관리자만/);
  });

  it("lets admin write promo and schedule", () => {
    assert.equal(canWriteBoard(admin, "PROMO"), true);
    assert.equal(canWriteBoard(admin, "SCHEDULE"), true);
  });

  it("blocks guests from every board", () => {
    assert.equal(canWriteBoard(null, "FREE"), false);
    assert.equal(canWriteBoard(null, "PROMO"), false);
  });
});
