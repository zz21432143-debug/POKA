import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWriteBoard, writeDeniedMessage } from "./permissions";

const official = { isAdmin: true, isMaster: true, nickname: "POKA", memberKind: "INDIVIDUAL" as const };
const otherMaster = { isAdmin: true, isMaster: true, nickname: "홀덤마스터", memberKind: "INDIVIDUAL" as const };
const fakePoka = { isAdmin: false, isMaster: false, nickname: "POKA", memberKind: "INDIVIDUAL" as const };
const admin = { isAdmin: true, isMaster: false, memberKind: "INDIVIDUAL" as const };
const member = { isAdmin: false, memberKind: "INDIVIDUAL" as const, isDealerVerified: true };

describe("board write roles", () => {
  it("lets members write community boards regardless of level", () => {
    assert.equal(canWriteBoard(member, "FREE"), true);
    assert.equal(canWriteBoard(member, "JOBS"), true);
    assert.equal(canWriteBoard(member, "HAND_REVIEW"), true);
    assert.equal(canWriteBoard(member, "SUGGESTION"), true);
    assert.equal(canWriteBoard(member, "ANONYMOUS_REVIEW"), false);
    assert.equal(canWriteBoard(member, "TALENT"), false);
    assert.equal(canWriteBoard(member, "PICKUP"), false);
    assert.equal(canWriteBoard(member, "PROMO"), false);
    assert.equal(canWriteBoard(member, "SCHEDULE"), false);
    assert.equal(canWriteBoard(member, "NOTICE"), false);
    assert.match(writeDeniedMessage("PROMO"), /POKA 공식 계정/);
  });

  it("lets only the POKA master account write promo, schedule, and notices", () => {
    for (const board of ["PROMO", "SCHEDULE", "NOTICE"] as const) {
      assert.equal(canWriteBoard(official, board), true, `official ${board}`);
      assert.equal(canWriteBoard(otherMaster, board), false, `other master ${board}`);
      assert.equal(canWriteBoard(fakePoka, board), false, `non-master POKA ${board}`);
      assert.equal(canWriteBoard(admin, board), false, `admin ${board}`);
    }
    assert.equal(canWriteBoard(official, "FREE"), true);
    assert.equal(canWriteBoard(otherMaster, "FREE"), true);
  });

  it("blocks guests from every board", () => {
    assert.equal(canWriteBoard(null, "FREE"), false);
    assert.equal(canWriteBoard(null, "PROMO"), false);
  });
});
