import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTHOR_IP_RETENTION_DAYS,
  BAN_REJOIN_RETENTION_DAYS,
  socialFingerprint,
  withdrawnDisplayName,
} from "./account-privacy";
import { isStaff } from "./roles";

describe("account withdraw helpers", () => {
  it("hashes social ids so the raw id is not stored for rejoin blocks", () => {
    const a = socialFingerprint("kakao", "12345");
    const b = socialFingerprint("kakao", "12345");
    const c = socialFingerprint("kakao", "99999");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.includes("12345"), false);
    assert.match(a, /^kakao:[a-f0-9]{64}$/);
  });

  it("keeps author IP 90 days and banned fingerprints 1 year", () => {
    assert.equal(AUTHOR_IP_RETENTION_DAYS, 90);
    assert.equal(BAN_REJOIN_RETENTION_DAYS, 365);
    assert.equal(withdrawnDisplayName(), "탈퇴한 회원");
  });

  it("does not let members mark a job as paid", () => {
    assert.equal(isStaff({ isAdmin: false, isMaster: false }), false);
    assert.equal(isStaff({ isAdmin: true }), true);
  });
});
