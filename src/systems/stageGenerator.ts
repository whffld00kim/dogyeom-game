import type { Settings } from '../types';

export interface Stage {
  index: number;
  biome: string; // 배경 테마
  problems: number; // 풀어야 할 문제 수
  isMilestone: boolean; // 몬스터 포획 스테이지
  isBoss: boolean; // 보스 스테이지
}

export const BIOMES = ['숲', '해변', '동굴', '하늘', '초원', '설원'];
export const BIOME_COLORS: Record<string, { top: number; bottom: number; ground: number }> = {
  숲: { top: 0xbfeaff, bottom: 0x8fd3ff, ground: 0x8bd450 },
  해변: { top: 0xdff6ff, bottom: 0x9fe0ff, ground: 0xf2e2a8 },
  동굴: { top: 0x6a6f8c, bottom: 0x4a4f6b, ground: 0x7a6a5a },
  하늘: { top: 0xcfe9ff, bottom: 0x9bc8ff, ground: 0xd8e8ff },
  초원: { top: 0xd6f0c2, bottom: 0xa9e07a, ground: 0x7bc24a },
  설원: { top: 0xeaf6ff, bottom: 0xc9e6ff, ground: 0xeef4fa },
};

/** 스테이지 번호 + 설정으로 스테이지 정의를 결정(번호로 재현 가능). */
export function makeStage(index: number, _s: Settings): Stage {
  const isBoss = index % 10 === 0;
  const isMilestone = !isBoss && index % 5 === 0;
  const problems = Math.min(10, 4 + Math.floor(index / 5)); // 4 → 10 으로 완만 증가
  const biome = BIOMES[Math.floor((index - 1) / 5) % BIOMES.length];
  return { index, biome, problems, isMilestone, isBoss };
}

/** 스테이지 보상: ×/÷ 가 켜져 있으면 5코인, 아니면 1코인 */
export function stageReward(s: Settings): number {
  return s.ops.mul.enabled || s.ops.div.enabled ? 5 : 1;
}
