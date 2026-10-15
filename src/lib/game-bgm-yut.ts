/**
 * 윷놀이 BGM: 명절 잔치집 + 레트로 오락실 — 빠르고 신나는 8비트 칩튠(브라우저에서 바로 연주 · 파일 없음).
 * 152 BPM · 16분음표 128칸(8마디) 반복.
 * 사각파 리드(도레미솔라 신나는 가락) · 펄스 아르페지오 · 삼각파 베이스(통통 옥타브) · 잡음 드럼(쿵 · 짝 · 칙) + 마디 끝 꽹과리 한 번.
 */
export const YUT_STEP = 60 / 152 / 4;
export const YUT_STEPS = 128;

const F: Record<string, number> = {
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
};
// 가락(8분음표 8칸 × 8마디 · "~" 이어짐 · "-" 쉼)
const MELODY = [
  "C5 E5 G5 E5 A5 G5 E5 D5",
  "C5 ~ D5 E5 G5 ~ E5 ~",
  "A5 G5 A5 C6 A5 G5 E5 G5",
  "A5 ~ ~ - G5 A5 C6 D6",
  "E6 D6 C6 A5 C6 ~ A5 G5",
  "E5 G5 A5 G5 E5 D5 C5 D5",
  "E5 ~ G5 E5 D5 C5 D5 E5",
  "C5 ~ ~ ~ G4 A4 C5 -",
]
  .join(" ")
  .split(/\s+/);
// 마디 밑음(베이스) · 화음(아르페지오)
const ROOT = [130.81, 130.81, 174.61, 196.0, 220.0, 174.61, 196.0, 130.81];
const CHORD: number[][] = [
  [523.25, 659.25, 783.99],
  [523.25, 659.25, 783.99],
  [523.25, 698.46, 880.0],
  [587.33, 783.99, 987.77],
  [523.25, 659.25, 880.0],
  [523.25, 698.46, 880.0],
  [587.33, 783.99, 987.77],
  [523.25, 659.25, 783.99],
];

function osc(a: AudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, at: number, len: number, vol: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + len);
  g.gain.setValueAtTime(vol, at);
  g.gain.setValueAtTime(vol, at + len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.02);
}

function noise(a: AudioContext, out: AudioNode, at: number, len: number, freq: number, vol: number, type: BiquadFilterType = "bandpass") {
  const n = Math.max(1, Math.floor(a.sampleRate * len));
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  // 8비트 느낌: 값을 몇 단계로만
  for (let i = 0; i < n; i += 1) d[i] = Math.round((Math.random() * 2 - 1) * 4) / 4 * Math.pow(1 - i / n, 2);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

export function playYutStep(a: AudioContext, master: AudioNode, lead: AudioNode, step: number, at: number) {
  const bar = Math.floor(step / 16);
  const pos = step % 16;
  // 드럼: 쿵(1 · 3박 + 엇박) · 짝(2 · 4박) · 칙(8분)
  if (pos === 0 || pos === 8 || pos === 10) osc(a, master, "sine", 150, 45, at, 0.16, 0.7);
  if (pos === 4 || pos === 12) noise(a, master, at, 0.12, 1800, 0.45);
  if (pos % 2 === 0) noise(a, master, at, 0.03, 8000, 0.16, "highpass");
  // 마디 끝 꽹과리 한 번(잔치 느낌)
  if (pos === 14 && bar % 2 === 1) {
    osc(a, master, "square", 2150, 2050, at, 0.1, 0.03);
    osc(a, master, "square", 3170, 3050, at, 0.1, 0.022);
  }
  // 베이스: 8분마다 밑음 ↔ 옥타브 통통
  if (pos % 2 === 0) {
    const r = ROOT[bar];
    osc(a, master, "triangle", pos % 4 === 0 ? r : r * 2, pos % 4 === 0 ? r : r * 2, at, YUT_STEP * 1.8, 0.3);
  }
  // 아르페지오: 16분마다 화음 오르내림(작게)
  const ch = CHORD[bar];
  osc(a, master, "square", ch[pos % 3] / 2, ch[pos % 3] / 2, at, YUT_STEP * 0.9, 0.018);
  // 가락: 8분 칸
  if (pos % 2 === 0) {
    const idx = bar * 8 + pos / 2;
    const m = MELODY[idx];
    if (m && F[m]) {
      let len = 1;
      while (MELODY[idx + len] === "~") len += 1;
      osc(a, lead, "square", F[m], F[m], at, YUT_STEP * 2 * len * 0.9, 0.07);
    }
  }
}
