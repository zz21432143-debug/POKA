/**
 * 게임 현황판 소리(브라우저에서만). 한 번 누른 뒤(unlockBoardSound)부터 납니다 — 브라우저가 처음엔 소리를 막아서.
 * - 레벨 끝 5초 전: 매초 "띡"(마지막 1초는 높게)
 * - 블라인드 업: 크게 올라가는 팡파르 + 영어 음성 "Blinds up. Level 5. Small blind 500, big blind 1,000"
 * - 휴식 시작: 내려가는 두 음 + "Break time"
 */

let audio: AudioContext | null = null;
let out: AudioNode | null = null;

function context() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
    // 작은 TV 스피커에서도 또렷하게: 압축기로 크게
    const comp = audio.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    const master = audio.createGain();
    master.gain.value = 1;
    comp.connect(master).connect(audio.destination);
    out = comp;
  }
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** 버튼을 누를 때 불러 소리를 켭니다(브라우저 자동 재생 막힘 풀기) */
export function unlockBoardSound() {
  context();
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    /* 음성이 없으면 소리만 */
  }
}

function tone(freq: number, at: number, length: number, volume = 0.7, type: OscillatorType = "square") {
  const ctx = context();
  if (!ctx || !out) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.setValueAtTime(volume, start + length * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

function say(text: string, delay = 0) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    window.setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.95;
      u.volume = 1;
      synth.cancel();
      synth.speak(u);
    }, delay);
  } catch {
    /* 음성이 없으면 소리만 */
  }
}

/** 레벨 끝 몇 초 전 "띡"(1초 남았을 때는 높게) */
export function countdownTick(secondsLeft: number) {
  // 부드러운 사인파(귀가 덜 아프게)
  const high = secondsLeft <= 1;
  tone(high ? 988 : 784, 0, high ? 0.3 : 0.14, high ? 0.5 : 0.35, "sine");
}

/** 블라인드 업: 올라가는 팡파르(도-미-솔-높은 도) + 음성 */
export function blindUpSound(level: number, sb: number, bb: number) {
  // 예전 사각파 팡파르는 귀가 아파서 → 부드러운 「딩-동」 차임 두 음
  tone(659, 0, 0.45, 0.45, "sine");
  tone(880, 0.32, 0.7, 0.45, "sine");
  say(`Blinds up. Level ${level}. Small blind ${sb.toLocaleString("en-US")}, big blind ${bb.toLocaleString("en-US")}.`, 1400);
}

/** 휴식 시작: 내려가는 두 음 + 음성 */
export function breakSound(minutes: number) {
  tone(784, 0, 0.35, 0.7, "triangle");
  tone(523, 0.4, 0.6, 0.7, "triangle");
  say(`Break time. ${minutes} minutes.`, 1100);
}

/** 로테이션 소리 크기: 1 작게 · 2 보통 · 3 크게(크게는 소리가 더 또렷한 파형) */
export type RotationVolume = 1 | 2 | 3;
const VOL: Record<RotationVolume, { gain: number; wave: OscillatorType }> = {
  1: { gain: 0.3, wave: "triangle" },
  2: { gain: 0.7, wave: "triangle" },
  3: { gain: 1, wave: "square" },
};

/** 로테이션 교대 시각: 딩-동 두 번(음성 없이, 매장 소음 속에서도 들리게) */
export function rotationSwapSound(volume: RotationVolume = 2) {
  const { gain, wave } = VOL[volume];
  tone(988, 0, 0.35, gain, wave);
  tone(784, 0.38, 0.55, gain, wave);
  tone(988, 1.1, 0.35, gain, wave);
  tone(784, 1.48, 0.7, gain, wave);
}

/** 로테이션 교대 1분 전: 짧은 "띵" 한 번 */
export function rotationSoonSound(volume: RotationVolume = 2) {
  const { gain, wave } = VOL[volume];
  tone(1175, 0, 0.25, gain * 0.8, wave);
}

/** 파이널 테이블 탈락: 낮게 「쿵」 두 번 */
export function bustSound() {
  tone(196, 0, 0.28, 0.6, "sine");
  tone(147, 0.22, 0.5, 0.6, "sine");
}

/** 우승: 팡파르 + 음성 */
export function championSound() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.16, 0.5, "triangle"));
  tone(1319, 0.6, 1.1, 0.5, "sine");
  tone(1047, 0.6, 1.1, 0.35, "sine");
  say("Congratulations! We have a champion.", 1600);
}
