import Phaser from 'phaser';
import OUTFITS_DATA from '../data/outfits.json';
import { gameState, persist } from './save';
import { addPokeIcon } from './dex';

export interface OutfitDef {
  id: string;
  name: string;
  price: number;
  file: string; // public 기준 경로 (예: items/1/1.png)
}

const OUTFITS = OUTFITS_DATA as Record<string, OutfitDef[]>;
const OUTFIT_VER = '5'; // v48: q82 재인코딩(용량↓, 화질 미세차)로 교체

export function outfitsFor(pid: number): OutfitDef[] {
  return OUTFITS[String(pid)] || [];
}

const TIER_PRICE = [10, 15, 20]; // 일반 / 희귀 / 최고
/** 코디 등급(인덱스 기반: floor(i*3/N), 상점 그리드와 동일)에 따른 가격 — 일반 10, 희귀 15, 최고 20 */
export function outfitPrice(pid: number, id: string): number {
  const list = outfitsFor(pid);
  const N = list.length;
  const idx = list.findIndex((o) => o.id === id);
  if (idx < 0 || N === 0) return TIER_PRICE[0];
  return TIER_PRICE[Math.min(2, Math.floor((idx * 3) / N))];
}

const _byId: Record<string, OutfitDef> = (() => {
  const m: Record<string, OutfitDef> = {};
  Object.values(OUTFITS).forEach((arr) => arr.forEach((o) => (m[o.id] = o)));
  return m;
})();

export function getOutfit(id: string): OutfitDef | undefined {
  return _byId[id];
}

export function outfitKey(id: string): string {
  return `outfit_${id}`;
}

/** 지정 코디 텍스처들을 로드한 뒤 done(). 파일 없으면 건너뜀. */
export function loadOutfitTextures(scene: Phaser.Scene, ids: string[], done: () => void): void {
  const need = ids.filter((id) => getOutfit(id) && !scene.textures.exists(outfitKey(id)));
  if (need.length === 0) {
    done();
    return;
  }
  need.forEach((id) => scene.load.image(outfitKey(id), `${getOutfit(id)!.file}?v=${OUTFIT_VER}`));
  scene.load.once('complete', done);
  scene.load.start();
}

/** 코디 합성 이미지를 (x,y) 중심·size 크기로 그림(컨테이너). 텍스처 없으면 빈 컨테이너. */
export function drawOutfit(scene: Phaser.Scene, id: string, x: number, y: number, size: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const key = outfitKey(id);
  if (scene.textures.exists(key)) {
    const im = scene.add.image(0, 0, key);
    im.setScale(size / Math.max(im.width, im.height));
    c.add(im);
  }
  return c;
}

/** 포켓몬 표시: 착용 코디가 있으면 그 합성 이미지, 없으면 기본 스프라이트. */
export function addPokeDisplay(scene: Phaser.Scene, x: number, y: number, pid: number, size: number): Phaser.GameObjects.GameObject {
  const oid = gameState.outfit[pid];
  if (oid && scene.textures.exists(outfitKey(oid))) return drawOutfit(scene, oid, x, y, size);
  return addPokeIcon(scene, x, y, pid, size);
}

// ── 구매/착용 ──
export function isOutfitOwned(id: string): boolean {
  return gameState.ownedOutfits.includes(id);
}
export function equippedOutfit(pid: number): string | undefined {
  return gameState.outfit[pid];
}
/** 구매 시도. 보유=true, 코인부족=false, 성공=true */
export function buyOutfit(o: OutfitDef): boolean {
  if (isOutfitOwned(o.id)) return true;
  if (gameState.coins < o.price) return false;
  gameState.coins -= o.price;
  gameState.ownedOutfits.push(o.id);
  persist();
  return true;
}
/** 착용(또는 null 로 벗기). 코디는 한 번에 하나만. */
export function equipOutfit(pid: number, id: string | null): void {
  const key = String(pid);
  if (id === null) delete gameState.outfit[key];
  else gameState.outfit[key] = id;
  persist();
}
