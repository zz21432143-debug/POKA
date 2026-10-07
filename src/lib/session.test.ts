import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSessionValue, signSessionValue } from "./session";

describe("signed session", () => {
  it("round-trips a nickname", () => {
    const token = signSessionValue("펠트딜러");
    assert.equal(readSessionValue(token), "펠트딜러");
  });

  it("rejects tampering", () => {
    const token = signSessionValue("핸드헌터");
    assert.equal(readSessionValue(`${token}x`), null);
    assert.equal(readSessionValue("핸드헌터"), null);
  });
});
