/**
 * 윷놀이 BGM: 신나는 풍물놀이(브라우저에서 바로 만들어 연주 · 파일 없음).
 * 자진모리 느낌 12/8(한 마디 12칸 · 셋잇단) × 8마디를 반복.
 * 꽹과리(갠지갱) · 장구(덩 · 쿵 · 덕) · 북(둥) · 징(마디 첫 박에 웅~) + 태평소 가락(도레미솔라 · 떨림).
 */
export const PUNGMUL_STEP = 60 / 128 / 3;
export const PUNGMUL_STEPS = 96;

const F: Record<string, number> = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
};
// 태평소 가락(12칸 × 8마디, "~" 이어짐 · "-" 쉼)
const MELODY = [
  "A5 ~ ~ G5 ~ A5 C6 ~ ~ A5 ~ G5",
  "E5 ~ ~ G5 ~ E5 D5 ~ ~ ~ ~ -",
  "C5 ~ D5 E5 ~ G5 A5 ~ ~ G5 ~ E5",
  "G5 ~ ~ ~ ~ ~ - - - E5 G5 A5",
  "C6 ~ ~ A5 ~ C6 D6 ~ ~ C6 ~ A5",
  "G5 ~ A5 G5 ~ E5 D5 ~ ~ E5 ~ ~",
  "G5 ~ E5 D5 ~ C5 D5 ~ E5 G5 ~ A5",
  "C6 ~ ~ ~ ~ ~ - - - - - -",
]
  .join(" ")
  .split(/\s+/);

// 한 마디 장단(12칸)
const JANGGU: Record<number, "deong" | "kung" | "deok"> = { 0: "deong", 2: "deok", 3: "kung", 5: "deok", 6: "deong", 8: "deok", 9: "kung", 11: "deok" };
const KKWAENG: Record<number, number> = { 0: 1, 1: 0.45, 2: 0.7, 3: 0.8, 5: 0.6, 6: 1, 7: 0.45, 8: 0.7, 9: 0.8, 10: 0.5, 11: 0.6 };
const BUK = [0, 3, 6, 9];

function noise(a: AudioContext, out: AudioNode, at: number, len: number, freq: number, q: number, vol: number) {
  const n = Math.max(1, Math.floor(a.sampleRate * len));
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

function osc(a: AudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, at: number, len: number, vol: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + len);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.05);
}

/** 꽹과리: 쇳소리(높은 두 음이 부딪침) + 짧은 잡음 */
function kkwaenggwari(a: AudioContext, out: AudioNode, at: number, v: number) {
  const len = v > 0.6 ? 0.16 : 0.07;
  osc(a, out, "square", 2150, 2050, at, len, 0.035 * v);
  osc(a, out, "square", 3170, 3050, at, len, 0.025 * v);
  noise(a, out, at, len * 0.8, 5200, 1.2, 0.22 * v);
}

/** 징: 낮고 길게 웅~(살짝 떨림) */
function jing(a: AudioContext, out: AudioNode, at: number) {
  osc(a, out, "sine", 112, 106, at, 2.4, 0.22);
  osc(a, out, "sine", 224, 214, at, 1.8, 0.09);
  osc(a, out, "triangle", 337, 330, at, 1.2, 0.04);
}

function janggu(a: AudioContext, out: AudioNode, at: number, kind: "deong" | "kung" | "deok") {
  if (kind !== "deok") osc(a, out, "sine", 170, 70, at, 0.22, kind === "deong" ? 0.5 : 0.38);
  if (kind !== "kung") noise(a, out, at, 0.07, 2300, 2, kind === "deong" ? 0.35 : 0.3);
}

/** 태평소: 코맹맹이 리드(톱니파 → 대역 필터) + 떨림 */
function taepyeongso(a: AudioContext, out: AudioNode, freq: number, at: number, len: number) {
  const o = a.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(freq * 0.97, at);
  o.frequency.linearRampToValueAtTime(freq, at + 0.05);
  const lfo = a.createOscillator();
  const lg = a.createGain();
  lfo.frequency.value = 6.5;
  lg.gain.value = freq * 0.012;
  lfo.connect(lg).connect(o.frequency);
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 1.4;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.11, at + 0.03);
  g.gain.setValueAtTime(0.1, at + Math.max(0.04, len - 0.06));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(bp).connect(g).connect(out);
  o.start(at);
  lfo.start(at);
  o.stop(at + len + 0.05);
  lfo.stop(at + len + 0.05);
}

export function playPungmulStep(a: AudioContext, master: AudioNode, lead: AudioNode, step: number, at: number) {
  const bar = Math.floor(step / 12);
  const pos = step % 12;
  if (pos === 0 && bar % 2 === 0) jing(a, master, at);
  const jg = JANGGU[pos];
  if (jg) janggu(a, master, at, jg);
  if (BUK.includes(pos)) osc(a, master, "sine", 95, 45, at, 0.3, pos === 0 ? 0.6 : 0.42);
  const k = KKWAENG[pos];
  if (k) kkwaenggwari(a, master, at, k);
  const m = MELODY[step];
  if (m && F[m]) {
    let len = 1;
    while (MELODY[step + len] === "~") len += 1;
    taepyeongso(a, lead, F[m], at, PUNGMUL_STEP * len * 0.95);
  }
}
