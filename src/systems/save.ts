import localforage from 'localforage';
import type { Settings } from '../types';
import { defaultSettings } from './settings';

const SCHEMA_VERSION = 1;
const KEY = 'dogyeom-save';
const BACKUP_KEY = 'dogyeom-save-backup';

export interface GameState {
  schemaVersion: number;
  settings: Settings;
  coins: number;
  stageStars: Record<number, number>; // 스테이지번호 → 별(1~3)
  maxUnlocked: number; // 해금된 최고 스테이지 번호
}

export function createDefault(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    coins: 0,
    stageStars: {},
    maxUnlocked: 1,
  };
}

// 메모리상 단일 상태 (씬들이 공유). load 후 동기 접근.
export const gameState: GameState = createDefault();

localforage.config({ name: 'dogyeom-game', storeName: 'save' });

/** 부팅 시 1회: 저장된 상태를 메모리로 불러와 병합 */
export async function loadState(): Promise<void> {
  try {
    const saved = await localforage.getItem<GameState>(KEY);
    if (saved && saved.schemaVersion) {
      // 기본값 위에 저장값을 덮어 누락 필드 보강
      const merged = { ...createDefault(), ...saved };
      merged.settings = { ...defaultSettings(), ...(saved.settings || {}) };
      merged.settings.ops = { ...defaultSettings().ops, ...(saved.settings?.ops || {}) };
      Object.assign(gameState, merged);
    }
  } catch (e) {
    console.warn('[save] load 실패, 기본값 사용:', e);
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** 디바운스 저장 (잦은 호출 합치기) + 직전 백업 슬롯 유지 */
export function persist(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const prev = await localforage.getItem<GameState>(KEY);
      if (prev) await localforage.setItem(BACKUP_KEY, prev);
      await localforage.setItem(KEY, gameState);
    } catch (e) {
      console.warn('[save] 저장 실패:', e);
    }
  }, 300);
}

/** 스테이지 클리어 기록: 별 갱신(최고치), 다음 스테이지 해금, 코인 지급 */
export function recordStageClear(index: number, stars: number, reward: number): void {
  const prev = gameState.stageStars[index] ?? 0;
  gameState.stageStars[index] = Math.max(prev, stars);
  if (index + 1 > gameState.maxUnlocked) gameState.maxUnlocked = index + 1;
  gameState.coins += reward;
  persist();
}

export function saveSettings(): void {
  persist();
}
