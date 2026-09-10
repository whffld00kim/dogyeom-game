import type { Settings, Op } from '../types';

export function defaultSettings(): Settings {
  return {
    ops: {
      add: { enabled: true, presetIndex: 0 }, // 1~9
      sub: { enabled: true, presetIndex: 0 }, // 1~9
      mul: { enabled: true, presetIndex: 0 }, // 1~3단
      div: { enabled: false, presetIndex: 0 },
    },
    answerMode: 'choice',
    mode: 'explore', // 기본: 시간 압박 없는 탐험 모드
    timeLevel: 'normal',
    maxMiss: 2, // 10문제 중 2번까지 틀려도 포획 (문제 수 10 고정에 맞춘 기본값)
    subject: 'math', // 과목: 수학(기본) / 한글 / 섞기
    hangulLevel: 1, // 한글 단계: 글자 고르기(기본)
    mixEasier: true, // 새 단계로 올리면 그 단계만 나오는 게 너무 어려워서 기본은 섞기
  };
}

export const OP_LABEL: Record<Op, string> = {
  add: '덧셈',
  sub: '뺄셈',
  mul: '곱셈',
  div: '나눗셈',
};

export const OP_SYMBOL: Record<Op, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
};

// 덧셈·뺄셈 범위 프리셋 (피연산자 1 ~ max)
export interface AddSubPreset {
  label: string;
  max: number;
}
export const ADD_SUB_PRESETS: AddSubPreset[] = [
  { label: '1 ~ 9', max: 9 },
  { label: '1 ~ 20', max: 20 },
  { label: '1 ~ 100', max: 100 },
  { label: '1 ~ 300', max: 300 },
  { label: '1 ~ 1000', max: 1000 },
];

// 곱셈·나눗셈 프리셋 (단 모드: 해당 단 × 1~9 / 두 자리 쉬움: 받아올림 없는 두 자리×한 자리 / 범위 모드: 1~max)
// ⚠ 순서를 바꾸거나 중간에 끼우면 저장된 presetIndex 가 밀린다 → save.ts 의 SCHEMA_VERSION 마이그레이션도 함께
export type MulDivPreset =
  | { label: string; kind: 'dan'; danMin: number; danMax: number }
  | { label: string; kind: 'twoDigitNoCarry' }
  | { label: string; kind: 'range'; max: number };
export const MUL_DIV_PRESETS: MulDivPreset[] = [
  { label: '2~5단', kind: 'dan', danMin: 2, danMax: 5 },
  { label: '4~9단', kind: 'dan', danMin: 4, danMax: 9 },
  { label: '1~9단', kind: 'dan', danMin: 1, danMax: 9 },
  // 1~9단과 1~100(두 자리×한 자리, 초3) 사이의 한 계단: 12×3, 21×4, 84÷4 처럼 받아올림이 없는 것만 (2026-09-10)
  { label: '두 자리 쉬움', kind: 'twoDigitNoCarry' },
  { label: '1~100', kind: 'range', max: 100 },
  { label: '1~1000', kind: 'range', max: 1000 },
];

export function presetCount(op: Op): number {
  return op === 'add' || op === 'sub' ? ADD_SUB_PRESETS.length : MUL_DIV_PRESETS.length;
}

export function clampPresetIndex(op: Op, idx: number): number {
  const n = presetCount(op);
  const i = Number.isInteger(idx) ? idx : 0;
  return ((i % n) + n) % n;
}

/** 이번 문제에 실제로 쓸 프리셋 인덱스. 쉬운 문제 섞기가 켜져 있으면 절반은 더 낮은 단계에서 고른다 */
export function pickPresetIndex(s: Settings, op: Op, rng: () => number = Math.random): number {
  const idx = clampPresetIndex(op, s.ops[op]?.presetIndex ?? 0);
  if (!s.mixEasier || idx === 0 || rng() >= 0.5) return idx;
  return Math.floor(rng() * idx); // 0 ~ idx-1
}

export function presetLabel(op: Op, idx: number): string {
  const i = clampPresetIndex(op, idx);
  return op === 'add' || op === 'sub' ? ADD_SUB_PRESETS[i].label : MUL_DIV_PRESETS[i].label;
}

// 도전 모드 문제당 제한시간(초)
export const TIME_SECONDS: Record<Settings['timeLevel'], number> = {
  easy: 12,
  normal: 8,
  hard: 5,
};
