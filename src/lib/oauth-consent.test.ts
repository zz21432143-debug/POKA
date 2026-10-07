import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consentIsValid, packOauthConsent, safeNextPath } from "./oauth-consent";
import { signSessionValue } from "./session";

describe("oauth consent", () => {
  it("accepts a freshly packed consent cookie", () => {
    assert.equal(consentIsValid(packOauthConsent()), true);
  });

  it("rejects missing, unsigned, or malformed values", () => {
    assert.equal(consentIsValid(undefined), false);
    assert.equal(consentIsValid(null), false);
    assert.equal(consentIsValid("1.123"), false);
    assert.equal(consentIsValid(signSessionValue("0.1")), false);
    assert.equal(consentIsValid(signSessionValue("1.not-a-number")), false);
  });

  it("rejects expired consent", () => {
    const stale = signSessionValue(`1.${Date.now() - 21 * 60 * 1000}`);
    assert.equal(consentIsValid(stale), false);
  });

  it("keeps in-app next paths and blocks open redirects", () => {
    assert.equal(safeNextPath("/me"), "/me");
    assert.equal(safeNextPath("/login?next=/me"), "/login?next=/me");
    assert.equal(safeNextPath(undefined), "/");
    assert.equal(safeNextPath("//evil.example"), "/");
    assert.equal(safeNextPath("https://evil.example"), "/");
    assert.equal(safeNextPath("/ok://no"), "/");
  });
});
