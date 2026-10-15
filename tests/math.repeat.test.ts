// 같은 문제 반복: 한 판(10문제) 안에서 같은 식이 다시 나오지 않아야 한다 (2026-10-15 사용자 요청).
// 전엔 문제마다 따로 뽑아 덧셈 1~9에서 한 판의 32%가 같은 문제를 연달아 냈다.
import { describe, it, expect } from 'vitest';
import { makeFreshProblem, makeProblem } from '../src/systems/mathGenerator';
import { defaultSettings } from '../src/systems/settings';
import type { Op, Settings } from '../src/types';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function only(op: Op, presetIndex: number, mixEasier = false): Settings {
  const s = defaultSettings();
  (Object.keys(s.ops) as Op[]).forEach((o) => {
    s.ops[o] = { enabled: o === op, presetIndex: o === op ? presetIndex : 0 };
  });
  s.mixEasier = mixEasier;
  return s;
}

/** GameScene.showMathProblem 과 같은 방식으로 한 판을 낸다 */
function playRound(s: Settings, rng: () => number, n = 10): string[] {
  const used = new Set<string>();
  let prev: string | null = null;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = makeFreshProblem(s, used, prev, rng);
    used.add(p.text);
    prev = p.text;
    out.push(p.text);
  }
  return out;
}

const CASES: [string, Settings][] = [
  ['기본 설정', defaultSettings()],
  ['덧셈만 1~9', only('add', 0)],
  ['뺄셈만 1~9', only('sub', 0)],
  ['곱셈만 2~5단', only('mul', 0)],
  ['나눗셈만 2~5단', only('div', 0)],
  ['곱셈만 4~9단 + 쉬운 문제 섞기', only('mul', 1, true)],
];

describe('한 판 안에서 같은 문제가 다시 나오지 않는다', () => {
  CASES.forEach(([name, s]) => {
    it(`${name}: 2,000판 동안 한 판 안의 중복 0`, () => {
      const rng = seeded(20261015);
      for (let r = 0; r < 2000; r++) {
        const round = playRound(s, rng);
        expect(new Set(round).size).toBe(round.length);
      }
    });
  });

  it('고칠 이유 확인: 예전 방식(문제마다 따로 뽑기)은 덧셈 1~9에서 연달아 같은 문제가 자주 나왔다', () => {
    const s = only('add', 0);
    const rng = seeded(7);
    let roundsWithBackToBack = 0;
    for (let r = 0; r < 2000; r++) {
      let prev = '';
      let hit = false;
      for (let i = 0; i < 10; i++) {
        const t = makeProblem(s, rng).text;
        if (t === prev) hit = true;
        prev = t;
      }
      if (hit) roundsWithBackToBack++;
    }
    expect(roundsWithBackToBack / 2000).toBeGreaterThan(0.2);
  });

  it('고를 식을 다 써 버린 경우에도 바로 앞 문제와는 다르다', () => {
    const s = only('add', 0); // 덧셈 1~9: 식 36개
    const all = new Set<string>();
    const rng = seeded(1);
    for (let i = 0; i < 20000; i++) all.add(makeProblem(s, rng).text);
    expect(all.size).toBe(36);
    for (let r = 0; r < 500; r++) {
      const prev = '1 + 1';
      const p = makeFreshProblem(s, all, prev, rng);
      expect(p.text).not.toBe(prev);
    }
  });

  it('문제 내용 자체(답·보기)는 예전 규칙 그대로다', () => {
    const rng = seeded(99);
    CASES.forEach(([, s]) => {
      for (let i = 0; i < 500; i++) {
        const p = makeFreshProblem(s, new Set(), null, rng);
        expect(Number.isInteger(p.answer) && p.answer >= 1).toBe(true);
        expect(p.choices).toContain(p.answer);
        expect(new Set(p.choices).size).toBe(4);
      }
    });
  });
});
