import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRestrictionMessage } from "./account-restriction";
import { canRevealPrivatePost, unlockPasswordOk } from "./private-post";
import { hashPassword } from "./password";
import { packUnlocks, parseUnlocks, hasUnlock } from "./unlock-cookie";

describe("account restriction copy", () => {
  it("explains a permanent ban", () => {
    const message = formatRestrictionMessage({
      id: "u1",
      status: "BANNED",
      banReason: "반복 비방",
    });
    assert.equal(message, "영구 정지된 계정입니다. 사유: 반복 비방");
  });

  it("explains a dated suspension in Korean", () => {
    const until = new Date("2026-12-15T03:00:00.000Z");
    const message = formatRestrictionMessage({
      id: "u2",
      status: "SUSPENDED",
      suspendedUntil: until,
      banReason: "도배",
    });
    assert.match(message ?? "", /까지 이용이 정지된 계정입니다/);
    assert.match(message ?? "", /사유: 도배/);
    assert.match(message ?? "", /2026년/);
  });

  it("lets expired suspensions pass the message check", () => {
    const message = formatRestrictionMessage({
      id: "u3",
      status: "SUSPENDED",
      suspendedUntil: new Date(Date.now() - 60_000),
      banReason: "만료",
    });
    assert.equal(message, null);
  });
});

describe("private suggestion posts", () => {
  it("lets author and admin skip the password", () => {
    assert.equal(
      canRevealPrivatePost({ isPrivate: true, authorId: "a", viewerId: "a", isAdmin: false }),
      true,
    );
    assert.equal(
      canRevealPrivatePost({ isPrivate: true, authorId: "a", viewerId: "b", isAdmin: true }),
      true,
    );
    assert.equal(
      canRevealPrivatePost({ isPrivate: true, authorId: "a", viewerId: "b", isAdmin: false, unlocked: false }),
      false,
    );
    assert.equal(
      canRevealPrivatePost({ isPrivate: true, authorId: "a", viewerId: "b", isAdmin: false, unlocked: true }),
      true,
    );
  });

  it("checks the hashed unlock password", () => {
    const hash = hashPassword("secret12");
    assert.equal(unlockPasswordOk("secret12", hash), true);
    assert.equal(unlockPasswordOk("nope", hash), false);
    assert.equal(unlockPasswordOk("abc", hash), false);
  });
});

describe("unlock cookie", () => {
  it("round-trips post ids", () => {
    const packed = packUnlocks(["p1", "p2"]);
    assert.deepEqual(parseUnlocks(packed).sort(), ["p1", "p2"]);
    assert.equal(hasUnlock(packed, "p1"), true);
    assert.equal(hasUnlock(packed, "p9"), false);
  });
});
