import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEGAL_SERVICE_NAME,
  PRIVACY_CONSENT_SECTIONS,
  PRIVACY_POLICY_SECTIONS,
  YOUTH_PROTECTION_SECTIONS,
} from "./legal";
import { DEFAULT_CONTACT_EMAIL, DEFAULT_OPERATOR_NAME, publicContactEmail, privacyOfficerName } from "./legal-contact";

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
    assert.match(retain.body, /악성 이용자 재가입 방지/);
    assert.match(retain.body, /작성자 IP/);
    assert.match(retain.body, /관계 법령/);
  });

  it("names the privacy officer and email", () => {
    const officer = PRIVACY_POLICY_SECTIONS.find((row) => row.title.includes("보호책임자"));
    assert.ok(officer);
    assert.match(officer.body, new RegExp(privacyOfficerName()));
    assert.match(officer.body, new RegExp(publicContactEmail()));
    assert.equal(DEFAULT_OPERATOR_NAME, "POKA 관리자");
    assert.equal(DEFAULT_CONTACT_EMAIL, "contact@pokerwiki.co.kr");
  });

  it("includes a youth protection policy", () => {
    assert.ok(YOUTH_PROTECTION_SECTIONS.length >= 3);
    assert.match(YOUTH_PROTECTION_SECTIONS[0].body, /만 19세/);
  });
});
