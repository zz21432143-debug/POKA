export type MinRaiseQuestion = {
  id: string;
  prompt: string;
  detail: string;
  answer: number;
};

/** NL홀덤. 직전 풀 레이즈 폭만큼 더 올린 총액이 미니멈 레이즈입니다. */
export function minRaiseTo(currentBet: number, lastFullRaiseSize: number) {
  return currentBet + lastFullRaiseSize;
}

export function makeMinRaiseQuestion(): MinRaiseQuestion {
  const id = `raise-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const roll = Math.random();

  if (roll < 0.28) {
    const bb = [50, 100, 200, 500][Math.floor(Math.random() * 4)]!;
    return {
      id,
      prompt: `블라인드 ${bb / 2}/${bb}. 아직 레이즈가 없습니다.`,
      detail: "UTG 오픈 미니멈(총액)은?",
      answer: minRaiseTo(bb, bb),
    };
  }

  if (roll < 0.55) {
    const bb = [100, 200][Math.floor(Math.random() * 2)]!;
    const openTo = bb * (2 + Math.floor(Math.random() * 4));
    const raiseSize = openTo - bb;
    return {
      id,
      prompt: `블라인드 ${bb / 2}/${bb}. UTG가 ${openTo.toLocaleString()}으로 오픈했습니다.`,
      detail: "다음 자리의 미니멈 3벳(총액)은?",
      answer: minRaiseTo(openTo, raiseSize),
    };
  }

  if (roll < 0.8) {
    const bet = [200, 300, 400, 500, 800][Math.floor(Math.random() * 5)]!;
    return {
      id,
      prompt: `플랍. 첫 벳이 ${bet.toLocaleString()}입니다.`,
      detail: "미니멈 레이즈(총액)는?",
      answer: minRaiseTo(bet, bet),
    };
  }

  const bet = [200, 400, 500][Math.floor(Math.random() * 3)]!;
  const raiseTo = bet * 2 + [100, 200, 300][Math.floor(Math.random() * 3)]!;
  const raiseSize = raiseTo - bet;
  return {
    id,
    prompt: `턴. 벳 ${bet.toLocaleString()} 뒤에 한 명이 ${raiseTo.toLocaleString()}까지 레이즈했습니다.`,
    detail: "다음 미니멈 리레이즈(총액)는?",
    answer: minRaiseTo(raiseTo, raiseSize),
  };
}
