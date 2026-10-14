// 전체 배경음악 + 배틀 음악 = 둘 다 mp3 파일. 효과음(SFX)만 Web Audio 합성. 완전 오프라인.

const GAINS = [0, 0.1, 0.26, 0.5]; // 끔/작게/보통/크게 → 마스터 볼륨

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let level = 2;

// 배틀 음악(파일) — master 게인에 연결(소리 설정 그대로 적용)
let bgWanted = false;
const BATTLE_URL = 'audio/battle.mp3'; // 문서 기준 상대경로(APK '/' · Pages '/repo/' 양쪽 정상 해석)
let battleBuf: AudioBuffer | null = null;
let battleSrc: AudioBufferSourceNode | null = null;
let battleLoading: Promise<void> | null = null; // 디코딩 중이면 그 약속(같은 파일을 두 번 받지 않고, 끝나길 기다릴 수 있게)
let battleWanted = false; // 지금 배틀 화면인가 — 디코딩이 늦게 끝나도 배틀을 이미 나갔으면 틀지 않는다

// 전체 배경음악(파일) — HTMLAudioElement → master(소리 설정 적용), 무한 루프. 배틀 중엔 일시정지.
const BGM_URL = 'audio/bgm.mp3';
let bgmEl: HTMLAudioElement | null = null;
let bgmGain: GainNode | null = null;

// 앱이 백그라운드(홈 버튼·뒤로로 종료·다른 앱 전환)면 true. 이 동안은 어떤 경로로도 소리를 다시 켜지 않는다.
// 전엔 이 처리가 없어 홈으로 나가도 BGM 이 계속 흘러나왔다 (2026-09-19)
let appHidden = false;

const F: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
};

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

function ensureBgm() {
  if (bgmEl || !ctx || !master) return;
  bgmEl = new Audio(BGM_URL);
  bgmEl.loop = true;
  bgmEl.preload = 'auto';
  try {
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.7; // 배틀(0.8) 대비 밸런스(마스터 볼륨은 setLevel이 별도 적용)
    const node = ctx.createMediaElementSource(bgmEl);
    node.connect(bgmGain);
    bgmGain.connect(master);
  } catch (e) {
    console.warn('[music] BGM 연결 실패:', e);
  }
}

/** 첫 사용자 입력(제스처) 후 호출되어야 소리가 남 (브라우저 정책). 반복 호출 안전. */
export function startMusic() {
  bgWanted = true;
  ensure();
  if (!ctx || appHidden) return;
  if (ctx.state === 'suspended') ctx.resume();
  loadBattle(); // 배틀 음악 미리 디코드(첫 배틀 무음 지연 방지)
  ensureBgm();
  if (bgmEl && !battleSrc) bgmEl.play().catch(() => {}); // 배틀 중이 아니면 전체 BGM 재생
}

// ── 합성 BGM 일시정지/재개 (배틀 음악과 겹치지 않게) ──
function pauseBg() {
  if (bgmEl) bgmEl.pause();
}
function resumeBg() {
  if (!bgWanted || !bgmEl || appHidden) return;
  if (ctx && ctx.state === 'suspended') ctx.resume();
  bgmEl.play().catch(() => {});
}

/** 배틀 음악 파일을 받아 디코딩. 이미 디코딩 중이면 그 약속을 돌려준다 (전엔 바로 끝난 약속을 돌려줘 첫 배틀이 무음이 됐다) */
function loadBattle(): Promise<void> {
  ensure();
  if (!ctx || battleBuf) return Promise.resolve();
  if (battleLoading) return battleLoading;
  const ac = ctx;
  battleLoading = (async () => {
    try {
      const res = await fetch(BATTLE_URL);
      const arr = await res.arrayBuffer();
      battleBuf = await ac.decodeAudioData(arr);
    } catch (e) {
      console.warn('[music] 배틀 음악 로드 실패:', e);
    } finally {
      battleLoading = null;
    }
  })();
  return battleLoading;
}

/** 배틀 음악(파일) 무한 재생 시작. 합성 BGM은 잠시 멈춤. 반복 호출 안전. */
export function startBattleMusic() {
  ensure();
  if (!ctx || !master) return;
  battleWanted = true;
  if (ctx.state === 'suspended' && !appHidden) ctx.resume();
  pauseBg();
  if (battleSrc) return; // 이미 재생 중
  const begin = () => {
    if (!battleWanted || !ctx || !master || !battleBuf || battleSrc) return; // 디코딩 중 배틀을 나갔으면 틀지 않는다(BGM 과 겹침 방지)
    const g = ctx.createGain();
    g.gain.value = 0.8; // 합성음 대비 밸런스(마스터 볼륨은 setLevel이 별도 적용)
    const src = ctx.createBufferSource();
    src.buffer = battleBuf;
    src.loop = true;
    src.connect(g);
    g.connect(master);
    src.start();
    battleSrc = src;
  };
  if (battleBuf) begin();
  else loadBattle().then(begin);
}

/** 배틀 음악 정지 + 합성 BGM 복원. */
export function stopBattleMusic() {
  battleWanted = false;
  if (battleSrc) {
    try { battleSrc.stop(); } catch { /* noop */ }
    try { battleSrc.disconnect(); } catch { /* noop */ }
    battleSrc = null;
  }
  resumeBg();
}

/** 앱이 백그라운드로 갈 때: BGM 일시정지 + 오디오 컨텍스트 정지(배틀 음악·효과음까지 무음) */
export function pauseForBackground() {
  appHidden = true;
  if (bgmEl) bgmEl.pause();
  if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
}

/** 앱으로 돌아왔을 때: 멈추기 전 상태로 복원 (배틀 중이었으면 배틀 음악, 아니면 전체 BGM) */
export function resumeFromBackground() {
  if (!appHidden) return;
  appHidden = false;
  if (!ctx) return; // 아직 첫 터치 전이면 소리를 켠 적이 없다
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (bgWanted && bgmEl && !battleSrc) bgmEl.play().catch(() => {});
}

export function setLevel(l: number) {
  level = Math.max(0, Math.min(3, Math.round(l) || 0));
  if (ctx && master) master.gain.setTargetAtTime(GAINS[level], ctx.currentTime, 0.05);
}

export function getLevel() {
  return level;
}

function sfxReady(): boolean {
  if (appHidden) return false;
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
