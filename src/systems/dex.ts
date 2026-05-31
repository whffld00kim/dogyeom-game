import POKEMON_DATA from '../data/pokemon.json';
import { gameState } from './save';

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
