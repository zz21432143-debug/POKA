import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEGAL_SERVICE_NAME,
  PRIVACY_CONSENT_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
  YOUTH_PROTECTION_SECTIONS,
} from "./legal";
import { DEFAULT_CONTACT_EMAIL, publicContactEmail } from "./legal-contact";

describe("legal required disclosures", () => {
  it("names the service POKA", () => {
    assert.equal(LEGAL_SERVICE_NAME, "POKA");
  });

  it("lists required privacy collection items", () => {
    const collect = PRIVACY_CONSENT_SECTIONS.find((row) => row.title.includes("수집 항목"));
    assert.ok(collect);
    for (const phrase of ["소셜 고유 ID", "이메일", "닉네임", "IP 주소", "접속 로그"]) {
      assert.match(collect.body, new RegExp(phrase));
    }
  });

  it("lists required collection purposes", () => {
    const purpose = PRIVACY_CONSENT_SECTIONS.find((row) => row.title.includes("이용 목적"));
    assert.ok(purpose);
    for (const phrase of ["회원 식별", "부정 이용", "수사기관", "분쟁"]) {
      assert.match(purpose.body, new RegExp(phrase));
    }
  });

  it("destroys data on leave except legal IP retention", () => {
    const retain = PRIVACY_CONSENT_SECTIONS.find((row) => row.title.includes("보유"));
    assert.ok(retain);
    assert.match(retain.body, /탈퇴 시 즉시 파기/);
    assert.match(retain.body, /재가입 방지/);
    assert.match(retain.body, /3개월/);
    assert.match(retain.body, /1년/);
  });

  it("lists contact email and overseas transfer, without a placeholder legal name", () => {
    const officer = PRIVACY_POLICY_SECTIONS.find((row) => row.title.includes("관련 문의"));
    assert.ok(officer);
    assert.match(officer.body, new RegExp(publicContactEmail()));
    assert.doesNotMatch(officer.body, /성명/);
    assert.equal(DEFAULT_CONTACT_EMAIL, "POKA4444444@gmail.com");
    const transfer = PRIVACY_CONSENT_SECTIONS.find((row) => row.title.includes("국외"));
    assert.ok(transfer);
    for (const phrase of ["Google", "Vercel", "Neon", "미국"]) {
      assert.match(transfer.body, new RegExp(phrase));
    }
  });

  it("includes a youth protection policy", () => {
    assert.ok(YOUTH_PROTECTION_SECTIONS.length >= 3);
    assert.match(YOUTH_PROTECTION_SECTIONS[0].body, /만 19세/);
  });
});
