import type { Settings, Op, Problem } from '../types';
import { OP_SYMBOL, ADD_SUB_PRESETS, MUL_DIV_PRESETS, clampPresetIndex } from './settings';

function randInt(rng: () => number, min: number, max: number): number {
  if (max < min) [min, max] = [max, min];
  return Math.floor(rng() * (max - min + 1)) + min;
}

function swapDigits(n: number): number {
  return parseInt(('' + n).split('').reverse().join(''), 10);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function enabledOps(s: Settings): Op[] {
  return (Object.keys(s.ops) as Op[]).filter((o) => s.ops[o].enabled);
}

/** 설정에 따라 문제 하나 생성. ÷는 항상 나누어떨어지고, −는 음수가 안 나옴. */
export function makeProblem(s: Settings, rng: () => number = Math.random): Problem {
  const ops = enabledOps(s);
  const op: Op = ops.length ? ops[Math.floor(rng() * ops.length)] : 'add';
  const idx = clampPresetIndex(op, s.ops[op]?.presetIndex ?? 0);

  let a: number, b: number, answer: number;
  if (op === 'add' || op === 'sub') {
    const max = ADD_SUB_PRESETS[idx].max;
    a = randInt(rng, 1, max);
    b = randInt(rng, 1, max);
    if (op === 'sub' && a < b) [a, b] = [b, a]; // 음수 방지
    answer = op === 'add' ? a + b : a - b;
  } else {
    const p = MUL_DIV_PRESETS[idx];
    if (p.kind === 'dan') {
      // 단 모드: '단'은 danMin~danMax, 나머지 한 수는 1~9 (구구단 방식)
      const dan = randInt(rng, p.danMin, p.danMax);
      const other = randInt(rng, 1, 9);
      if (op === 'mul') {
        if (rng() < 0.5) {
          a = dan;
          b = other;
        } else {
          a = other;
          b = dan;
        }
        answer = a * b;
      } else {
        // 나눗셈: 나누는 수 = 단, 몫 = 1~9 → a ÷ b 가 나누어떨어짐
        b = dan;
        answer = other;
        a = b * answer;
      }
    } else {
      // 범위 모드 (1~max)
      if (op === 'mul') {
        a = randInt(rng, 1, p.max);
        b = randInt(rng, 1, p.max);
        answer = a * b;
      } else {
        // 나눗셈: 나누는 수는 한 자리(2~9)로 제한, 몫은 1~max → 항상 나누어떨어짐
        b = randInt(rng, 2, 9);
        answer = randInt(rng, 1, p.max);
        a = b * answer;
      }
    }
  }

  const text = `${a} ${OP_SYMBOL[op]} ${b}`;
  const choices = makeChoices(answer, op, a, b, rng);
  return { op, a, b, answer, text, choices };
}

/** 정답 + 그럴듯한 오답 3개 (자릿수 바꿈/근접값/흔한 실수). 모두 정수·0이상·유일. */
function makeChoices(answer: number, op: Op, a: number, b: number, rng: () => number): number[] {
  const set = new Set<number>([answer]);
  const cands: number[] = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10];

  if (answer >= 10) {
    const sw = swapDigits(answer);
    if (sw !== answer) cands.push(sw); // 36↔63, 32↔23 같은 함정
  }
  if (op === 'mul') cands.push(a * (b + 1), a * (b - 1), (a + 1) * b, a + b);
  else if (op === 'add') cands.push(a * b, Math.abs(a - b), answer + 9);
  else if (op === 'sub') cands.push(a + b, answer + 9, answer - 9);
  else cands.push(answer * 2, a - b, answer + 3);

  shuffle(cands, rng);
  for (const c of cands) {
    if (set.size >= 4) break;
    if (Number.isInteger(c) && c >= 0 && !set.has(c)) set.add(c);
  }
  // 부족하면 근접값으로 채움
  let pad = 2;
  while (set.size < 4) {
    const c = answer + (rng() < 0.5 ? -1 : 1) * pad;
    if (Number.isInteger(c) && c >= 0 && !set.has(c)) set.add(c);
    pad++;
    if (pad > 60) {
      set.add(set.size); // 안전장치
    }
  }
  return shuffle([...set], rng).slice(0, 4);
}
