import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword } from "./password";
import { matchVerifySecret, packVerifySecret } from "./verify-secret";

describe("email verify secrets", () => {
  it("accepts the URL token or the 6-digit code", () => {
    const packed = packVerifySecret("url-token-value", "482193");
    assert.equal(matchVerifySecret("url-token-value", packed), true);
    assert.equal(matchVerifySecret("482193", packed), true);
    assert.equal(matchVerifySecret("000000", packed), false);
  });

  it("still accepts a legacy scrypt hash", () => {
    const packed = hashPassword("legacy-token");
    assert.equal(matchVerifySecret("legacy-token", packed), true);
    assert.equal(matchVerifySecret("nope", packed), false);
  });
});
