import { audio } from "@/lib/omok-sound";
import { PUNGMUL_STEP, PUNGMUL_STEPS, playPungmulStep } from "@/lib/game-bgm-pungmul";

/** 곡: omok = 계면조 요괴 가락 · yut = 신나는 풍물놀이 */
export type BgmTrack = "omok" | "yut";

/**
 * 요괴 게임방 BGM(브라우저에서 바로 만들어 연주 · 파일 없음).
 * 계면조 느낌 5음(레 · 파 · 솔 · 라 · 도) 가락 + 장구(덩 · 기덕) + 낮은 지속음 + 메아리 — 으스스하지만 신나는 오락실 국악풍.
 * 8마디(8분음표 64칸)를 계속 반복. 끄면 localStorage에 기억.
 */
const KEY = "poka-game-bgm";
const BPM = 96;
const EIGHTH = 60 / BPM / 2;

export function bgmOn() {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setBgmOn(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* 이번만 */
  }
}

const N: Record<string, number> = {
  D2: 73.42,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  D3: 146.83,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
};
// 가락(8분음표 64칸, "-"는 쉼 · "~"는 앞 음 이어짐)
const MELODY = (
  "D5 - A4 - C5 D5 F5 - | D5 ~ C5 A4 G4 - A4 - | F4 - G4 A4 C5 - A4 G4 | A4 ~ ~ - - - D4 F4 |" +
  "G4 - A4 - C5 - D5 F5 | G5 ~ F5 D5 C5 - D5 - | A4 - C5 - A4 G4 F4 G4 | D4 ~ ~ ~ - - - - |"
)
  .replace(/\|/g, "")
  .trim()
  .split(/\s+/);
// 베이스: 마디마다 밑음
const BASS = ["D2", "D2", "F2", "A2", "G2", "C3", "A2", "D2"];

type Bgm = {
  track: BgmTrack;
  timer: number;
  master: GainNode;
  drone: OscillatorNode[];
  next: number;
  step: number;
};
let bgm: Bgm | null = null;

function note(
  a: AudioContext,
  out: AudioNode,
  freq: number,
  at: number,
  len: number,
  type: OscillatorType,
  vol: number,
  vibrato = 0,
) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (vibrato) {
    const lfo = a.createOscillator();
    const lg = a.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(at);
    lfo.stop(at + len + 0.05);
  }
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.05);
}

function drum(
  a: AudioContext,
  out: AudioNode,
  at: number,
  kind: "deong" | "deok" | "gi",
) {
  if (kind === "deong") {
    // 덩: 낮게 울리는 북
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(120, at);
    o.frequency.exponentialRampToValueAtTime(55, at + 0.25);
    g.gain.setValueAtTime(0.55, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.32);
    return;
  }
  // 덕 · 기: 채편(짧은 잡음)
  const len = kind === "deok" ? 0.09 : 0.04;
  const n = Math.floor(a.sampleRate * len);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = kind === "deok" ? 1800 : 3500;
  const g = a.createGain();
  g.gain.value = kind === "deok" ? 0.35 : 0.15;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

function playStep(
  a: AudioContext,
  b: Bgm,
  step: number,
  at: number,
  lead: AudioNode,
) {
  const bar = Math.floor(step / 8);
  const pos = step % 8;
  // 장구: 덩(1박) · 기덕(2 · 4박) · 기(엇박)
  if (pos === 0 || pos === 5) drum(a, b.master, at, "deong");
  if (pos === 2 || pos === 6) drum(a, b.master, at, "deok");
  if (pos === 3 || pos === 7) drum(a, b.master, at, "gi");
  // 베이스: 1 · 3박 + 옥타브
  const root = N[BASS[bar]];
  if (pos === 0) note(a, b.master, root, at, EIGHTH * 3, "triangle", 0.32);
  if (pos === 4)
    note(a, b.master, root * 2, at, EIGHTH * 1.6, "triangle", 0.18);
  if (pos === 6)
    note(a, b.master, root * 1.5, at, EIGHTH * 1.6, "triangle", 0.14);
  // 가락
  const m = MELODY[step];
  if (m && m !== "-" && m !== "~" && N[m]) {
    let len = 1;
    while (MELODY[step + len] === "~") len += 1;
    note(a, lead, N[m], at, EIGHTH * len * 0.95, "square", 0.08, 4);
  }
}

export function startBgm(track: BgmTrack = "omok") {
  if (bgm?.track === track) return;
  if (bgm) stopBgm();
  const a = audio();
  if (!a) return;
  const master = a.createGain();
  master.gain.value = 0.0001;
  master.gain.exponentialRampToValueAtTime(0.16, a.currentTime + 1.2);
  master.connect(a.destination);
  // 가락 메아리
  const lead = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  const delay = a.createDelay();
  delay.delayTime.value = track === "yut" ? PUNGMUL_STEP * 3 : EIGHTH * 3;
  const fb = a.createGain();
  fb.gain.value = track === "yut" ? 0.15 : 0.28;
  lead.connect(lp).connect(master);
  lp.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(master);
  // 낮은 지속음(레 · 라)
  const pad = a.createGain();
  pad.gain.value = 0.05;
  const padLp = a.createBiquadFilter();
  padLp.type = "lowpass";
  padLp.frequency.value = 500;
  pad.connect(padLp).connect(master);
  const drone = (track === "omok" ? [N.D3, N.A3, N.D3 * 1.003] : []).map((f) => {
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.connect(pad);
    o.start();
    return o;
  });
  const b: Bgm = {
    track,
    timer: 0,
    master,
    drone,
    next: a.currentTime + 0.15,
    step: 0,
  };
  b.timer = window.setInterval(() => {
    while (b.next < a.currentTime + 0.15) {
      if (track === "yut") {
        playPungmulStep(a, b.master, lead, b.step, b.next);
        b.next += PUNGMUL_STEP;
        b.step = (b.step + 1) % PUNGMUL_STEPS;
      } else {
        playStep(a, b, b.step, b.next, lead);
        b.next += EIGHTH;
        b.step = (b.step + 1) % 64;
      }
    }
  }, 30);
  bgm = b;
}

export function stopBgm() {
  if (!bgm) return;
  const a = audio();
  const b = bgm;
  bgm = null;
  window.clearInterval(b.timer);
  if (a) {
    b.master.gain.cancelScheduledValues(a.currentTime);
    b.master.gain.setValueAtTime(
      Math.max(0.0001, b.master.gain.value),
      a.currentTime,
    );
    b.master.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.4);
  }
  window.setTimeout(() => {
    b.drone.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* 이미 멈춤 */
      }
    });
    b.master.disconnect();
  }, 500);
}

export const bgmPlaying = () => Boolean(bgm);
