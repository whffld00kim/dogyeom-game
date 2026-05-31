// Web Audio 로 직접 합성하는 배경음악 (외부 파일/저작권 없음, 완전 오프라인).
// 밝은 다장조 동요풍 루프 + 부드러운 베이스.

const GAINS = [0, 0.1, 0.26, 0.5]; // 끔/작게/보통/크게 → 마스터 볼륨

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let level = 2;
let timerId: number | null = null;
let step = 0;
let nextTime = 0;

const TEMPO = 112;
const STEP = 60 / TEMPO / 2; // 8분음표 길이(초)

const F: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
};

// 멜로디(8분음표 32스텝 = 4마디 루프)
const MEL: (string | null)[] = [
  'G4', 'E4', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4',
  'F4', 'D4', 'C4', 'D4', 'F4', 'A4', 'G4', null,
  'E4', 'G4', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4',
  'F4', 'E4', 'D4', 'E4', 'C4', null, null, null,
];
// 베이스 (I I IV V vi IV V I)
const BASS: (string | null)[] = [
  'C3', null, null, null, 'C3', null, null, null,
  'F3', null, null, null, 'G3', null, null, null,
  'A3', null, null, null, 'F3', null, null, null,
  'G3', null, null, null, 'C3', null, null, null,
];

function ensure() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = GAINS[level];
    master.connect(ctx.destination);
  } catch (e) {
    console.warn('[music] AudioContext init 실패:', e);
  }
}

function note(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function scheduler() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.12) {
    const m = MEL[step];
    if (m) note(F[m], nextTime, STEP * 0.9, 'triangle', 0.6);
    const b = BASS[step];
    if (b) note(F[b], nextTime, STEP * 1.9, 'sine', 0.55);
    nextTime += STEP;
    step = (step + 1) % MEL.length;
  }
}

/** 첫 사용자 입력(제스처) 후 호출되어야 소리가 남 (브라우저 정책). 반복 호출 안전. */
export function startMusic() {
  ensure();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (timerId != null) return;
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  timerId = window.setInterval(scheduler, 25);
}

export function setLevel(l: number) {
  level = Math.max(0, Math.min(3, Math.round(l) || 0));
  if (ctx && master) master.gain.setTargetAtTime(GAINS[level], ctx.currentTime, 0.05);
}

export function getLevel() {
  return level;
}

function sfxReady(): boolean {
  ensure();
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

/** 정답: 밝게 상승하는 차임 */
export function playCorrect() {
  if (!sfxReady() || !ctx) return;
  const t = ctx.currentTime;
  note(F.C5, t, 0.12, 'triangle', 0.6);
  note(F.E5, t + 0.08, 0.12, 'triangle', 0.6);
  note(F.G5, t + 0.16, 0.2, 'triangle', 0.65);
}

/** 오답: 부드럽게 하강하는 짧은 소리(무섭지 않게) */
export function playWrong() {
  if (!sfxReady() || !ctx) return;
  const t = ctx.currentTime;
  note(F.E4, t, 0.14, 'sine', 0.5);
  note(F.B3, t + 0.12, 0.18, 'sine', 0.5);
}

/** 포획: 짧은 승리 팡파레 */
export function playCatch() {
  if (!sfxReady() || !ctx) return;
  const t = ctx.currentTime;
  note(F.C5, t, 0.12, 'triangle', 0.6);
  note(F.E5, t + 0.1, 0.12, 'triangle', 0.6);
  note(F.G5, t + 0.2, 0.12, 'triangle', 0.6);
  note(F.C6, t + 0.3, 0.34, 'triangle', 0.7);
  note(F.E5, t + 0.3, 0.34, 'triangle', 0.4);
}
