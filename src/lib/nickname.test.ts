import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nicknameError, passwordError } from "./nickname";
import { hashPassword, verifyPassword } from "./password";

describe("nickname and password", () => {
  it("accepts a normal dealer nick", () => {
    assert.equal(nicknameError("리버샤크"), null);
    assert.equal(passwordError("poka1234"), null);
  });

  it("rejects reserved and too-short names", () => {
    assert.ok(nicknameError("익명"));
    assert.ok(nicknameError("a"));
    assert.ok(passwordError("short"));
  });

  it("hashes and verifies", () => {
    const stored = hashPassword("poka1234");
    assert.equal(verifyPassword("poka1234", stored), true);
    assert.equal(verifyPassword("wrongpass", stored), false);
  });
});
