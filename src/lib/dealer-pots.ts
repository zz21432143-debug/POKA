export type SeatStack = { seat: string; stack: number };

export type PotLine = {
  name: string;
  amount: number;
  seats: string[];
};

/** 전원 올인일 때 메인팟·사이드팟. 한 명만 남은 초과 칩은 팟이 아니라 반환입니다. */
export function computeSidePots(players: SeatStack[]): PotLine[] {
  const alive = players.filter((row) => row.stack > 0).sort((a, b) => a.stack - b.stack);
  const pots: PotLine[] = [];
  let prev = 0;
  const levels = [...new Set(alive.map((row) => row.stack))];
  for (const level of levels) {
    const delta = level - prev;
    if (delta <= 0) continue;
    const seats = alive.filter((row) => row.stack >= level).map((row) => row.seat);
    if (seats.length < 2) break;
    pots.push({
      name: pots.length === 0 ? "메인팟" : `사이드팟 ${pots.length}`,
      amount: delta * seats.length,
      seats,
    });
    prev = level;
  }
  return pots;
}

const SEATS = ["UTG", "MP", "CO", "BTN", "SB", "BB"] as const;
const STACKS = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000];

export type SidePotQuestion = {
  id: string;
  players: SeatStack[];
  pots: PotLine[];
};

export function makeSidePotQuestion(): SidePotQuestion {
  const count = Math.random() > 0.45 ? 4 : 3;
  const shuffledSeats = [...SEATS].sort(() => Math.random() - 0.5);
  const shuffledStacks = [...STACKS].sort(() => Math.random() - 0.5);
  const players: SeatStack[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let stack = shuffledStacks[i] ?? 400 * (i + 1);
    while (used.has(stack)) stack += 100;
    used.add(stack);
    players.push({ seat: shuffledSeats[i] ?? `P${i + 1}`, stack });
  }
  return {
    id: `pot-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    players,
    pots: computeSidePots(players),
  };
}

export function gradeSidePot(pots: PotLine[], answers: number[]): boolean {
  return pots.length > 0 && pots.every((pot, index) => Number(answers[index]) === pot.amount);
}
