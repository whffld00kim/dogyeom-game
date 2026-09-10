// 한글 자모 분해/조합 + 한글 게임모드 문제 생성 (완전 오프라인, 외부 라이브러리 없음).
// 겹자음/겹모음(ㄲ, ㅘ, ㄺ …)은 키 하나로 취급해 7살용 입력을 단순화.

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 아이들이 실제로 헷갈리는 자모 쌍(오답·미끼 생성용)
const CONF: string[][] = [
  ['ㄱ', 'ㅋ', 'ㄲ'], ['ㄷ', 'ㅌ', 'ㄸ'], ['ㅂ', 'ㅍ', 'ㅃ'], ['ㅅ', 'ㅆ'], ['ㅈ', 'ㅊ', 'ㅉ'], ['ㄴ', 'ㄹ'], ['ㅇ', 'ㅎ'], ['ㅁ', 'ㅂ'],
  ['ㅐ', 'ㅔ'], ['ㅒ', 'ㅖ'], ['ㅏ', 'ㅑ'], ['ㅓ', 'ㅕ'], ['ㅗ', 'ㅛ'], ['ㅜ', 'ㅠ'], ['ㅡ', 'ㅜ'], ['ㅚ', 'ㅙ', 'ㅞ'], ['ㅘ', 'ㅗ'], ['ㅢ', 'ㅣ'], ['ㅟ', 'ㅣ'],
];

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3;
}

/** 음절 → 자모 배열 [초, 중, (종성 있으면 종)] */
export function syllableJamo(ch: string): string[] {
  const c = ch.charCodeAt(0) - 0xac00;
  const jong = c % 28;
  const jung = Math.floor(c / 28) % 21;
  const cho = Math.floor(c / 588);
  const arr = [CHO[cho], JUNG[jung]];
  if (jong > 0) arr.push(JONG[jong]);
  return arr;
}

/** 자모 배열 → 부분 조합 문자열 (1개=자모 그대로, 2개=초+중, 3개=초+중+종) */
export function composeJamo(jamo: string[]): string {
  if (jamo.length === 0) return '';
  if (jamo.length === 1) return jamo[0];
  const cho = CHO.indexOf(jamo[0]);
  const jung = JUNG.indexOf(jamo[1]);
  if (cho < 0 || jung < 0) return jamo.join('');
  const jong = jamo.length >= 3 ? Math.max(0, JONG.indexOf(jamo[2])) : 0;
  return String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
}

export function isCho(j: string): boolean {
  return CHO.includes(j);
}
export function isJung(j: string): boolean {
  return JUNG.includes(j);
}
export function isJongJamo(j: string): boolean {
  return JONG.indexOf(j) > 0;
}

/** j와 헷갈리는 자모 목록 */
function confusablesOf(j: string): string[] {
  const out: string[] = [];
  CONF.forEach((set) => {
    if (set.includes(j)) set.forEach((x) => {
      if (x !== j && !out.includes(x)) out.push(x);
    });
  });
  return out;
}

/** 음절 하나를 그럴듯하게 교란(초/중/종 중 하나를 혼동 자모로) — 반드시 원본과 다름 */
export function perturbSyllable(ch: string): string {
  if (!isSyllable(ch)) return ch;
  for (let attempt = 0; attempt < 14; attempt++) {
    const c = ch.charCodeAt(0) - 0xac00;
    let jong = c % 28;
    let jung = Math.floor(c / 28) % 21;
    let cho = Math.floor(c / 588);
    const what = rand(3);
    if (what === 0) {
      const cand = confusablesOf(CHO[cho]).filter((x) => CHO.includes(x));
      if (cand.length) cho = CHO.indexOf(cand[rand(cand.length)]);
    } else if (what === 1) {
      const cand = confusablesOf(JUNG[jung]).filter((x) => JUNG.includes(x));
      if (cand.length) jung = JUNG.indexOf(cand[rand(cand.length)]);
    } else if (jong > 0) {
      const cand = confusablesOf(JONG[jong]).filter((x) => JONG.indexOf(x) > 0);
      if (cand.length && Math.random() < 0.7) jong = JONG.indexOf(cand[rand(cand.length)]);
      else jong = 0; // 받침 탈락
    } else {
      jong = JONG.indexOf(['ㅇ', 'ㄴ', 'ㅅ', 'ㄹ', 'ㅁ'][rand(5)]); // 받침 추가
    }
    const v = String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
    if (v !== ch) return v;
  }
  // 최후 폴백: 중성 한 칸 회전(항상 다름)
  const c = ch.charCodeAt(0) - 0xac00;
  const jong = c % 28;
  const jung = (Math.floor(c / 28) % 21 + 1) % 21;
  const cho = Math.floor(c / 588);
  return String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
}

/** ① 글자 고르기: 이름에서 한 음절을 빈칸으로 — 보기 4개(정답 포함) */
export function makeBlankProblem(name: string): { idx: number; answer: string; options: string[] } | null {
  const chars = [...name];
  const idxs = chars.map((c, i) => (isSyllable(c) ? i : -1)).filter((i) => i >= 0);
  if (!idxs.length) return null;
  const idx = idxs[rand(idxs.length)];
  const answer = chars[idx];
  const opts = new Set<string>([answer]);
  let guard = 0;
  while (opts.size < 4 && guard++ < 80) opts.add(perturbSyllable(answer));
  return { idx, answer, options: shuffle([...opts]) };
}

/** ② 맞는 글자 찾기: 정답 이름 + 교란 이름 3개 */
export function makeNameOptions(name: string): string[] | null {
  const chars = [...name];
  const idxs = chars.map((c, i) => (isSyllable(c) ? i : -1)).filter((i) => i >= 0);
  if (!idxs.length) return null;
  const opts = new Set<string>([name]);
  let guard = 0;
  while (opts.size < 4 && guard++ < 80) {
    const arr = [...chars];
    const i = idxs[rand(idxs.length)];
    arr[i] = perturbSyllable(arr[i]);
    if (idxs.length > 1 && Math.random() < 0.25) {
      const j = idxs[rand(idxs.length)];
      arr[j] = perturbSyllable(arr[j]);
    }
    const v = arr.join('');
    if (v !== name) opts.add(v);
  }
  return shuffle([...opts]);
}

/** ③④ 쓰기용 자모 키패드: 필요한 자모 전부 + 혼동 미끼(최소 10, 최대 14), 섞어서 반환 */
export function keypadFor(targets: string[][]): string[] {
  const need: string[] = [];
  targets.forEach((t) => t.forEach((j) => {
    if (!need.includes(j)) need.push(j);
  }));
  const keys = [...need];
  const want = Math.min(14, Math.max(10, need.length + 2));
  const pool: string[] = [];
  need.forEach((j) => confusablesOf(j).forEach((x) => {
    if (!need.includes(x) && !pool.includes(x)) pool.push(x);
  }));
  shuffle(pool);
  while (keys.length < want && pool.length) keys.push(pool.pop() as string);
  const fill = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅣ', 'ㅡ'];
  for (const f of fill) {
    if (keys.length >= want) break;
    if (!keys.includes(f)) keys.push(f);
  }
  return shuffle(keys);
}

/** 이름 읽어주기(기기 한국어 TTS). 미지원/오프라인 음성 없음 → 조용히 무시 */
export function speak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.8;
    synth.speak(u);
  } catch {
    /* 미지원 기기: 무음 */
  }
}
