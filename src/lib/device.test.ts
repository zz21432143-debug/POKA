import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deviceOf } from "./site-stats";
import { SOURCE_RE } from "./traffic";

describe("기기 구분", () => {
  it("휴대폰 · 태블릿 · PC", () => {
    assert.equal(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"), "mobile");
    assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"), "mobile");
    assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"), "tablet");
    assert.equal(deviceOf("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"), "tablet");
    assert.equal(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"), "pc");
    assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 13; SM-G991N; KAKAOTALK 10.5.0) Mobile Safari/537.36"), "mobile");
    assert.equal(deviceOf(null), "pc");
  });

  it("기록 칸 이름이 유입 경로 규칙에 맞고 「x-」로 시작해 유입 표에서 빠짐", () => {
    for (const k of ["mobile", "tablet", "pc"]) {
      const s = `x-dev-${k}`;
      assert.ok(SOURCE_RE.test(s), s);
      assert.ok(s.startsWith("x-"));
    }
  });
});
