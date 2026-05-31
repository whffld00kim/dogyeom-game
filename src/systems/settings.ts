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

// 곱셈·나눗셈 프리셋 (단 모드: 해당 단 × 1~9 / 범위 모드: 1~max)
export type MulDivPreset =
  | { label: string; kind: 'dan'; danMin: number; danMax: number }
  | { label: string; kind: 'range'; max: number };
export const MUL_DIV_PRESETS: MulDivPreset[] = [
  { label: '1~3단', kind: 'dan', danMin: 1, danMax: 3 },
  { label: '4~6단', kind: 'dan', danMin: 4, danMax: 6 },
  { label: '7~9단', kind: 'dan', danMin: 7, danMax: 9 },
  { label: '1~9단', kind: 'dan', danMin: 1, danMax: 9 },
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
