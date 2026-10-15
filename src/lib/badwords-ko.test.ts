import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nicknameError } from "./nickname";
import { BASE_WORDS, findProfanity } from "./profanity";

describe("오픈소스 한국어 욕설 목록", () => {
  it("닉네임: 우회 · 변형 욕설을 막음", () => {
    for (const n of ["존나잘생김", "개같은놈", "씨_발러", "개1새끼", "미친넘", "또라이딜러", "니미럴", "쌍년", "좆밥이", "tlqkf", "병1신", "십창", "엠생", "호로새끼", "씹치남", "새77ㅣ"])
      assert.ok(nicknameError(n), `${n}은 막혀야 함`);
  });
  it("닉네임: 평범한 닉네임은 통과", () => {
    for (const n of ["HO호", "바른닉네임5021", "딜러민수", "시바견러버", "노무사김씨", "앰버", "홀덤조아", "강남딜러", "개나리", "새벽딜러", "쓰레기통", "Ace_7", "딸기우유"])
      assert.equal(nicknameError(n), null, `${n}은 통과해야 함`);
  });
  it("닉네임: 성적 표현은 들어가기만 해도 막음(우회 포함)", () => {
    for (const n of ["보지", "보지왕", "소음순", "대음순", "자지", "보1지", "보_지", "보x지", "섹시딜러", "젖소", "딸딸이", "자위왕", "정액", "펠라", "노콘", "따먹자", "pussy", "dick", "꼴린다", "음경", "클리토리스", "강간", "몸캠", "boobs", "s3xy", "야동왕"])
      assert.ok(nicknameError(n), `${n}은 막혀야 함`);
  });
  it("닉네임: 비슷하지만 정상인 말은 통과", () => {
    for (const n of ["클리어딜러", "청양고추", "처녀자리", "젖은낙엽", "보리차", "딸기우유", "정의의딜러", "자이언트", "야스오장인", "구질구질"])
      assert.equal(nicknameError(n), null, `${n}은 통과해야 함`);
  });
  it("글: 성적 표현(명확한 말)은 막고 「보지 마세요」는 통과", () => {
    for (const p of ["소음순 사진", "딸딸이 치고", "질싸 영상"]) assert.ok(findProfanity(p), `${p}은 막혀야 함`);
    for (const p of ["이건 보지 마세요", "오늘은 자지 마", "클리어 했어요", "몸캠 피싱 조심하세요"]) assert.equal(findProfanity(p), null, `${p}은 통과해야 함`);
  });
  it("글: 일상 표현은 안 막고 욕설은 막음", () => {
    for (const p of ["서랍을 뒤졌는데 없었어요", "오늘 존맛 국밥", "걸레로 테이블 닦기", "쓰레기 다 버렸어요", "강아지 새끼라 귀여워", "시바견 키워요", "십팔번 노래", "노무사 상담", "보라니까", "졸라 피곤", "도라이버로 조이세요"])
      assert.equal(findProfanity(p), null, `${p}은 통과해야 함`);
    for (const p of ["씨발 뭐야", "니미럴", "호로새끼야", "좆까", "병1신", "개념빠가"]) assert.ok(findProfanity(p), `${p}은 막혀야 함`);
  });
  it("기본 금지어에 중복 없이 합쳐짐", () => {
    assert.equal(new Set(BASE_WORDS.abuse).size, BASE_WORDS.abuse.length);
    assert.ok(BASE_WORDS.abuse.includes("니미럴"));
  });
});
