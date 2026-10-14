// 저장 읽기 안전성: 백업 슬롯 복구·읽기 실패 뒤 덮어쓰기 방지·깨진 값 보정. 고치기 전 코드에서는 실패하는 시험들.
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('localforage', async () => {
  const { makeFakeLocalforage } = await import('./helpers/fakeLocalforage');
  const { lf, state } = makeFakeLocalforage();
  return { default: Object.assign(lf, { __state: state }) };
});

type SaveModule = typeof import('../src/systems/save');
type FakeState = ReturnType<typeof import('./helpers/fakeLocalforage').makeFakeLocalforage>['state'];

async function fresh(seed?: Record<string, unknown>) {
  vi.resetModules();
  const lf = (await import('localforage')).default as unknown as { __state: FakeState };
  const st = lf.__state;
  st.reset();
  if (seed) Object.entries(seed).forEach(([k, v]) => st.store.set(k, v));
  const save: SaveModule = await import('../src/systems/save');
  return { save, st };
}

const KEY = 'dogyeom-save';
const BACKUP = 'dogyeom-save-backup';
const ADMIN = 'dogyeom-admin-backup';

function real(extra: Record<string, unknown> = {}) {
  return { schemaVersion: 9, coins: 42, caught: [1, 2, 3], stageStars: { 1: 3, 2: 3, 3: 2 }, maxUnlocked: 4, shiny: [2], ...extra };
}

/** 디바운스 타이머가 돈 뒤 비동기 쓰기가 끝날 때까지 */
async function settle() {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('loadState — 백업 슬롯 복구', () => {
  it('주 슬롯을 읽지 못하면 직전 백업 슬롯으로 복구한다', async () => {
    const { save, st } = await fresh({ [KEY]: real({ coins: 99 }), [BACKUP]: real({ coins: 42 }) });
    st.failGet.add(KEY);
    await save.loadState();
    expect(save.gameState.coins).toBe(42);
    expect(save.gameState.caught).toEqual([1, 2, 3]);
  });

  it('주 슬롯이 비어 있고 백업만 있으면 백업을 쓴다', async () => {
    const { save } = await fresh({ [BACKUP]: real() });
    await save.loadState();
    expect(save.gameState.coins).toBe(42);
  });

  it('둘 다 없으면(처음 설치) 기본값', async () => {
    const { save } = await fresh();
    await save.loadState();
    expect(save.gameState.coins).toBe(0);
    expect(save.gameState.caught).toEqual([]);
  });
});

describe('persist — 부팅 때 저장을 못 읽었으면 저장된 진행을 덮어쓰지 않는다', () => {
  it('읽기가 잠깐 실패했다가 돌아오면, 기본값으로 덮어쓰지 않고 저장된 진행이 남는다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh({ [KEY]: real() });
    st.failGet.add('*');
    await save.loadState(); // 기본값으로 시작
    expect(save.gameState.coins).toBe(0);
    st.failGet.clear(); // 저장소가 다시 읽힌다
    save.recordStageClear(1, 3, 5); // 아이가 한 판 깸 → persist()
    await vi.runAllTimersAsync();
    await settle();
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(42); // 실제 진행 그대로
  });

  it('읽기 실패 뒤에도 저장소가 정말 비어 있으면 저장한다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh();
    st.failGet.add('*');
    await save.loadState();
    st.failGet.clear();
    save.recordStageClear(1, 3, 5);
    await vi.runAllTimersAsync();
    await settle();
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(5);
  });

  it('정상 부팅 뒤 백업 회전용 읽기가 실패해도 본 저장은 된다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    st.failGet.add(KEY);
    save.recordStageClear(4, 3, 5);
    await vi.runAllTimersAsync();
    await settle();
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(47);
  });
});

describe('persist — 지속 저장소', () => {
  it('부팅 때 지속 저장소(persistent storage)를 요청한다', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { storage: { persist } });
    const { save } = await fresh();
    await save.loadState();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe('깨진 값·틀린 타입 보정 (importSave / loadState 공용)', () => {
  function junkCode(obj: unknown): string {
    return 'DGM1.' + Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
  }

  it('코인이 문자열·음수·NaN 이어도 숫자로 보정되고 이후 보상이 숫자로 더해진다', async () => {
    const { save } = await fresh();
    expect((await save.importSave(junkCode({ schemaVersion: 9, coins: '12', caught: [] }))).ok).toBe(true);
    expect(save.gameState.coins).toBe(12);
    save.recordStageClear(1, 3, 5);
    expect(save.gameState.coins).toBe(17);
    expect((await save.importSave(junkCode({ schemaVersion: 9, coins: -7, caught: [] }))).ok).toBe(true);
    expect(save.gameState.coins).toBe(0);
    expect((await save.importSave(junkCode({ schemaVersion: 9, coins: 'abc', caught: [] }))).ok).toBe(true);
    expect(save.gameState.coins).toBe(0);
  });

  it('도감·반짝이 목록에 섞인 쓰레기(문자열·범위 밖·중복)는 걸러진다', async () => {
    const { save } = await fresh();
    await save.importSave(junkCode({ schemaVersion: 9, coins: 0, caught: [3, '5', 3, 0, -1, 1026, 1025, 2.5, null], shiny: [3, 'x', 9999], shinyMain: 'nope', caughtStages: [1, 'a', 2] }));
    expect(save.gameState.caught).toEqual([3, 1025]);
    expect(save.gameState.shiny).toEqual([3]);
    expect(save.gameState.shinyMain).toEqual([]);
    expect(save.gameState.caughtStages).toEqual([1, 2]);
  });

  it('별·해금·소리·관리자·코디 값이 이상해도 멈추지 않고 보정된다', async () => {
    const { save } = await fresh();
    await save.importSave(junkCode({ schemaVersion: 9, coins: 1, caught: [], stageStars: [3, 3], maxUnlocked: 'x', soundLevel: 9, adminMode: 'yes', outfit: { '1': 5, '2': 'o2_1', x: 'o1_1' }, ownedOutfits: ['o1_1', 4], seenStory: ['관동', 1] }));
    expect(save.gameState.stageStars).toEqual({});
    expect(save.gameState.maxUnlocked).toBe(1);
    expect(save.gameState.soundLevel).toBe(3);
    expect(save.gameState.adminMode).toBe(false);
    expect(save.gameState.outfit).toEqual({ '2': 'o2_1' });
    expect(save.gameState.ownedOutfits).toEqual(['o1_1']);
    expect(save.gameState.seenStory).toEqual(['관동']);
    await save.importSave(junkCode({ schemaVersion: 9, coins: 1, caught: [], stageStars: { 1: 3, 2: '2', 3: 0, 4: -1, abc: 3, 5: 9 } }));
    expect(save.gameState.stageStars).toEqual({ 1: 3, 2: 2, 5: 3 });
  });

  it('일일 기록의 날짜 키·값이 이상하면 걸러지고, 오늘 포획이 숫자로 더해진다', async () => {
    const { save } = await fresh();
    await save.importSave(junkCode({ schemaVersion: 9, coins: 1, caught: [], dailyCatch: { '2026-10-01': 3, '2026-10-02': '2', bad: 1, '2026-10-03': -1, '2026-10-04': 'x' } }));
    expect(save.gameState.dailyCatch).toEqual({ '2026-10-01': 3, '2026-10-02': 2 });
    save.bumpDailyCatch();
    expect(save.gameState.dailyCatch[save.todayKey()]).toBe(1);
  });

  it('모드·답하기·제한시간이 이상하면 기본값(탐험·선택·보통)으로 — 타이머가 NaN 이 되지 않게', async () => {
    const { save } = await fresh();
    await save.importSave(junkCode({ schemaVersion: 9, coins: 1, caught: [], settings: { mode: 'turbo', answerMode: 7, timeLevel: 'ultra', shiny: { timeLevel: 'hard' } } }));
    expect(save.gameState.settings.mode).toBe('explore');
    expect(save.gameState.settings.answerMode).toBe('choice');
    expect(save.gameState.settings.timeLevel).toBe('normal');
    expect(save.gameState.settings.shiny.timeLevel).toBe('hard');
  });

  it('settings 가 객체가 아니어도 기본 설정으로 읽힌다', async () => {
    const { save } = await fresh();
    expect((await save.importSave(junkCode({ schemaVersion: 9, coins: 3, caught: [], settings: 'oops' }))).ok).toBe(true);
    expect(save.gameState.settings.ops.add).toEqual({ enabled: true, presetIndex: 0 });
    expect(save.gameState.settings.shiny.ops.mul.presetIndex).toBe(1);
    expect((await save.importSave(junkCode({ schemaVersion: 9, coins: 3, caught: [], settings: null }))).ok).toBe(true);
    expect(save.gameState.settings.subject).toBe('math');
  });
});
