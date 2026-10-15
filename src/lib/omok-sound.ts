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

function audio() {
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
