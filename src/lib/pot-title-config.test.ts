import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_TITLE_CONFIG, HONOR_KEYS, normalizeTitleConfig, parseTitleConfig } from "./pot-title-config";

describe("칭호 설정", () => {
  it("예전 설정(랭킹 칭호 없음)도 기본값으로 채움: 모두 켜짐 · 1위만", () => {
    const c = parseTitleConfig(JSON.stringify({ enabled: true, names: { 1: "A" } }));
    for (const k of HONOR_KEYS) {
      assert.equal(c.honors[k].enabled, true);
      assert.equal(c.honors[k].top, 1);
      assert.equal(c.honors[k].name, DEFAULT_TITLE_CONFIG.honors[k].name);
    }
    assert.equal(c.names[1], "A");
  });

  it("1~3위 · 끄기 · 이름(길이 제한) 반영, 이상한 값은 1위로", () => {
    const c = normalizeTitleConfig({ honors: { level: { top: 3, name: "  만렙   오니  " }, marks: { enabled: false, top: 7 } } });
    assert.equal(c.honors.level.top, 3);
    assert.equal(c.honors.level.name, "만렙 오니");
    assert.equal(c.honors.marks.enabled, false);
    assert.equal(c.honors.marks.top, 1);
  });
});
