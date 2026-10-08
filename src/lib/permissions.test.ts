import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWriteBoard, writeDeniedMessage } from "./permissions";

const master = { isAdmin: true, isMaster: true, memberKind: "INDIVIDUAL" as const };
const admin = { isAdmin: true, isMaster: false, memberKind: "INDIVIDUAL" as const };
const member = { isAdmin: false, memberKind: "INDIVIDUAL" as const, isDealerVerified: true };

describe("board write roles", () => {
  it("lets members write community boards regardless of level", () => {
    assert.equal(canWriteBoard(member, "FREE"), true);
    assert.equal(canWriteBoard(member, "JOBS"), true);
    assert.equal(canWriteBoard(member, "HAND_REVIEW"), true);
    assert.equal(canWriteBoard(member, "ANONYMOUS_REVIEW"), false);
    assert.equal(canWriteBoard(member, "TALENT"), false);
    assert.equal(canWriteBoard(member, "PICKUP"), false);
    assert.equal(canWriteBoard(member, "PROMO"), false);
    assert.equal(canWriteBoard(member, "SCHEDULE"), false);
    assert.equal(canWriteBoard(member, "NOTICE"), false);
    assert.match(writeDeniedMessage("PROMO"), /마스터/);
  });

  it("lets only the master write promo, schedule, and notices", () => {
    assert.equal(canWriteBoard(admin, "PROMO"), false);
    assert.equal(canWriteBoard(admin, "SCHEDULE"), false);
    assert.equal(canWriteBoard(admin, "NOTICE"), false);
    assert.equal(canWriteBoard(master, "PROMO"), true);
    assert.equal(canWriteBoard(master, "SCHEDULE"), true);
    assert.equal(canWriteBoard(master, "NOTICE"), true);
    assert.equal(canWriteBoard(master, "FREE"), true);
  });

  it("blocks guests from every board", () => {
    assert.equal(canWriteBoard(null, "FREE"), false);
    assert.equal(canWriteBoard(null, "PROMO"), false);
  });
});
