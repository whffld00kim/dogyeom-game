// 저장 쓰기 안전성: 즉시 쓰기(flush)·쓰기 직렬화·관리자 모드 전환 순서. 고치기 전 코드에서는 실패하는 시험들.
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('persist — 디바운스·즉시 쓰기', () => {
  it('flushPersist 는 300ms 를 기다리지 않고 바로 저장하고, 직전 상태를 백업 슬롯에 남긴다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    save.recordStageClear(4, 2, 5);
    expect(st.store.get(KEY)).toMatchObject({ coins: 42 }); // 아직(디바운스 중)
    await save.flushPersist();
    expect(st.store.get(KEY)).toMatchObject({ coins: 47, stageStars: { 4: 2 } });
    expect(st.store.get(BACKUP)).toMatchObject({ coins: 42 });
    // 이미 다 썼으니 타이머가 나중에 또 돌아도 그대로
    await vi.runAllTimersAsync();
    expect(st.store.get(KEY)).toMatchObject({ coins: 47 });
  });

  it('화면이 가려지면(홈 버튼·앱 전환) 대기 중인 저장을 바로 쓴다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    const listeners: Record<string, (() => void)[]> = {};
    const target = { hidden: false, addEventListener: (t: string, cb: () => void) => (listeners[t] = [...(listeners[t] || []), cb]) };
    save.installBackgroundFlush(target, target);
    save.recordStageClear(4, 3, 5);
    target.hidden = true;
    listeners['visibilitychange']?.forEach((cb) => cb());
    await save.flushPersist(); // 진행 중인 쓰기를 기다리기만 한다
    expect(st.store.get(KEY)).toMatchObject({ coins: 47 });
  });

  it('빠르게 연달아 저장해도 쓰기는 한 번에 하나씩, 마지막 상태가 남는다', async () => {
    vi.useFakeTimers();
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    for (let i = 0; i < 5; i++) {
      save.recordStageClear(10 + i, 3, 1);
      await save.flushPersist();
    }
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(47);
    // get → set(backup) → set(key) 묶음이 서로 끼어들지 않는다
    const ops = st.log.map((l) => `${l.op}:${l.key}`).join(' ');
    expect(ops).not.toMatch(/get:dogyeom-save get:dogyeom-save/);
  });

});

describe('관리자 모드 — 실제 진행이 사라지는 순서를 막는다', () => {
  it('exitAdmin: 실제 상태를 먼저 저장하고 그 다음에 백업을 지운다 (중간에 꺼져도 진행이 남는다)', async () => {
    const { save, st } = await fresh({ [KEY]: real({ adminMode: true, coins: 99999 }), [ADMIN]: real({ coins: 42 }) });
    await save.loadState();
    expect(save.isAdmin()).toBe(true);
    st.dieAfterWrites = 1; // 첫 쓰기 뒤에 앱이 죽는다
    await save.exitAdmin().catch(() => {});
    const stored = st.store.get(KEY) as { coins: number; adminMode: boolean };
    expect(stored.adminMode).toBe(false);
    expect(stored.coins).toBe(42);
  });

  it('enterAdmin: 백업을 먼저 쓴 뒤에만 관리자 상태로 바뀐다 (백업 저장 실패 시 아무것도 안 바뀜)', async () => {
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    st.failSet.add(ADMIN);
    await save.enterAdmin().catch(() => {});
    expect(save.isAdmin()).toBe(false);
    expect(save.gameState.coins).toBe(42);
    await save.flushPersist();
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(42);
  });

  it('enterAdmin 직후 exitAdmin 을 연타해도 실제 진행으로 돌아온다', async () => {
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    const p1 = save.enterAdmin();
    const p2 = save.exitAdmin();
    await Promise.all([p1, p2]);
    expect(save.isAdmin()).toBe(false);
    expect(save.gameState.coins).toBe(42);
    expect(save.gameState.caught).toEqual([1, 2, 3]);
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(42);
    expect(st.store.has(ADMIN)).toBe(false);
  });

  it('관리자 모드로 들어간 채 앱이 죽어도 다시 켜서 끄면 실제 진행이 돌아온다', async () => {
    const { save, st } = await fresh({ [KEY]: real() });
    await save.loadState();
    await save.enterAdmin();
    expect((st.store.get(KEY) as { adminMode: boolean }).adminMode).toBe(true);
    // 앱 재시작
    const again = await (async () => {
      vi.resetModules();
      const lf = (await import('localforage')).default as unknown as { __state: FakeState };
      const s: SaveModule = await import('../src/systems/save');
      return { s, st2: lf.__state };
    })();
    expect(again.st2).toBe(st); // 같은 저장소라야 의미 있는 시험
    await again.s.loadState();
    expect(again.s.isAdmin()).toBe(true);
    expect(again.s.gameState.coins).toBe(99999);
    await again.s.exitAdmin();
    expect(again.s.gameState.coins).toBe(42);
    expect(again.s.gameState.caught).toEqual([1, 2, 3]);
  });

  it('부팅 때 저장을 못 읽은 세션에서는 관리자 모드를 켜지 않는다 (기본값을 백업으로 잘못 남기지 않게)', async () => {
    const { save, st } = await fresh({ [KEY]: real() });
    st.failGet.add('*');
    await save.loadState();
    st.failGet.clear();
    const ok = await save.enterAdmin();
    expect(ok).toBe(false);
    expect(save.isAdmin()).toBe(false);
    expect((st.store.get(KEY) as { coins: number }).coins).toBe(42);
    expect(st.store.has(ADMIN)).toBe(false);
  });
});

