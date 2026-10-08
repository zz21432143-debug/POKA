import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenWord } from "./forbidden-words";
import { POST_COOLDOWN_MS } from "./security";
import { gaMeasurementId } from "./ga";
import { flagsFromRole, isStaff, roleFromFlags } from "./roles";

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

describe("ga measurement id", () => {
  it("rejects empty or malformed ids", () => {
    const previous = process.env.NEXT_PUBLIC_GA_ID;
    process.env.NEXT_PUBLIC_GA_ID = "";
    assert.equal(gaMeasurementId(), null);
    process.env.NEXT_PUBLIC_GA_ID = "not-a-ga-id";
    assert.equal(gaMeasurementId(), null);
    process.env.NEXT_PUBLIC_GA_ID = "G-ABC123";
    assert.equal(gaMeasurementId(), "G-ABC123");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GA_ID;
    else process.env.NEXT_PUBLIC_GA_ID = previous;
  });
});
