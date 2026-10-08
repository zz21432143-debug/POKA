import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenWord } from "./forbidden-words";
import { POST_COOLDOWN_MS } from "./security";
import { gaMeasurementId } from "./ga";
import { flagsFromRole, isStaff, roleFromFlags } from "./roles";
import { SANCTION_BUTTONS, untilFor } from "./sanctions";

describe("forbidden words", () => {
  it("blocks a listed keyword and names it in the match", () => {
    assert.equal(findForbiddenWord("카톡 말고 텔레그램으로 주세요", ["텔레그램", "첫충"]), "텔레그램");
    assert.equal(findForbiddenWord("첫충 이벤트", ["첫충"]), "첫충");
    assert.equal(findForbiddenWord("평범한 핸드리뷰", ["텔레그램", "꽁머니"]), null);
  });
});

describe("write cooldown", () => {
  it("uses a 5 second window for posts", () => {
    assert.equal(POST_COOLDOWN_MS, 5_000);
  });
});

describe("staff roles", () => {
  it("treats master and admin as staff", () => {
    assert.equal(isStaff({ isMaster: true }), true);
    assert.equal(isStaff({ isAdmin: true }), true);
    assert.equal(isStaff({ role: "USER" }), false);
    assert.deepEqual(flagsFromRole("MASTER"), { role: "MASTER", isAdmin: true, isMaster: true });
    assert.equal(roleFromFlags({ isAdmin: true, isMaster: false }), "ADMIN");
  });
});

describe("sanction durations", () => {
  it("offers 1 and 3 day stops plus longer bans", () => {
    const labels = SANCTION_BUTTONS.map((row) => row.label);
    assert.deepEqual(labels, ["1일 정지", "3일 정지", "7일 정지", "30일 정지", "영구 정지"]);
    const one = untilFor("suspend1");
    const three = untilFor("suspend3");
    assert.ok(one && one.getTime() - Date.now() < 1.1 * 24 * 60 * 60 * 1000);
    assert.ok(three && three.getTime() - Date.now() > 2 * 24 * 60 * 60 * 1000);
    assert.equal(untilFor("ban"), null);
  });
});

describe("ga measurement id", () => {
  it("uses the POKA measurement id unless env overrides it", () => {
    const previous = process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.NEXT_PUBLIC_GA_ID;
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "";
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "not-a-ga-id";
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "G-ABC123";
    assert.equal(gaMeasurementId(), "G-ABC123");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GA_ID;
    else process.env.NEXT_PUBLIC_GA_ID = previous;
  });
});
