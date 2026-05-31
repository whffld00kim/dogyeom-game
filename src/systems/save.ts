import localforage from 'localforage';
import type { Settings } from '../types';
import { defaultSettings } from './settings';

const SCHEMA_VERSION = 3;
const KEY = 'dogyeom-save';
const BACKUP_KEY = 'dogyeom-save-backup';

export interface GameState {
  schemaVersion: number;
  settings: Settings;
  coins: number;
  stageStars: Record<number, number>; // 스테이지번호 → 별(1~3)
  maxUnlocked: number; // 해금된 최고 스테이지 번호
  caught: number[]; // 잡은 포켓몬 id 목록
  caughtStages: number[]; // 이미 포획 보상을 준 스테이지 번호(중복 보상 방지)
  seenStory: string[]; // 이미 본 지역 스토리(지역명)
  ownedItems: string[]; // 구매한 꾸미기 아이템 id
  equipped: Record<string, string>; // 슬롯(hat/glasses/held) → 아이템 id
}

export function createDefault(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    coins: 0,
    stageStars: {},
    maxUnlocked: 1,
    caught: [],
    caughtStages: [],
    seenStory: [],
    ownedItems: [],
    equipped: {},
  };
}

// 메모리상 단일 상태 (씬들이 공유). load 후 동기 접근.
export const gameState: GameState = createDefault();

localforage.config({ name: 'dogyeom-game', storeName: 'save' });

/** 부팅 시 1회: 저장된 상태를 메모리로 불러와 병합 */
export async function loadState(): Promise<boolean> {
  let oldSave = false;
  try {
    const saved = await localforage.getItem<GameState>(KEY);
    if (saved && saved.schemaVersion) {
      oldSave = (saved.schemaVersion || 0) < 3; // caughtStages 없던 구버전 → 1회 보정 필요
      // 기본값 위에 저장값을 덮어 누락 필드 보강
      const merged = { ...createDefault(), ...saved };
      merged.settings = { ...defaultSettings(), ...(saved.settings || {}) };
      // ops: 기본값 기준으로 enabled / presetIndex 만 안전 복원 (구버전 min/max 는 무시)
      const defOps = defaultSettings().ops;
      const ops = {} as typeof defOps;
      (Object.keys(defOps) as (keyof typeof defOps)[]).forEach((op) => {
        const so = (saved.settings?.ops as Record<string, { enabled?: boolean; presetIndex?: number }>)?.[op] ?? {};
        ops[op] = {
          enabled: typeof so.enabled === 'boolean' ? so.enabled : defOps[op].enabled,
          presetIndex: Number.isInteger(so.presetIndex) ? (so.presetIndex as number) : 0,
        };
      });
      merged.settings.ops = ops;
      if (!Array.isArray(merged.caught)) merged.caught = [];
      if (!Array.isArray(merged.caughtStages)) merged.caughtStages = [];
      if (!Array.isArray(merged.seenStory)) merged.seenStory = [];
      if (!Array.isArray(merged.ownedItems)) merged.ownedItems = [];
      if (!merged.equipped || typeof merged.equipped !== 'object') merged.equipped = {};
      merged.schemaVersion = SCHEMA_VERSION;
      Object.assign(gameState, merged);
    }
  } catch (e) {
    console.warn('[save] load 실패, 기본값 사용:', e);
  }
  return oldSave;
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
export function recordStageClear(index: number, stars: number, reward: number): boolean {
  const wasFirstClear = (gameState.stageStars[index] ?? 0) === 0;
  const prev = gameState.stageStars[index] ?? 0;
  gameState.stageStars[index] = Math.max(prev, stars);
  if (index + 1 > gameState.maxUnlocked) gameState.maxUnlocked = index + 1;
  gameState.coins += reward;
  persist();
  return wasFirstClear; // 포획은 호출부에서 dex.catchRandom() 으로 처리
}

export function saveSettings(): void {
  persist();
}
