import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canUseFreeNicknameChange, nicknameChangeBlocked, NICKNAME_TICKET_PRICE } from "./nickname-change";

describe("nickname change tickets", () => {
  it("costs 500 points after the first free change", () => {
    assert.equal(NICKNAME_TICKET_PRICE, 500);
    assert.equal(canUseFreeNicknameChange(0), true);
    assert.equal(canUseFreeNicknameChange(1), false);
    assert.equal(nicknameChangeBlocked(0, 0), null);
    assert.equal(nicknameChangeBlocked(1, 1), null);
    assert.match(nicknameChangeBlocked(1, 0) ?? "", /500/);
  });
});
