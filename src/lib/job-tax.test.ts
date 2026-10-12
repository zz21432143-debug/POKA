import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectTax, needsTax, parseTax, taxLabel } from "./job-tax";

describe("job 3.3% tax", () => {
  it("applies to apply, tournament and urgent posts only", () => {
    assert.equal(needsTax("APPLY"), true);
    assert.equal(needsTax("TOURNAMENT"), true);
    assert.equal(needsTax("URGENT"), true);
    assert.equal(needsTax("FIXED"), false);
    assert.equal(needsTax("TEAM"), false);
  });

  it("parses and labels the choice", () => {
    assert.equal(parseTax("공제"), "공제");
    assert.equal(parseTax("x"), null);
    assert.equal(taxLabel("공제"), "3.3% 공제");
    assert.equal(taxLabel("없음"), "공제 없음");
    assert.equal(taxLabel(null), null);
  });

  it("reads the tax note from a pasted post", () => {
    assert.equal(detectTax("시급 : 20,000원 (3.3% 공제)"), "공제");
    assert.equal(detectTax("시급 2만원 3.3%"), "공제");
    assert.equal(detectTax("시급 25,000원 3.3 공제 없음"), "없음");
    assert.equal(detectTax("시급 25,000원 (미공제)"), "없음");
    assert.equal(detectTax("시급 25,000원"), null);
  });
});
