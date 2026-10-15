/** 오목 소리(브라우저 전용): 돌 놓는 「딱」 · 이김 · 짐. 끄기는 화면에서(localStorage) */
let ctx: AudioContext | null = null;
const SOUND_KEY = "poka-omok-sound";

export function omokSoundOn() {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}
export function setOmokSound(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* 저장 못 해도 이번만 */
  }
}

/** 게임 소리 · BGM이 같이 쓰는 오디오 */
export function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 바둑돌 「딱」: 짧은 잡음 + 낮은 울림 */
export function stoneClick() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const noise = a.createBufferSource();
  noise.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = "bandpass";
  hp.frequency.value = 2400;
  const g = a.createGain();
  g.gain.value = 0.7;
  noise.connect(hp).connect(g).connect(a.destination);
  noise.start(t);
  const osc = a.createOscillator();
  const og = a.createGain();
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  og.gain.setValueAtTime(0.25, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(og).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.11);
}

/** 이김(올라가는 세 음) · 짐(내려가는 두 음) */
export function resultSound(win: boolean) {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const notes = win ? [523, 659, 784, 1046] : [392, 311];
  notes.forEach((f, i) => {
    const t = a.currentTime + i * 0.13;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.32);
  });
}

function tone(
  a: AudioContext,
  freq: number,
  at: number,
  len: number,
  type: OscillatorType,
  vol: number,
  slideTo?: number,
) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + len);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + len);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + len + 0.02);
}

function noiseHit(
  a: AudioContext,
  at: number,
  len: number,
  freq: number,
  vol: number,
) {
  const n = Math.floor(a.sampleRate * len);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(at);
}

/** READY: 띵-띵 */
export function readySound() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  tone(a, 660, t, 0.18, "square", 0.08);
  tone(a, 880, t + 0.16, 0.25, "square", 0.08);
}

/** FIGHT!: 북 + 징 */
export function fightSound() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  tone(a, 140, t, 0.35, "sine", 0.5, 50);
  noiseHit(a, t, 0.25, 900, 0.5);
  tone(a, 196, t + 0.05, 1.4, "triangle", 0.12);
  tone(a, 293.7, t + 0.05, 1.4, "triangle", 0.08);
}

/** 컷인(요괴 등장): 휙 */
export function cutInSound() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  noiseHit(a, t, 0.3, 2500, 0.35);
  tone(a, 300, t, 0.3, "sawtooth", 0.05, 1200);
}

/** 남은 시간 경고: 삑 */
export function warnBeep() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  tone(a, 1320, a.currentTime, 0.08, "square", 0.06);
}

/** 손님 착석 · 방 입장: 딩동 */
export function bellSound() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  tone(a, 988, t, 0.3, "sine", 0.15);
  tone(a, 784, t + 0.22, 0.45, "sine", 0.15);
}

/** 관전자 응원: 퐁 */
export function cheerSound() {
  if (!omokSoundOn()) return;
  const a = audio();
  if (!a) return;
  tone(a, 880, a.currentTime, 0.12, "sine", 0.12, 1320);
}
