import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueCaptcha, verifyCaptcha } from "./captcha";

describe("register captcha", () => {
  it("accepts the sum after a short delay", () => {
    const issued = Date.now() - 2_000;
    const challenge = issueCaptcha(issued);
    assert.equal(verifyCaptcha(challenge.token, challenge.a + challenge.b, Date.now()), null);
  });

  it("rejects a wrong answer and a too-fast submit", () => {
    const now = Date.now();
    const challenge = issueCaptcha(now);
    assert.match(verifyCaptcha(challenge.token, challenge.a + challenge.b, now + 100) ?? "", /빨리/);
    assert.match(verifyCaptcha(challenge.token, challenge.a + challenge.b + 1, now + 2_000) ?? "", /답이 맞지/);
    assert.match(verifyCaptcha("tampered", 1, now) ?? "", /확인/);
  });
});
