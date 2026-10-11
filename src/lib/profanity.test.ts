import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findProfanity } from "./profanity";

const category = (text: string, nickname = false) => findProfanity(text, { nickname })?.category ?? null;

describe("profanity filter", () => {
  it("catches abuse and common evasions", () => {
    for (const text of ["씨발", "씨1발", "씨!발", "씨.발", "ㅅㅂ", "ㅄ", "개새끼", "개.새.끼", "병신", "느금마", "엠창", "18놈", "ｆｕｃｋ"]) {
      assert.equal(category(text), "abuse", text);
    }
  });

  it("catches adult, gambling, spam and hate phrases", () => {
    assert.equal(category("조건만남 하실분"), "adult");
    assert.equal(category("출장안마 문의"), "adult");
    assert.equal(category("온라인카지노 첫충 이벤트"), "gambling");
    assert.equal(category("꽁머니 지급"), "gambling");
    assert.equal(category("작업대출 가능"), "gambling");
    assert.equal(category("문의는 t.me/abcd"), "spam");
    assert.equal(category("텔레그램 주세요"), "spam");
    assert.equal(category("bit.ly/xyz 클릭"), "spam");
    assert.equal(category("한남충들"), "hate");
    assert.equal(category("짱깨"), "hate");
  });

  it("does not block normal holdem job and community sentences", () => {
    for (const text of [
      "시발점에서 다시 시작합니다",
      "오피스텔 2층 홀덤펍입니다",
      "18시부터 근무 가능, 만 18세 이상",
      "아저씨 발견했어요",
      "홍길동씨 발표 들었어요",
      "연락은 카카오 오픈채팅으로 주세요",
      "카톡문의 환영합니다 010-1234-5678",
      "강원랜드 카지노 딜러 경력 3년",
      "한남동 홀덤펍 딜러 구합니다",
      "그래도 오늘은 출석",
      "홍어 회 먹었어요",
      "토토로 좋아합니다",
      "오피셜 대회 일정",
      "고기 씹는 소리",
      "계산 안 하고 간 먹튀 손님",
    ]) {
      assert.equal(category(text), null, text);
    }
  });

  it("blocks admin impersonation only in nicknames", () => {
    assert.equal(category("관리자", true), "impersonation");
    assert.equal(category("POKA운영팀", true), "impersonation");
    assert.equal(category("a.d.m.i.n", true), "impersonation");
    assert.equal(category("공식딜러", true), "impersonation");
    assert.equal(category("관리자님 질문 있어요"), null);
    assert.equal(category("리버샤크", true), null);
  });
});
