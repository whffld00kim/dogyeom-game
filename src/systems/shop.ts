import Phaser from 'phaser';
import { gameState, persist } from './save';
import { pokeAnchors } from './dex';
import { ITEMS as ITEM_DEFS, drawItem, type ItemDef } from './items';

export type Slot = 'hat' | 'glasses' | 'weapon' | 'shoes' | 'clothes' | 'necklace';

export type Item = ItemDef;

export const SLOTS: { key: Slot; label: string }[] = [
  { key: 'hat', label: '모자' },
  { key: 'glasses', label: '안경' },
  { key: 'weapon', label: '무기' },
  { key: 'shoes', label: '신발' },
  { key: 'clothes', label: '옷' },
  { key: 'necklace', label: '목걸이' },
];

export const ITEMS: Item[] = ITEM_DEFS;

export function itemsBySlot(slot: Slot): Item[] {
  return ITEMS.filter((i) => i.slot === slot);
}
export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}
export function isOwned(id: string): boolean {
  return gameState.ownedItems.includes(id);
}

/** 특정 포켓몬이 해당 슬롯에 착용 중인 아이템 id */
export function equippedId(pokemonId: number, slot: Slot): string | undefined {
  return gameState.equipped[pokemonId]?.[slot];
}

/** 구매 시도. 이미 보유=true, 코인 부족=false, 구매 성공=true */
export function buyItem(item: Item): boolean {
  if (isOwned(item.id)) return true;
  if (gameState.coins < item.price) return false;
  gameState.coins -= item.price;
  gameState.ownedItems.push(item.id);
  persist();
  return true;
}

/** 특정 포켓몬의 슬롯에 아이템 착용(또는 null 로 해제) */
export function equipItem(pokemonId: number, slot: Slot, id: string | null): void {
  const key = String(pokemonId);
  if (!gameState.equipped[key]) gameState.equipped[key] = {};
  if (id === null) delete gameState.equipped[key][slot];
  else gameState.equipped[key][slot] = id;
  persist();
}

/**
 * 포켓몬에 착용한 꾸미기 아이템들을 (x,y) 중심·size 크기에 맞춰 겹쳐 그림.
 * tryOn 을 주면 해당 슬롯은 그 아이템(또는 null=벗음)으로 미리보기(구입 전 착용 모습).
 */
export function addEquippedOverlay(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  pokemonId: number,
  tryOn?: { slot: Slot; id: string | null },
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const base = gameState.equipped[pokemonId] || {};
  const eq: Record<string, string | undefined> = { ...base };
  if (tryOn) eq[tryOn.slot] = tryOn.id ?? undefined;
  const ORDER: Slot[] = ['clothes', 'necklace', 'shoes', 'weapon', 'glasses', 'hat'];
  if (!ORDER.some((s) => eq[s])) return c; // 표시할 게 없으면 앵커 계산 생략
  const a = pokeAnchors(scene, pokemonId, x, y, size);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  // oyf = ds 대비 y 오프셋 비율 (착용 위치 미세조정)
  const place = (slot: Slot, ax: number, ay: number, ds: number, oyf: number) => {
    const id = eq[slot];
    if (!id) return;
    const def = getItem(id);
    if (def) c.add(drawItem(scene, def, ax, ay + ds * oyf, ds));
  };
  // 뒤→앞 순서 (옷이 가장 뒤, 모자가 가장 앞)
  place('clothes', a.bodyX, a.bodyY, clamp(a.cw * 0.95, size * 0.45, size * 0.9), 0);
  place('necklace', a.neckX, a.neckY, clamp(a.cw * 0.5, size * 0.22, size * 0.45), 0.05);
  place('shoes', a.feetX, a.feetY, clamp(a.cw * 0.5, size * 0.24, size * 0.46), -0.16);
  place('weapon', a.sideX, a.sideY, size * 0.42, 0);
  place('glasses', a.faceX, a.faceY, clamp(a.cw * 0.55, size * 0.26, size * 0.46), 0);
  // 모자: 머리 폭에 맞춰 큼직하게, 머리 위에 살짝 덮이도록
  place('hat', a.headX, a.headY, clamp(a.cw * 1.0, size * 0.5, size * 0.95), 0.16);
  return c;
}
