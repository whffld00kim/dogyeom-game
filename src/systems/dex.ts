import POKEMON_DATA from '../data/pokemon.json';
import { gameState, persist } from './save';

export interface Pokemon {
  id: number;
  name: string;
}

export const POKEMON: Pokemon[] = POKEMON_DATA as Pokemon[];
export const TOTAL = POKEMON.length; // 1025

export function getName(id: number): string {
  const p = POKEMON[id - 1];
  return p ? p.name : `#${id}`;
}

export function isCaught(id: number): boolean {
  return gameState.caught.includes(id);
}

export function caughtCount(): number {
  return gameState.caught.length;
}

// 실제 스프라이트 적용 전까지 쓰는 임시 색 (id 기반으로 일정)
const PALETTE = [
  0xff6b6b, 0xffa726, 0xffd24a, 0x7cc63e, 0x4dd0e1, 0x6c8cff, 0xb085f5, 0xff80ab, 0x8d6e63, 0x90a4ae,
];
export function placeholderColor(id: number): number {
  return PALETTE[id % PALETTE.length];
}

// 세대 = 지역. 현재 지역 안에서 랜덤으로 포획하고, 다 모으면 다음 지역으로.
export interface Region {
  name: string;
  start: number;
  end: number;
}
export const REGIONS: Region[] = [
  { name: '관동', start: 1, end: 151 },
  { name: '성도', start: 152, end: 251 },
  { name: '호연', start: 252, end: 386 },
  { name: '신오', start: 387, end: 493 },
  { name: '하나', start: 494, end: 649 },
  { name: '칼로스', start: 650, end: 721 },
  { name: '알로라', start: 722, end: 809 },
  { name: '가라르', start: 810, end: 905 },
  { name: '팔데아', start: 906, end: 1025 },
];

function caughtSet(): Set<number> {
  return new Set(gameState.caught);
}

/** 아직 다 못 모은 첫 지역(=현재 지역). 전부 모았으면 마지막 지역. */
export function currentRegion(): Region {
  const have = caughtSet();
  for (const r of REGIONS) {
    for (let id = r.start; id <= r.end; id++) if (!have.has(id)) return r;
  }
  return REGIONS[REGIONS.length - 1];
}

/** 현재 지역에서 안 잡은 포켓몬 하나를 랜덤 포획. 전부 모았으면 null. */
export function catchRandom(): number | null {
  const have = caughtSet();
  for (const r of REGIONS) {
    const pool: number[] = [];
    for (let id = r.start; id <= r.end; id++) if (!have.has(id)) pool.push(id);
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      gameState.caught.push(pick);
      persist();
      return pick;
    }
  }
  return null;
}

/** 이미 클리어한 스테이지 수만큼 도감을 채워 보정(지역 순서대로 랜덤). 기존 진행 반영용. */
export function reconcileCaught(): void {
  const clearedCount = Object.keys(gameState.stageStars).filter(
    (k) => (gameState.stageStars[Number(k)] ?? 0) > 0
  ).length;
  const target = Math.min(clearedCount, TOTAL);
  let guard = 0;
  while (gameState.caught.length < target && guard < TOTAL) {
    if (catchRandom() === null) break;
    guard++;
  }
}
