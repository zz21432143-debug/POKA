/**
 * 싯드로우: 진출자를 테이블에 나눌 때 테이블마다 칩 합계·평균이 최대한 비슷해지게 배정하고,
 * 테이블 안 좌석 번호는 완전 무작위로 정합니다.
 *
 * 1) 인원 균등: 테이블별 인원 차이는 최대 1명(어느 테이블이 1명 더 받는지는 무작위)
 * 2) 그리디: 칩 많은 순(같으면 무작위)으로, 자리가 남은 테이블 중 "칩 합계 ÷ 정원"이 가장 작은 곳에 넣기
 * 3) 다듬기: 서로 다른 테이블의 두 사람을 무작위로 바꿔 보며 테이블 평균 칩 차이가 줄면 채택(같은 인원 유지)
 *    인원이 9명·10명처럼 다르면 합계가 아니라 1인 평균을 맞춥니다(합계를 맞추면 평균이 10%가량 벌어짐).
 * 4) 좌석: 테이블마다 좌석 번호(1~좌석 수)를 무작위로 뽑아 배정
 */

export type DrawPlayer = { name: string; chips: number };
export type SeatedPlayer = DrawPlayer & { seat: number };
export type DrawTable = { table: number; players: SeatedPlayer[]; total: number; average: number };
export type DrawResult = {
  tables: DrawTable[];
  /** 테이블 평균 칩의 최대-최소 차이 */
  averageSpread: number;
  /** 테이블 칩 합계의 최대-최소 차이 */
  totalSpread: number;
  overallAverage: number;
};

export type Random = () => number;

function shuffle<T>(list: T[], random: Random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "홍길동 125,000" / "홍길동,125000" / "홍길동\t125000" / CSV(이름,칩) 한 줄씩. 머리글·빈 줄은 건너뜁니다. */
export function parsePlayers(text: string): { players: DrawPlayer[]; errors: string[] } {
  const players: DrawPlayer[] = [];
  const errors: string[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    // 마지막 숫자 덩어리를 칩으로(쉼표·점 천단위 허용), 앞부분을 이름으로
    const match = /^(.*?)[\s,;\t]+["']?([\d][\d,.\s]*)["']?\s*$/.exec(line);
    if (!match) {
      if (index === 0 && /(이름|name|칩|chip)/i.test(line)) return;
      errors.push(`${index + 1}번째 줄: 칩 수를 찾지 못했습니다 (${line.slice(0, 30)})`);
      return;
    }
    const name = match[1].replace(/^["']|["']$/g, "").replace(/[,;\t]+$/, "").trim();
    const chips = Number(match[2].replace(/[,.\s]/g, ""));
    if (!name) {
      errors.push(`${index + 1}번째 줄: 이름이 없습니다`);
      return;
    }
    if (!Number.isFinite(chips) || chips <= 0) {
      errors.push(`${index + 1}번째 줄: 칩 수가 올바르지 않습니다`);
      return;
    }
    players.push({ name, chips });
  });
  return { players, errors };
}

function spread(values: number[]) {
  return values.length ? Math.max(...values) - Math.min(...values) : 0;
}

export function drawSeats(
  players: DrawPlayer[],
  options: { tableCount: number; seatsPerTable: number; firstTable?: number; iterations?: number; random?: Random },
): DrawResult {
  const random = options.random ?? Math.random;
  const tableCount = Math.max(1, Math.floor(options.tableCount));
  const seatsPerTable = Math.max(1, Math.floor(options.seatsPerTable));
  if (players.length > tableCount * seatsPerTable) {
    throw new Error(`좌석이 모자랍니다: ${players.length}명 / ${tableCount}테이블 × ${seatsPerTable}석`);
  }

  // 1) 테이블별 인원(차이 최대 1명, 남는 1명씩은 무작위 테이블)
  const base = Math.floor(players.length / tableCount);
  const extra = players.length % tableCount;
  const extraTables = new Set(shuffle([...Array(tableCount).keys()], random).slice(0, extra));
  const capacity = [...Array(tableCount).keys()].map((t) => base + (extraTables.has(t) ? 1 : 0));

  // 2) 그리디: 칩 많은 순(같은 칩은 무작위 순서)
  const order = shuffle(players, random).sort((a, b) => b.chips - a.chips);
  const groups: DrawPlayer[][] = capacity.map(() => []);
  const totals = capacity.map(() => 0);
  for (const player of order) {
    let best = -1;
    for (let t = 0; t < tableCount; t += 1) {
      if (groups[t].length >= capacity[t]) continue;
      // 합계가 같으면 무작위로 고르기 위해 아주 작은 흔들림을 더합니다.
      if (best < 0 || totals[t] / capacity[t] + random() * 1e-9 < totals[best] / capacity[best]) best = t;
    }
    groups[best].push(player);
    totals[best] += player.chips;
  }

  // 3) 다듬기: 무작위 맞바꾸기로 합계 차이 줄이기
  const iterations = options.iterations ?? 4000;
  for (let i = 0; i < iterations && tableCount > 1; i += 1) {
    const a = Math.floor(random() * tableCount);
    let b = Math.floor(random() * (tableCount - 1));
    if (b >= a) b += 1;
    if (!groups[a].length || !groups[b].length) continue;
    const ia = Math.floor(random() * groups[a].length);
    const ib = Math.floor(random() * groups[b].length);
    const pa = groups[a][ia];
    const pb = groups[b][ib];
    const avg = (list: number[]) => list.map((total, t) => total / Math.max(1, capacity[t]));
    const before = spread(avg(totals));
    const nextTotals = [...totals];
    nextTotals[a] += pb.chips - pa.chips;
    nextTotals[b] += pa.chips - pb.chips;
    if (spread(avg(nextTotals)) <= before) {
      groups[a][ia] = pb;
      groups[b][ib] = pa;
      totals[a] = nextTotals[a];
      totals[b] = nextTotals[b];
    }
  }

  // 4) 좌석 번호 무작위, 테이블 번호는 무작위로 섞어서 붙입니다(어느 그룹이 1번 테이블인지도 무작위).
  const firstTable = options.firstTable ?? 1;
  const tableOrder = shuffle([...Array(tableCount).keys()], random);
  const tables: DrawTable[] = tableOrder.map((g, position) => {
    const seats = shuffle([...Array(seatsPerTable).keys()].map((n) => n + 1), random);
    const seated = groups[g]
      .map((player, i) => ({ ...player, seat: seats[i] }))
      .sort((x, y) => x.seat - y.seat);
    const total = totals[g];
    return {
      table: firstTable + position,
      players: seated,
      total,
      average: seated.length ? total / seated.length : 0,
    };
  });

  const overall = players.reduce((sum, p) => sum + p.chips, 0);
  return {
    tables,
    averageSpread: spread(tables.filter((t) => t.players.length).map((t) => t.average)),
    totalSpread: spread(tables.map((t) => t.total)),
    overallAverage: players.length ? overall / players.length : 0,
  };
}

/** 단톡방 공유용 텍스트 */
export function drawResultText(result: DrawResult, title = "싯드로우") {
  const lines = [`【 ${title} 】`, ""];
  for (const table of result.tables) {
    lines.push(`■ ${table.table}번 테이블 (${table.players.length}명 · 평균 ${Math.round(table.average).toLocaleString("ko-KR")})`);
    for (const player of table.players) {
      lines.push(`  ${String(player.seat).padStart(2, " ")}번 ${player.name} — ${player.chips.toLocaleString("ko-KR")}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
