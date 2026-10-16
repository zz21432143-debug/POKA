import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenInNickname, findForbiddenWord } from "./forbidden-words";
import { POST_COOLDOWN_MS } from "./security";
import { gaMeasurementId } from "./ga";
import { flagsFromRole, isStaff, roleFromFlags } from "./roles";
import { SANCTION_BUTTONS, untilFor } from "./sanctions";

describe("forbidden words", () => {
  it("blocks a listed keyword and names it in the match", () => {
    assert.equal(findForbiddenWord("카톡 말고 텔레그램으로 주세요", ["텔레그램", "첫충"]), "텔레그램");
    assert.equal(findForbiddenWord("첫충 이벤트", ["첫충"]), "첫충");
    assert.equal(findForbiddenWord("평범한 핸드리뷰", ["텔레그램", "꽁머니"]), null);
  });
});

describe("write cooldown", () => {
  it("uses a 5 second window for posts", () => {
    assert.equal(POST_COOLDOWN_MS, 5_000);
  });
});

describe("staff roles", () => {
  it("treats master and admin as staff", () => {
    assert.equal(isStaff({ isMaster: true }), true);
    assert.equal(isStaff({ isAdmin: true }), true);
    assert.equal(isStaff({ role: "USER" }), false);
    assert.deepEqual(flagsFromRole("MASTER"), { role: "MASTER", isAdmin: true, isMaster: true });
    assert.equal(roleFromFlags({ isAdmin: true, isMaster: false }), "ADMIN");
  });
});

describe("sanction durations", () => {
  it("offers 1 and 3 day stops plus longer bans", () => {
    const labels = SANCTION_BUTTONS.map((row) => row.label);
    assert.deepEqual(labels, ["1일 정지", "3일 정지", "7일 정지", "30일 정지", "영구 정지"]);
    const one = untilFor("suspend1");
    const three = untilFor("suspend3");
    assert.ok(one && one.getTime() - Date.now() < 1.1 * 24 * 60 * 60 * 1000);
    assert.ok(three && three.getTime() - Date.now() > 2 * 24 * 60 * 60 * 1000);
    assert.equal(untilFor("ban"), null);
  });
});

describe("ga measurement id", () => {
  it("uses the POKA measurement id unless env overrides it", () => {
    const previous = process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.NEXT_PUBLIC_GA_ID;
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "";
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "not-a-ga-id";
    assert.equal(gaMeasurementId(), "G-MW7F9CY9XD");
    process.env.NEXT_PUBLIC_GA_ID = "G-ABC123";
    assert.equal(gaMeasurementId(), "G-ABC123");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_GA_ID;
    else process.env.NEXT_PUBLIC_GA_ID = previous;
  });
});

describe("닉네임 금지어(들어가기만 해도 막음)", () => {
  const words = ["바카라", "첫충", "텔레그램", "casino", "토토 사이트"];
  it("그대로 · 앞뒤에 붙여도", () => {
    assert.equal(findForbiddenInNickname("바카라", words), "바카라");
    assert.equal(findForbiddenInNickname("강남바카라왕", words), "바카라");
    assert.equal(findForbiddenInNickname("CASINO_KING", words), "casino");
  });
  it("사이에 _ · 숫자 · 영문을 끼워도", () => {
    assert.equal(findForbiddenInNickname("바_카라", words), "바카라");
    assert.equal(findForbiddenInNickname("바1카2라", words), "바카라");
    assert.equal(findForbiddenInNickname("첫x충", words), "첫충");
    assert.equal(findForbiddenInNickname("c4s1no", words), "casino");
    assert.equal(findForbiddenInNickname("토토사이트왕", words), "토토 사이트");
  });
  it("상관없는 닉네임은 통과", () => {
    for (const n of ["딜러민수", "홀덤조아", "Ace_7", "바다카라멜"]) assert.equal(findForbiddenInNickname(n, words), null, n);
  });
});

describe("구인 글 허용 단어", () => {
  it("「자지」는 구인에서만 빼고 다른 곳은 그대로", async () => {
    const { JOB_ALLOWED_WORDS } = await import("./forbidden-words");
    const words = ["자지", "금지어"];
    const jobWords = words.filter((w) => !JOB_ALLOWED_WORDS.has(w));
    assert.equal(findForbiddenWord("성함,경력,성별 문자지원", jobWords), null);
    assert.equal(findForbiddenWord("금지어 들어감", jobWords), "금지어");
    assert.equal(findForbiddenWord("성별 문자지원", words), "자지");
  });
});
