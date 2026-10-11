import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canManagePost } from "./post-manage";

const official = { id: "u-poka", nickname: "POKA", isAdmin: true, isMaster: true, memberKind: "INDIVIDUAL" as const };
const admin = { id: "u-admin", nickname: "운영자", isAdmin: true, isMaster: false, memberKind: "INDIVIDUAL" as const };
const author = { id: "u-a", nickname: "글쓴이", isAdmin: false, memberKind: "INDIVIDUAL" as const };
const other = { id: "u-b", nickname: "다른사람", isAdmin: false, memberKind: "INDIVIDUAL" as const };

describe("post manage permission", () => {
  it("일반 게시판: 글쓴이·관리자만", () => {
    const post = { authorId: "u-a", boardType: "FREE" as const };
    assert.equal(canManagePost(author, post), true);
    assert.equal(canManagePost(admin, post), true);
    assert.equal(canManagePost(other, post), false);
    assert.equal(canManagePost(null, post), false);
  });

  it("공식 게시판(TDA·공지·캘린더·공식 홍보): POKA 공식 계정만", () => {
    for (const boardType of ["TDA", "NOTICE", "SCHEDULE", "PROMO"] as const) {
      const post = { authorId: "u-a", boardType };
      assert.equal(canManagePost(official, post), true, boardType);
      assert.equal(canManagePost(admin, post), false, boardType);
      assert.equal(canManagePost(author, post), false, boardType);
    }
  });
});
