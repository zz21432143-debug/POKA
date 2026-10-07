import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailError, normalizeEmail } from "./email-address";

describe("email", () => {
  it("normalizes and validates", () => {
    assert.equal(normalizeEmail("  A@B.COM "), "a@b.com");
    assert.equal(emailError("a@b.com"), null);
    assert.match(emailError("not-an-email") ?? "", /형식/);
    assert.match(emailError("") ?? "", /입력/);
  });
});
