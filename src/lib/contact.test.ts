import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTACT_REQUIRED_MESSAGE, KAKAO_CONTACT_MESSAGE, checkJobContact } from "./contact";

describe("job contact", () => {
  it("전화번호만 받고 형식을 맞춥니다", () => {
    assert.deepEqual(checkJobContact("01012345678"), { ok: true, value: "010-1234-5678" });
    assert.deepEqual(checkJobContact("010 2693 0330"), { ok: true, value: "010-2693-0330" });
    assert.deepEqual(checkJobContact("02-123-4567"), { ok: true, value: "02-123-4567" });
    assert.deepEqual(checkJobContact("0507-1234-5678"), { ok: true, value: "0507-1234-5678" });
    assert.deepEqual(checkJobContact("김종욱: 010-5678-5247, 권순호 010-2693-0330"), {
      ok: true,
      value: "김종욱 010-5678-5247, 권순호 010-2693-0330",
    });
    assert.deepEqual(checkJobContact("010 5347 7212 조준우"), { ok: true, value: "조준우 010-5347-7212" });
  });

  it("카카오톡 아이디·영문·기타 글은 막습니다", () => {
    for (const bad of ["pokaholdem", "카톡 poka123", "카카오톡ID: poka", "오픈채팅 문의", "https://open.kakao.com/o/abc", "poka@kakao", "010-1234", "전화주세요!", "1234-5678"]) {
      assert.deepEqual(checkJobContact(bad), { ok: false, error: KAKAO_CONTACT_MESSAGE }, bad);
    }
    assert.deepEqual(checkJobContact("  "), { ok: false, error: CONTACT_REQUIRED_MESSAGE });
  });
});
