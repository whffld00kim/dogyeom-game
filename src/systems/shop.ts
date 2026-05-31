import { gameState, persist } from './save';

export type Slot = 'hat' | 'glasses' | 'held';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  price: number;
}

export const SLOTS: { key: Slot; label: string }[] = [
  { key: 'hat', label: '모자' },
  { key: 'glasses', label: '안경' },
  { key: 'held', label: '손에' },
];

// 실제 아트 전까지 이모지 placeholder
export const ITEMS: Item[] = [
  { id: 'cap', slot: 'hat', name: '야구모자', emoji: '🧢', price: 3 },
  { id: 'ribbon', slot: 'hat', name: '리본', emoji: '🎀', price: 4 },
  { id: 'tophat', slot: 'hat', name: '마술모자', emoji: '🎩', price: 6 },
  { id: 'grad', slot: 'hat', name: '학사모', emoji: '🎓', price: 6 },
  { id: 'cowboy', slot: 'hat', name: '카우보이', emoji: '🤠', price: 8 },
  { id: 'crown', slot: 'hat', name: '왕관', emoji: '👑', price: 12 },
  { id: 'glasses', slot: 'glasses', name: '안경', emoji: '👓', price: 3 },
  { id: 'goggles', slot: 'glasses', name: '물안경', emoji: '🥽', price: 4 },
  { id: 'sunglasses', slot: 'glasses', name: '선글라스', emoji: '🕶', price: 6 },
  { id: 'balloon', slot: 'held', name: '풍선', emoji: '🎈', price: 3 },
  { id: 'candy', slot: 'held', name: '사탕', emoji: '🍭', price: 4 },
  { id: 'flower', slot: 'held', name: '꽃', emoji: '🌸', price: 4 },
  { id: 'star', slot: 'held', name: '별', emoji: '⭐', price: 5 },
];

export function itemsBySlot(slot: Slot): Item[] {
  return ITEMS.filter((i) => i.slot === slot);
}
export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}
export function isOwned(id: string): boolean {
  return gameState.ownedItems.includes(id);
}
export function equippedId(slot: Slot): string | undefined {
  return gameState.equipped[slot];
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

export function equipItem(slot: Slot, id: string | null): void {
  if (id === null) delete gameState.equipped[slot];
  else gameState.equipped[slot] = id;
  persist();
}
