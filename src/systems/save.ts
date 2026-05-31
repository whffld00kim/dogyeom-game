import localforage from 'localforage';
import type { Settings } from '../types';
import { defaultSettings } from './settings';

const SCHEMA_VERSION = 2;
const KEY = 'dogyeom-save';
const BACKUP_KEY = 'dogyeom-save-backup';

export interface GameState {
  schemaVersion: number;
  settings: Settings;
  coins: number;
  stageStars: Record<number, number>; // 스테이지번호 → 별(1~3)
  maxUnlocked: number; // 해금된 최고 스테이지 번호
  caught: number[]; // 잡은 포켓몬 id 목록
}

export function createDefault(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    coins: 0,
    stageStars: {},
    maxUnlocked: 1,
    caught: [],
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
      merged.schemaVersion = SCHEMA_VERSION;
      Object.assign(gameState, merged);
    }
    // 이미 클리어한 스테이지의 포켓몬을 도감에 소급 적용 (기존 진행 보정)
    for (const k of Object.keys(gameState.stageStars)) {
      const n = Number(k);
      if (n >= 1 && n <= 1025 && (gameState.stageStars[n] ?? 0) > 0 && !gameState.caught.includes(n)) {
        gameState.caught.push(n);
      }
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
export function recordStageClear(index: number, stars: number, reward: number): number | null {
  const wasFirstClear = (gameState.stageStars[index] ?? 0) === 0;
  const prev = gameState.stageStars[index] ?? 0;
  gameState.stageStars[index] = Math.max(prev, stars);
  if (index + 1 > gameState.maxUnlocked) gameState.maxUnlocked = index + 1;
  gameState.coins += reward;
  // 스테이지 N 첫 클리어 → 포켓몬 #N 포획 (1~1025)
  let caughtId: number | null = null;
  if (wasFirstClear && index >= 1 && index <= 1025 && !gameState.caught.includes(index)) {
    gameState.caught.push(index);
    caughtId = index;
  }
  persist();
  return caughtId;
}

export function saveSettings(): void {
  persist();
}
