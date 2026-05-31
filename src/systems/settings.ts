import type { Settings, Op } from '../types';

export function defaultSettings(): Settings {
  return {
    ops: {
      add: { enabled: true, min: 1, max: 9 },
      sub: { enabled: true, min: 1, max: 9 },
      mul: { enabled: true, min: 1, max: 9 }, // 구구단 기본 ON
      div: { enabled: false, min: 1, max: 9 },
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

// 범위 프리셋 (max 값) — 탭하면 다음 값으로 순환
export const RANGE_PRESETS = [9, 10, 12, 20, 100];
export function cycleRange(max: number): number {
  const i = RANGE_PRESETS.indexOf(max);
  return RANGE_PRESETS[(i + 1) % RANGE_PRESETS.length];
}

// 도전 모드 문제당 제한시간(초)
export const TIME_SECONDS: Record<Settings['timeLevel'], number> = {
  easy: 12,
  normal: 8,
  hard: 5,
};
