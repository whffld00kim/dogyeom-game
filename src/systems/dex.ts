import Phaser from 'phaser';
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

// ── 실제 포켓몬 스프라이트 (있으면 사용, 없으면 도형으로 대체) ──
export function pokeKey(id: number): string {
  return `poke_${id}`;
}

/** 필요한 포켓몬 스프라이트를 로드한 뒤 done() 호출. 파일이 없으면(공개 Pages 등) 자동으로 건너뛰고 placeholder 사용. */
export function loadPokeSprites(scene: Phaser.Scene, ids: number[], done: () => void): void {
  const need = ids.filter((id) => id >= 1 && !scene.textures.exists(pokeKey(id)));
  if (need.length === 0) {
    done();
    return;
  }
  need.forEach((id) => scene.load.image(pokeKey(id), `sprites/${id}.png`));
  scene.load.once('complete', done);
  scene.load.start();
}

/** 주인공 지우 아이콘: 스프라이트가 있으면 이미지, 없으면 빨간모자 캐릭터(placeholder). */
export function addAsh(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.GameObject {
  if (scene.textures.exists('ash')) {
    const img = scene.add.image(x, y, 'ash');
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }
  const c = scene.add.container(x, y);
  const r = size * 0.44;
  const face = scene.add.circle(0, 0, r, 0xffd2a6);
  face.setStrokeStyle(Math.max(3, size * 0.045), 0xffffff);
  const cap = scene.add.circle(0, -r * 0.62, r * 0.86, 0xee5544);
  c.add([
    face,
    cap,
    scene.add.circle(-r * 0.3, r * 0.08, r * 0.13, 0x222222),
    scene.add.circle(r * 0.3, r * 0.08, r * 0.13, 0x222222),
    scene.add.circle(-r * 0.5, r * 0.42, r * 0.12, 0xff9aa2),
    scene.add.circle(r * 0.5, r * 0.42, r * 0.12, 0xff9aa2),
  ]);
  return c;
}

/** 포켓몬 아이콘 생성: 스프라이트가 있으면 이미지, 없으면 색 원(placeholder). */
export function addPokeIcon(scene: Phaser.Scene, x: number, y: number, id: number, size: number): Phaser.GameObjects.GameObject {
  if (scene.textures.exists(pokeKey(id))) {
    const img = scene.add.image(x, y, pokeKey(id));
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }
  const c = scene.add.container(x, y);
  const circ = scene.add.circle(0, 0, size * 0.46, placeholderColor(id));
  circ.setStrokeStyle(4, 0xffffff);
  c.add([
    circ,
    scene.add.circle(-size * 0.16, -size * 0.08, size * 0.085, 0xffffff),
    scene.add.circle(size * 0.16, -size * 0.08, size * 0.085, 0xffffff),
  ]);
  return c;
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

/** 구버전 저장 1회 보정: 이미 클리어한 스테이지 수만큼 도감을 채우고 보상완료로 마킹. */
export function reconcileCaught(): void {
  const cleared = Object.keys(gameState.stageStars)
    .map(Number)
    .filter((n) => (gameState.stageStars[n] ?? 0) > 0)
    .sort((a, b) => a - b);
  let guard = 0;
  while (gameState.caught.length < Math.min(cleared.length, TOTAL) && guard < TOTAL) {
    if (catchRandom() === null) break;
    guard++;
  }
  gameState.caughtStages = Array.from(new Set([...gameState.caughtStages, ...cleared]));
  persist();
}
