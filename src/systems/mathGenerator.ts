import type { Settings, Op, Problem } from '../types';
import { OP_SYMBOL, ADD_SUB_PRESETS, MUL_DIV_PRESETS, pickPresetIndex } from './settings';

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
  const idx = pickPresetIndex(s, op, rng); // 쉬운 문제 섞기가 켜져 있으면 낮은 단계가 반씩 섞인다

  let a: number, b: number, answer: number;
  if (op === 'add') {
    // 답(합)이 1~max 범위에 들어오도록: 합을 먼저 정하고 두 수로 분해
    // min 이 있으면(100~1000) 두 수 모두 min 이상 — 세 자리 + 세 자리
    const { max, min = 1 } = ADD_SUB_PRESETS[idx];
    const sum = randInt(rng, Math.max(2, min * 2), max);
    a = randInt(rng, min, sum - min);
    b = sum - a;
    answer = sum;
  } else if (op === 'sub') {
    // 답(차)이 1~max 범위, 음수 없음. min 이 있으면 빼는 수·답 모두 min 이상 — 세 자리 − 세 자리 = 세 자리
    const { max, min = 1 } = ADD_SUB_PRESETS[idx];
    a = randInt(rng, Math.max(2, min * 2), max);
    b = randInt(rng, min, a - min);
    answer = a - b;
  } else {
    const p = MUL_DIV_PRESETS[idx];
    if (p.kind === 'dan') {
      // 단 모드: '단'은 danMin~danMax, 나머지 한 수는 1~9 (구구단 방식)
      const dan = randInt(rng, p.danMin, p.danMax);
      const other = randInt(rng, 1, 9);
      if (op === 'mul') {
        // 단을 앞에 표기 (예: 2단 = 2×1 ~ 2×9)
        a = dan;
        b = other;
        answer = a * b;
      } else {
        // 나눗셈: 나누는 수 = 단, 몫 = 1~9 → a ÷ b 가 나누어떨어짐
        b = dan;
        answer = other;
        a = b * answer;
      }
    } else if (p.kind === 'twoDigitNoCarry') {
      // 두 자리 쉬움: (10t+o) × d 인데 t×d, o×d 가 모두 한 자리 → 받아올림 없음. 예: 12×3, 21×4, 30×3
      // d 를 먼저 고르고 t, o 를 9/d 이하로 제한한다. o=0 도 허용 (10×3, 20×4 같은 것)
      const d = randInt(rng, 2, 9);
      const lim = Math.floor(9 / d);
      const t = randInt(rng, 1, lim);
      const o = randInt(rng, 0, lim);
      const two = 10 * t + o;
      if (op === 'mul') {
        a = two;
        b = d;
        answer = a * b;
      } else {
        // 나눗셈은 같은 식을 뒤집는다: 84 ÷ 4 = 21
        b = d;
        answer = two;
        a = b * answer;
      }
    } else if (p.kind === 'twoDigit') {
      // 두 자리: 곱셈은 두 자리(10~99) × 한 자리(2~9), 나눗셈은 두 자리 ÷ 한 자리(2~9) = 두 자리 몫
      if (op === 'mul') {
        a = randInt(rng, 10, 99);
        b = randInt(rng, 2, 9);
        answer = a * b;
      } else {
        // 나누어떨어지고 몫도 두 자리(10 이상), 나뉘는 수는 99 이하. 예: 84÷6=14, 91÷7=13
        // 전엔 나뉘는 수만 두 자리면 돼서 63÷7 같은 구구단 문제가 절반쯤 섞였다 (2026-09-19)
        b = randInt(rng, 2, 9);
        answer = randInt(rng, 10, Math.floor(99 / b)); // b=9 여도 10~11 이 남는다
        a = b * answer;
      }
    } else {
      // 두 자리끼리: 곱셈은 두 자리(10~99) × 두 자리(10~99)
      if (op === 'mul') {
        a = randInt(rng, 10, 99);
        b = randInt(rng, 10, 99);
        answer = a * b;
      } else {
        // 나눗셈은 두 자리 ÷ 두 자리와 세 자리 ÷ 두 자리를 반반 (몫 2 이상, 항상 나누어떨어짐)
        if (rng() < 0.5) {
          // 두 자리 ÷ 두 자리 → 나뉘는 수가 99 이하로 남도록 나누는 수는 10~49
          b = randInt(rng, 10, 49);
          answer = randInt(rng, 2, Math.floor(99 / b));
        } else {
          // 세 자리 ÷ 두 자리 → 나뉘는 수가 100~999
          b = randInt(rng, 10, 99);
          answer = randInt(rng, Math.max(2, Math.ceil(100 / b)), Math.floor(999 / b));
        }
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
