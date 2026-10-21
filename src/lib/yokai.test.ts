import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import { FULL_LIMIT, STARTERS, YOKAI, YOKAI_ORDER, feedsAllowed, fullnessNow, nextFeedTime, nextPetTime, nextStageProgress, stageForExp, waitText, yokaiImage } from "./yokai";
import { arrivals, gumihoTails, meets, progressLine, type YokaiStats } from "./yokai-achieve";

describe("요괴 마을 계산", () => {
  it("스타팅은 도깨비 · 잉어 · 삼두구미, 모든 요괴는 5단계 이름이 있음", () => {
    assert.deepEqual(STARTERS, ["dokkaebi", "ingeo", "samdugumi"]);
    for (const s of YOKAI_ORDER) assert.equal(YOKAI[s].stages.length, 5, s);
  });

  it("25종 · 등급(전설 2 · 영웅 4) · 모든 요괴 그림 5장이 public/yokai에 있음", () => {
    assert.equal(YOKAI_ORDER.length, 25);
    assert.deepEqual(YOKAI_ORDER.filter((s) => YOKAI[s].rarity === "legend"), ["gumiho", "yeomra"]);
    assert.deepEqual(YOKAI_ORDER.filter((s) => YOKAI[s].rarity === "hero"), ["sacheonwang", "tengu", "amseokgwi", "haetae"]);
    for (const s of YOKAI_ORDER) for (let k = 1; k <= 5; k++) assert.ok(fs.existsSync(new URL(`../../public${yokaiImage(s, k)}`, import.meta.url)), `${s}-${k}`);
  });

  it("경험치로 단계가 정해지고 5단계에서 멈춤", () => {
    assert.equal(stageForExp(0), 1);
    assert.equal(stageForExp(149), 1);
    assert.equal(stageForExp(150), 2);
    assert.equal(stageForExp(1199), 3);
    assert.equal(stageForExp(2500), 5);
    assert.equal(stageForExp(99999), 5);
    assert.deepEqual(nextStageProgress(200), { stage: 2, have: 50, need: 350, to: 500 });
    assert.equal(nextStageProgress(2500), null);
  });

  it("포만감은 시간이 지나면 줄지만 0 밑으로 안 내려감", () => {
    const at = new Date("2026-10-15T00:00:00Z");
    assert.equal(fullnessNow(80, at, new Date("2026-10-15T10:00:00Z")), 30);
    assert.equal(fullnessNow(80, at, new Date("2026-10-20T00:00:00Z")), 0);
    assert.equal(fullnessNow(80, at, at), 80);
  });

  it("하루 밥: 기본 1 + 출석 · 퀴즈 · 글", () => {
    assert.equal(feedsAllowed({ attended: false, quiz: false, posted: false, commented: false }), 1);
    assert.equal(feedsAllowed({ attended: true, quiz: true, posted: true, commented: false }), 4);
    assert.equal(feedsAllowed({ attended: true, quiz: true, posted: true, commented: true }), 5);
  });

  it("배부르면 안 먹음 · 쓰다듬기 쉬는 시간 · 남은 시간 글", () => {
    const now = new Date("2026-10-15T00:00:00Z");
    assert.equal(nextFeedTime(FULL_LIMIT - 1, now), null);
    // 포만감 90 → 79가 되려면 11/5시간 = 2시간 12분
    assert.equal(nextFeedTime(90, now)?.toISOString(), "2026-10-15T02:12:00.000Z");
    assert.equal(nextPetTime(null, now), null);
    assert.equal(nextPetTime(new Date("2026-10-14T23:30:00Z"), now)?.toISOString(), "2026-10-15T00:30:00.000Z");
    assert.equal(nextPetTime(new Date("2026-10-14T22:00:00Z"), now), null);
    assert.equal(waitText(new Date("2026-10-15T01:05:00Z"), now), "1시간 5분");
    assert.equal(waitText(new Date("2026-10-15T00:12:00Z"), now), "12분");
  });
});

const ZERO: YokaiStats = { attendDays: 0, dawnAttend: 0, freeActs: 0, comments: 0, handActs: 0, urgentActs: 0, drillRuns: 0, shares: 0, storeTools: 0, quizStreak: 0, quizCorrect: 0, tdaCorrect: 0, pointsEarned: 0, weeklyRank: null, level: 1, upvotes: 0, monthlyHonors: 0, studyDays: 0 };

describe("요괴가 찾아오는 조건", () => {
  it("아무것도 안 했으면 아무도 안 옴 · 시작 요괴는 조건으로 안 옴", () => {
    assert.deepEqual(arrivals(ZERO, { dokkaebi: 1 }), []);
  });

  it("활동 기록만큼 찾아옴(박쥐귀 새벽 출석 7번 · 해태 TDA 10번 · 설녀 출석 30일)", () => {
    const got = arrivals({ ...ZERO, dawnAttend: 7, tdaCorrect: 10, attendDays: 30 }, { ingeo: 1 });
    assert.equal(arrivals({ ...ZERO, pointsEarned: 19999 }, {}).length, 0);
    assert.deepEqual(arrivals({ ...ZERO, pointsEarned: 20000 }, {}), ["tamrang"]);
    assert.deepEqual(got.sort(), ["bakjwigwi", "haetae", "seolnyeo"]);
    assert.equal(arrivals({ ...ZERO, dawnAttend: 6 }, {}).length, 0);
  });

  it("두억시니는 도깨비 5단계 · 호리병귀는 도감 10종(이어서 찾아오는 것까지)", () => {
    assert.ok(meets("dueoksini", ZERO, { dokkaebi: 5 }));
    assert.ok(!meets("dueoksini", ZERO, { dokkaebi: 4 }));
    const nine = { dokkaebi: 1, ingeo: 1, samdugumi: 1, nudeogi: 1, samagwi: 1, eodukssini: 1, noejeongwi: 1, bulgasari: 1, hwaryong: 1 } as const;
    // 9종 + 설녀(출석 30일) = 10종 → 호리병귀까지 한 번에
    assert.deepEqual(arrivals({ ...ZERO, attendDays: 30 }, nine).sort(), ["horibyeonggwi", "seolnyeo"]);
  });

  it("염라대왕: 영웅 1종 + 희귀 4종", () => {
    const four = { keunnuni: 1, seolnyeo: 1, tamrang: 1, yacha: 1 } as const;
    assert.ok(!meets("yeomra", ZERO, four));
    assert.ok(meets("yeomra", ZERO, { ...four, haetae: 1 }));
    assert.equal(progressLine("yeomra", ZERO, { keunnuni: 1, haetae: 1 }), "영웅 1/1 · 희귀 1/4");
  });

  it("구미호: 아홉 꼬리를 다 모아야 찾아옴", () => {
    const full: YokaiStats = { ...ZERO, attendDays: 60, quizCorrect: 80, drillRuns: 100, handActs: 20, freeActs: 50, monthlyHonors: 1, level: 60 };
    const owned = { dokkaebi: 3, ingeo: 3, samdugumi: 3, nudeogi: 1, samagwi: 1, eodukssini: 1, noejeongwi: 1, bulgasari: 1, hwaryong: 1, bakjwigwi: 1, deungbulgwi: 1, keunnuni: 1, seolnyeo: 1, tamrang: 1, yacha: 1 } as const;
    assert.equal(gumihoTails(full, owned).filter((t) => t.done).length, 9);
    assert.ok(meets("gumiho", full, owned));
    assert.equal(gumihoTails({ ...full, level: 59 }, owned).filter((t) => t.done).length, 8);
    assert.ok(!meets("gumiho", { ...full, level: 59 }, owned));
  });
});

describe("청결도 · 샤워 · 대사", () => {
  it("청결도는 시간이 지나면 줄고, 70 미만이어야 샤워 · 깨끗하면 밥 경험치 +5", async () => {
    const { cleanNow, nextShowerTime, feedExp } = await import("./yokai");
    const at = new Date("2026-10-15T00:00:00Z");
    assert.equal(cleanNow(100, at, new Date("2026-10-15T10:00:00Z")), 60);
    assert.equal(cleanNow(100, at, new Date("2026-10-17T00:00:00Z")), 0);
    assert.equal(nextShowerTime(69, at), null);
    // 100 → 69가 되려면 31/4시간 = 7시간 45분
    assert.equal(nextShowerTime(100, at)?.toISOString(), "2026-10-15T07:45:00.000Z");
    assert.equal(feedExp(50), 25);
    assert.equal(feedExp(49), 20);
    // 영혼의 단짝(친밀도 100): +5
    assert.equal(feedExp(50, 100), 30);
    assert.equal(feedExp(49, 100), 25);
    assert.equal(feedExp(50, 99), 25);
  });

  it("25종 모두 상황별 대사가 있고, 말풍선에 들어갈 길이", async () => {
    const { YOKAI_LINES, pickLine } = await import("./yokai-lines");
    const kinds = ["greet", "hungry", "full", "dirty", "fed", "pet", "shower", "evolve", "bond"] as const;
    for (const s of YOKAI_ORDER) {
      for (const k of kinds) {
        const list = YOKAI_LINES[s][k];
        assert.ok(list.length >= 1, `${s} ${k}`);
        for (const line of list) assert.ok(line.trim().length > 0 && line.length <= 45, `${s} ${k}: ${line}`);
      }
      assert.equal(pickLine(s, "greet", 7), pickLine(s, "greet", 7));
    }
  });
});

describe("친밀도 단계", () => {
  it("10 · 30 · 50 · 70 · 100 보상 · 다음 목표", async () => {
    const { BOND_TIERS, bondName, nextBond, FEED, PET_AFFECTION, SHOWER_AFFECTION, GREET_AFFECTION } = await import("./yokai");
    assert.deepEqual(BOND_TIERS.map((t) => t.at), [10, 30, 50, 70, 100]);
    assert.equal(bondName(9), "친해지는 중");
    assert.equal(bondName(10), "친구");
    assert.equal(bondName(55), "단짝");
    assert.deepEqual(nextBond(45), { at: 50, points: 130, name: "단짝", left: 5 });
    assert.equal(nextBond(100), null);
    // 하루 한 번 들르는 회원(인사 + 밥 1 + 쓰다듬기 1 + 샤워 1) ≈ 18 → 첫날 10 넘음
    assert.equal(GREET_AFFECTION + FEED.affection + PET_AFFECTION + SHOWER_AFFECTION, 18);
  });
});
