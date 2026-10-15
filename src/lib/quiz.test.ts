import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import { QUIZ_SLOT_RE, TDA_OX, dayNumber, generateQuiz, handLabel, josa, quizSlotAt, quizSlotLabel, type QuizData } from "./quiz";

const read = (p: string) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
const data: QuizData = {
  positions: read("../../public/data/gto-positions.json"),
  eq: read("../../public/data/preflop-eq.json"),
  ranking: read("./data/hand-ranking.json"),
};

describe("오늘의 퀴즈 자동 생성", () => {
  it("같은 날짜 = 같은 문제, 날마다 종류가 돌아감", () => {
    assert.deepEqual(generateQuiz("2026-10-15", data), generateQuiz("2026-10-15", data));
    const kinds = new Set(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"].map((d) => generateQuiz(d, data).kind));
    assert.equal(kinds.size, 7);
  });

  it("TDA OX: 맞는 문장 · 틀린 문장 반반, 문제마다 해설 · 매장 룰 안내", () => {
    assert.equal(TDA_OX.filter((t) => t.o).length, TDA_OX.filter((t) => !t.o).length);
    assert.equal(new Set(TDA_OX.map((t) => t.q)).size, TDA_OX.length);
    for (let i = 0; i < 120; i++) {
      const day = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
      const q = generateQuiz(day, data);
      if (q.kind !== "tda") continue;
      assert.deepEqual(q.choices, ["O (맞아요)", "X (틀려요)"]);
      assert.ok(q.explanation.startsWith(q.answer === 0 ? "O" : "X") && q.explanation.includes("하우스 룰"), day);
    }
  });

  it("팟 오즈 · 아웃츠: 보기 4개 서로 다름 · 정답 계산이 맞음", () => {
    for (let i = 0; i < 240; i++) {
      const day = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
      const q = generateQuiz(day, data);
      if (q.kind !== "potodds" && q.kind !== "outs") continue;
      assert.equal(new Set(q.choices).size, q.choices.length, day);
      assert.ok(q.choices.length >= 3, day);
      if (q.kind === "potodds") {
        const [, pot, bet] = q.question.match(/팟 ([\d,]+)에 상대가 ([\d,]+)/)!.map((s) => Number(s.replace(/,/g, "")));
        assert.equal(q.choices[q.answer], `${Math.round((bet / (pot + 2 * bet)) * 100)}%`, day);
      }
    }
  });

  it("두 달치 문제 모두 보기 2~4개 · 정답 번호가 보기 안 · 해설 있음", () => {
    for (let i = 0; i < 60; i++) {
      const day = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
      const q = generateQuiz(day, data);
      assert.ok(q.choices.length >= 2 && q.choices.length <= 4, day);
      assert.ok(q.answer >= 0 && q.answer < q.choices.length, day);
      assert.ok(q.question.length > 10 && q.explanation.length > 10, day);
    }
  });

  it("족보 문제는 높은 족보가 정답", () => {
    for (let i = 0; i < 60; i++) {
      const day = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
      const q = generateQuiz(day, data);
      if (q.kind !== "handrank") continue;
      const order = ["로열 플러시", "스트레이트 플러시", "포카드", "풀하우스", "플러시", "스트레이트", "트리플", "투페어", "원페어", "하이카드"];
      const right = q.choices[q.answer];
      const wrong = q.choices[1 - q.answer];
      assert.ok(order.indexOf(right) < order.indexOf(wrong), `${day} ${q.question}`);
    }
  });

  it("패 이름 풀어 쓰기", () => {
    assert.equal(handLabel("K9o"), "K9 오프수트");
    assert.equal(handLabel("ATs"), "A10 수티드");
    assert.equal(handLabel("77"), "포켓 페어");
    assert.equal(josa("플러시", "이가"), "플러시가");
    assert.equal(josa("포카드", "은는"), "포카드는");
    assert.equal(josa("스트레이트 플러시", "은는"), "스트레이트 플러시는");
    assert.equal(josa("포켓 AA", "이가"), "포켓 AA가");
    assert.equal(josa("55", "은는"), "55는");
    assert.equal(josa("77", "은는"), "77은");
    assert.equal(josa("Q8s", "은는"), "Q8s는");
    assert.equal(josa("KTo", "은는"), "KTo는");
    assert.equal(josa("AT", "은는"), "AT은");
    assert.equal(josa("POKA!", "이가"), "POKA!이(가)");
  });
});

describe("퀴즈 12시간 칸", () => {
  it("KST 9시 · 21시에 칸이 바뀜(키 = 퀴즈 날짜 · 저녁은 -2)", () => {
    // KST 08:59 = UTC 전날 23:59 → 전날 저녁 문제
    assert.equal(quizSlotAt(Date.parse("2026-10-15T23:59:00Z")), "2026-10-15-2");
    assert.equal(quizSlotAt(Date.parse("2026-10-16T00:00:00Z")), "2026-10-16");
    assert.equal(quizSlotAt(Date.parse("2026-10-16T11:59:00Z")), "2026-10-16");
    assert.equal(quizSlotAt(Date.parse("2026-10-16T12:00:00Z")), "2026-10-16-2");
  });
  it("문자열 순서 = 시간 순서 · 이름", () => {
    assert.ok("2026-10-15" < "2026-10-15-2" && "2026-10-15-2" < "2026-10-16");
    assert.ok(QUIZ_SLOT_RE.test("2026-10-15-2") && QUIZ_SLOT_RE.test("2026-10-15") && !QUIZ_SLOT_RE.test("2026-10-15-3"));
    assert.equal(quizSlotLabel("2026-10-15-2"), "10.15 저녁");
    assert.equal(quizSlotLabel("2026-10-15"), "10.15 아침");
  });
  it("아침 · 저녁 문제 종류가 다름", () => {
    assert.equal(dayNumber("2026-10-15-2"), dayNumber("2026-10-15"));
    assert.notEqual(generateQuiz("2026-10-15", data).kind, generateQuiz("2026-10-15-2", data).kind);
    assert.notEqual(generateQuiz("2026-10-15-2", data).question, generateQuiz("2026-10-16", data).question);
  });
});
