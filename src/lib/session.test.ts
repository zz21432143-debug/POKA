import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_MAX_AGE_MS, makeSessionToken, parseSessionToken, readSessionValue, signSessionValue } from "./session";

describe("signed session", () => {
  it("round-trips a value", () => {
    const token = signSessionValue("펠트딜러");
    assert.equal(readSessionValue(token), "펠트딜러");
  });

  it("rejects tampering", () => {
    const token = signSessionValue("핸드헌터");
    assert.equal(readSessionValue(`${token}x`), null);
    assert.equal(readSessionValue("핸드헌터"), null);
  });

  it("login token carries user id and version", () => {
    const now = Date.now();
    assert.deepEqual(parseSessionToken(makeSessionToken("user_1", 3, now), now), { userId: "user_1", version: 3 });
  });

  it("rejects old nickname cookies, expired and future tokens", () => {
    const now = Date.now();
    assert.equal(parseSessionToken(signSessionValue("POKA"), now), null);
    assert.equal(parseSessionToken(makeSessionToken("u", 0, now - SESSION_MAX_AGE_MS - 1000), now), null);
    assert.equal(parseSessionToken(makeSessionToken("u", 0, now + 10 * 60_000), now), null);
  });
});
