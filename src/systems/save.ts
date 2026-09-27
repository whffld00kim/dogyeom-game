import localforage from 'localforage';
import type { Settings } from '../types';
import { defaultSettings } from './settings';
import POKEMON_DATA from '../data/pokemon.json';

const SCHEMA_VERSION = 7; // v6: 곱셈·나눗셈 프리셋 '두 자리 쉬움'을 3번에 끼움 → 그 뒤 인덱스 +1 / v7: 한글 4단계에 '두 글자 쓰기'를 끼움 → 옛 4(이름 쓰기)는 5
const KEY = 'dogyeom-save';
const BACKUP_KEY = 'dogyeom-save-backup';
const ADMIN_BACKUP_KEY = 'dogyeom-admin-backup'; // 관리자모드 진입 시 실제 상태 백업
// 보호자 비밀번호는 진행 데이터(KEY)와 분리 보관 — 백업 코드(exportSave)에 담기지 않고
// 관리자모드 복원(exitAdmin)·불러오기(importSave)에도 영향받지 않는다.
const PW_KEY = 'dogyeom-settings-pw';
const POKE_TOTAL = (POKEMON_DATA as unknown[]).length; // 전체 포켓몬 수(1025)

export interface GameState {
  schemaVersion: number;
  settings: Settings;
  coins: number;
  stageStars: Record<number, number>; // 스테이지번호 → 별(1~3)
  maxUnlocked: number; // 해금된 최고 스테이지 번호
  caught: number[]; // 잡은 포켓몬 id 목록
  caughtStages: number[]; // 이미 포획 보상을 준 스테이지 번호(중복 보상 방지)
  seenStory: string[]; // 이미 본 지역 스토리(지역명)
  ownedItems: string[]; // (구버전 범용 아이템) 구매 id — 전용 코디 전환 후 미사용
  equipped: Record<string, Record<string, string>>; // (구버전) 포켓몬별 슬롯 착용 — 미사용
  outfit: Record<string, string>; // 포켓몬 id → 착용 전용 코디 id (하나만)
  ownedOutfits: string[]; // 구매한 전용 코디 id
  soundLevel: number; // 0 끔 / 1 작게 / 2 보통 / 3 크게
  adminMode?: boolean; // 관리자(검증) 모드 — 켜면 코인 99999 + 전 포켓몬 포획(끄면 원복)
  dailyCatch: Record<string, number>; // 'YYYY-MM-DD'(기기 로컬 날짜) → 그날 잡은 포켓몬 수
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
    outfit: {},
    ownedOutfits: [],
    soundLevel: 2,
    adminMode: false,
    dailyCatch: {},
  };
}

/** 오늘 날짜 키(기기 로컬 기준) — 'YYYY-MM-DD' */
export function todayKey(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 오늘 포획 수 +1 (실제 게임 플레이 포획 지점에서만 호출 — 관리자/마이그레이션 제외) */
export function bumpDailyCatch(): void {
  const k = todayKey();
  gameState.dailyCatch[k] = (gameState.dailyCatch[k] || 0) + 1;
}

// 메모리상 단일 상태 (씬들이 공유). load 후 동기 접근.
export const gameState: GameState = createDefault();

localforage.config({ name: 'dogyeom-game', storeName: 'save' });

/** 저장값을 기본값 위에 병합 + 구버전 마이그레이션 → 완성된 GameState (loadState/importSave 공용) */
function buildMerged(saved: any): GameState {
  const merged = { ...createDefault(), ...saved } as GameState;
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
  // v6: MUL_DIV_PRESETS 3번 자리에 '두 자리 쉬움'이 들어가 1~100(3)·1~1000(4)이 한 칸 밀렸다 → 저장값 보정
  if ((saved.schemaVersion || 0) < 6) {
    (['mul', 'div'] as const).forEach((op) => {
      if (ops[op].presetIndex >= 3) ops[op].presetIndex += 1;
    });
  }
  merged.settings.ops = ops;
  merged.settings.mixEasier = typeof merged.settings.mixEasier === 'boolean' ? merged.settings.mixEasier : true;
  // 실수 허용 횟수: 구세이브/외부 코드에서 이상값이면 기본 2로, 1~9 범위로 보정
  merged.settings.maxMiss = Math.max(1, Math.min(9, Math.round(Number(merged.settings.maxMiss) || 2)));
  // 과목/한글 단계: 구세이브·외부 코드 이상값 보정
  const subj = merged.settings.subject;
  merged.settings.subject = subj === 'hangul' || subj === 'mix' ? subj : 'math';
  let hl = Math.round(Number(merged.settings.hangulLevel) || 1);
  // v7: 한글 4번 자리에 '두 글자 쓰기'가 들어가 '이름 쓰기'가 4→5로 밀렸다 → 옛 저장값 보정
  if ((saved.schemaVersion || 0) < 7 && hl >= 4) hl = 5;
  merged.settings.hangulLevel = Math.max(1, Math.min(5, hl));
  if (!Array.isArray(merged.caught)) merged.caught = [];
  if (!Array.isArray(merged.caughtStages)) merged.caughtStages = [];
  if (!Array.isArray(merged.seenStory)) merged.seenStory = [];
  if (!Array.isArray(merged.ownedItems)) merged.ownedItems = [];
  if (!merged.equipped || typeof merged.equipped !== 'object') merged.equipped = {};
  if (!merged.dailyCatch || typeof merged.dailyCatch !== 'object' || Array.isArray(merged.dailyCatch)) merged.dailyCatch = {};
  // 구버전(지우 단일 꾸미기: 슬롯→아이템 평면 구조) 감지 → 포켓몬별 구조로 리셋
  if (Object.values(merged.equipped).some((v) => typeof v === 'string')) merged.equipped = {};
  // v4: 꾸미기 아이템 id 형식 변경(이모지→벡터, 슬롯 6개) → 구버전 꾸미기만 1회 초기화 (코인·도감·별은 유지)
  if ((saved.schemaVersion || 0) < 4) {
    merged.ownedItems = [];
    merged.equipped = {};
  }
  if (!merged.outfit || typeof merged.outfit !== 'object' || Array.isArray(merged.outfit)) merged.outfit = {};
  if (!Array.isArray(merged.ownedOutfits)) merged.ownedOutfits = [];
  if (typeof merged.soundLevel !== 'number') merged.soundLevel = 2;
  merged.schemaVersion = SCHEMA_VERSION;
  return merged;
}

/** 부팅 시 1회: 저장된 상태를 메모리로 불러와 병합 */
export async function loadState(): Promise<boolean> {
  let oldSave = false;
  try {
    const saved = await localforage.getItem<GameState>(KEY);
    if (saved && saved.schemaVersion) {
      oldSave = (saved.schemaVersion || 0) < 3; // caughtStages 없던 구버전 → 1회 보정 필요
      Object.assign(gameState, buildMerged(saved)); // 기본값 위 병합 + 마이그레이션(불러오기와 공유)
    }
  } catch (e) {
    console.warn('[save] load 실패, 기본값 사용:', e);
  }
  try {
    const pw = await localforage.getItem<string>(PW_KEY);
    if (typeof pw === 'string' && PW_RE.test(pw)) settingsPw = pw;
  } catch (e) {
    console.warn('[save] 비밀번호 load 실패, 기본값 사용:', e);
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
  return wasFirstClear; // 포획은 호출부에서 dex.catchNext() 으로 처리
}

export function saveSettings(): void {
  persist();
}

// ── 보호자 비밀번호(설정 화면 잠금) ────────────────────────────────
// 숫자 4자리. 기본 0000, 설정 화면에서 변경·초기화 가능.
// gateSettings 가 동기로 읽으므로 부팅 때(loadState) 메모리에 올려 둔다.
export const DEFAULT_SETTINGS_PW = '0000';
const PW_RE = /^\d{4}$/;
let settingsPw = DEFAULT_SETTINGS_PW;

export function getSettingsPw(): string {
  return settingsPw;
}

/** 숫자 4자리면 저장하고 true, 아니면 아무것도 바꾸지 않고 false */
export async function setSettingsPw(pw: string): Promise<boolean> {
  const t = (pw || '').trim();
  if (!PW_RE.test(t)) return false;
  settingsPw = t;
  try {
    await localforage.setItem(PW_KEY, t);
  } catch (e) {
    console.warn('[save] 비밀번호 저장 실패:', e);
  }
  return true;
}

/** 기본값(0000)으로 되돌리기 */
export async function resetSettingsPw(): Promise<void> {
  settingsPw = DEFAULT_SETTINGS_PW;
  try {
    await localforage.removeItem(PW_KEY);
  } catch (e) {
    console.warn('[save] 비밀번호 초기화 실패:', e);
  }
}

// ── 진행 데이터 백업/복원 (앱 재설치·기기 이동 대비) ───────────────────────
const CODE_PREFIX = 'DGM1.';
function utf8ToB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}
function b64ToUtf8(b: string): string {
  return decodeURIComponent(escape(atob(b)));
}

/** 현재 진행 상태 → 백업 코드 문자열 (카톡·메모에 보관용) */
export function exportSave(): string {
  return CODE_PREFIX + utf8ToB64(JSON.stringify(gameState));
}

/** 백업 코드 → 상태 복원(현재 진행 덮어쓰고 즉시 저장). { ok, msg } 반환 */
export async function importSave(code: string): Promise<{ ok: boolean; msg: string }> {
  const t = (code || '').trim();
  let json: string;
  if (t.startsWith(CODE_PREFIX)) {
    try {
      json = b64ToUtf8(t.slice(CODE_PREFIX.length));
    } catch {
      return { ok: false, msg: '코드를 읽을 수 없어요.' };
    }
  } else if (t.startsWith('{')) {
    json = t; // 순수 JSON 도 허용
  } else {
    return { ok: false, msg: '백업 코드 형식이 아니에요.' };
  }
  let saved: any;
  try {
    saved = JSON.parse(json);
  } catch {
    return { ok: false, msg: '코드가 손상되었어요.' };
  }
  if (!saved || typeof saved !== 'object' || (!Array.isArray(saved.caught) && typeof saved.coins !== 'number')) {
    return { ok: false, msg: '백업 데이터가 아니에요.' };
  }
  try {
    if (timer) {
      clearTimeout(timer); // 대기 중인 디바운스 저장 취소(레이스 방지)
      timer = null;
    }
    Object.assign(gameState, buildMerged(saved));
    const prev = await localforage.getItem<GameState>(KEY);
    if (prev) await localforage.setItem(BACKUP_KEY, prev); // 직전 상태는 백업 슬롯에 보존
    await localforage.setItem(KEY, gameState); // 즉시 저장(디바운스 X)
    return { ok: true, msg: '불러오기 완료!' };
  } catch {
    return { ok: false, msg: '저장에 실패했어요.' };
  }
}

// ── 관리자(검증) 모드 ─────────────────────────────────────────────
// ON: 현재(실제) 상태를 백업 → 코인 99999 + 전 포켓몬 포획 + 전 스테이지 해금.
// OFF: 백업해둔 실제 상태로 복원(검증 중 산 코디·바뀐 설정 등은 모두 버려짐).
// 다시 ON 하면 이전 검증 내용은 사라지고 매번 깨끗한 99999/전포획 상태로 시작.
export function isAdmin(): boolean {
  return !!gameState.adminMode;
}

export async function enterAdmin(): Promise<void> {
  if (gameState.adminMode) return;
  const snapshot = JSON.parse(JSON.stringify(gameState)); // 실제 상태 깊은 복제
  snapshot.adminMode = false;
  gameState.adminMode = true;
  gameState.coins = 99999;
  gameState.caught = Array.from({ length: POKE_TOTAL }, (_, i) => i + 1);
  gameState.maxUnlocked = POKE_TOTAL;
  if (timer) {
    clearTimeout(timer); // 대기중 디바운스 저장 취소(레이스 방지)
    timer = null;
  }
  await localforage.setItem(ADMIN_BACKUP_KEY, snapshot);
  await localforage.setItem(KEY, gameState);
}

export async function exitAdmin(): Promise<void> {
  const backup = await localforage.getItem<GameState>(ADMIN_BACKUP_KEY);
  if (backup) Object.assign(gameState, buildMerged(backup)); // 실제 상태 복원
  gameState.adminMode = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await localforage.removeItem(ADMIN_BACKUP_KEY);
  await localforage.setItem(KEY, gameState);
}
