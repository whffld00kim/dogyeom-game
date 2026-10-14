// 옛 저장(v1~v9)을 buildMerged(loadState/importSave 공용)가 어떻게 옮기는지 고정해 두는 시험.
// 이 파일은 "고치기 전"에도 통과해야 한다 — 저장 호환이 깨지지 않았음을 보증하는 용도.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('localforage', async () => {
  const { makeFakeLocalforage } = await import('./helpers/fakeLocalforage');
  const { lf, state } = makeFakeLocalforage();
  return { default: Object.assign(lf, { __state: state }) };
});

type SaveModule = typeof import('../src/systems/save');

async function fresh(seed?: Record<string, unknown>) {
  vi.resetModules();
  const lf = (await import('localforage')).default as unknown as { __state: ReturnType<typeof import('./helpers/fakeLocalforage').makeFakeLocalforage>['state'] };
  const st = lf.__state;
  st.reset();
  if (seed) Object.entries(seed).forEach(([k, v]) => st.store.set(k, v));
  const save: SaveModule = await import('../src/systems/save');
  return { save, st };
}

// 실제 커밋 이력에서 확인한 옛 저장 모양들
const V1 = {
  schemaVersion: 1,
  settings: { ops: { add: { enabled: true, min: 1, max: 9 }, sub: { enabled: false, min: 1, max: 9 }, mul: { enabled: true, min: 1, max: 12 }, div: { enabled: true, min: 1, max: 9 } }, answerMode: 'input', mode: 'challenge', timeLevel: 'hard' },
  coins: 37,
  stageStars: { 1: 3, 2: 2, 3: 1 },
  maxUnlocked: 4,
};
const V2 = {
  schemaVersion: 2,
  settings: { ops: { add: { enabled: true, presetIndex: 2 }, sub: { enabled: true, presetIndex: 4 }, mul: { enabled: true, presetIndex: 3 }, div: { enabled: true, presetIndex: 4 } }, answerMode: 'choice', mode: 'explore', timeLevel: 'easy' },
  coins: 120,
  stageStars: { 1: 3, 5: 3, 12: 2 },
  maxUnlocked: 13,
  caught: [1, 2, 3],
};
const V5 = {
  schemaVersion: 5,
  settings: { ops: { add: { enabled: true, presetIndex: 1 }, sub: { enabled: true, presetIndex: 0 }, mul: { enabled: true, presetIndex: 2 }, div: { enabled: false, presetIndex: 3 } }, answerMode: 'choice', mode: 'explore', timeLevel: 'normal', maxMiss: 3, subject: 'mix', hangulLevel: 4 },
  coins: 5,
  stageStars: { 1: 3 },
  maxUnlocked: 2,
  caught: [1],
  caughtStages: [1],
  seenStory: ['관동'],
  ownedItems: ['hat_x'],
  equipped: { '1': { hat: 'hat_x' } },
  outfit: { '1': 'o1_1' },
  ownedOutfits: ['o1_1'],
  soundLevel: 1,
  adminMode: false,
  dailyCatch: { '2026-09-01': 2 },
};
const V8 = {
  ...V5,
  schemaVersion: 8,
  settings: { ...V5.settings, hangulLevel: 2, mixEasier: false },
  shiny: [1],
  shinyMain: [1],
};
const V9 = {
  ...V8,
  schemaVersion: 9,
  settings: { ...V8.settings, shiny: { ops: { add: { enabled: false, presetIndex: 4 }, sub: { enabled: true, presetIndex: 4 }, mul: { enabled: true, presetIndex: 5 }, div: { enabled: true, presetIndex: 5 } }, answerMode: 'input', mode: 'challenge', timeLevel: 'hard', maxMiss: 1, subject: 'hangul', hangulLevel: 5, mixEasier: true } },
};

describe('buildMerged — 옛 저장 이관(loadState)', () => {
  it('v1: min/max 범위 설정은 presetIndex 0으로, 없는 필드는 기본값, 코인·별은 그대로, 구버전 보정 대상(oldSave=true)', async () => {
    const { save } = await fresh({ 'dogyeom-save': V1 });
    const oldSave = await save.loadState();
    expect(oldSave).toBe(true);
    const g = save.gameState;
    expect(g.schemaVersion).toBe(9);
    expect(g.coins).toBe(37);
    expect(g.stageStars).toEqual({ 1: 3, 2: 2, 3: 1 });
    expect(g.maxUnlocked).toBe(4);
    expect(g.settings.ops).toEqual({ add: { enabled: true, presetIndex: 0 }, sub: { enabled: false, presetIndex: 0 }, mul: { enabled: true, presetIndex: 0 }, div: { enabled: true, presetIndex: 0 } });
    expect(g.settings.answerMode).toBe('input');
    expect(g.settings.mode).toBe('challenge');
    expect(g.settings.timeLevel).toBe('hard');
    expect(g.settings.maxMiss).toBe(2);
    expect(g.settings.subject).toBe('math');
    expect(g.settings.hangulLevel).toBe(1);
    expect(g.settings.mixEasier).toBe(true);
    expect(g.caught).toEqual([]);
    expect(g.caughtStages).toEqual([]);
    expect(g.shiny).toEqual([]);
    expect(g.shinyMain).toEqual([]);
    expect(g.dailyCatch).toEqual({});
    expect(g.soundLevel).toBe(2);
    expect(g.adminMode).toBe(false);
    // 반짝이 설정 = 일반 한 단계 위
    expect(g.settings.shiny.ops.mul.presetIndex).toBe(1);
    expect(g.settings.shiny.hangulLevel).toBe(2);
    expect(g.settings.shiny.mixEasier).toBe(false);
  });

  it('v2: 곱셈·나눗셈 presetIndex 3 이상은 +1(두 자리 쉬움 끼움), 덧셈·뺄셈은 그대로', async () => {
    const { save } = await fresh({ 'dogyeom-save': V2 });
    expect(await save.loadState()).toBe(true);
    const o = save.gameState.settings.ops;
    expect(o.add.presetIndex).toBe(2);
    expect(o.sub.presetIndex).toBe(4);
    expect(o.mul.presetIndex).toBe(4);
    expect(o.div.presetIndex).toBe(5);
    expect(save.gameState.caught).toEqual([1, 2, 3]);
    expect(save.gameState.settings.timeLevel).toBe('easy');
  });

  it('v5: 한글 4(옛 이름 쓰기)는 5로, 곱셈 2는 그대로·나눗셈 3은 4로, 꾸미기(v4 미만 아님)는 유지, oldSave=false', async () => {
    const { save } = await fresh({ 'dogyeom-save': V5 });
    expect(await save.loadState()).toBe(false);
    const g = save.gameState;
    expect(g.settings.hangulLevel).toBe(5);
    expect(g.settings.ops.mul.presetIndex).toBe(2);
    expect(g.settings.ops.div.presetIndex).toBe(4);
    expect(g.settings.maxMiss).toBe(3);
    expect(g.settings.subject).toBe('mix');
    expect(g.settings.mixEasier).toBe(true); // 없던 필드 → 기본 켜짐
    expect(g.ownedItems).toEqual(['hat_x']);
    expect(g.equipped).toEqual({ '1': { hat: 'hat_x' } });
    expect(g.outfit).toEqual({ '1': 'o1_1' });
    expect(g.ownedOutfits).toEqual(['o1_1']);
    expect(g.soundLevel).toBe(1);
    expect(g.dailyCatch).toEqual({ '2026-09-01': 2 });
    expect(g.shiny).toEqual([]);
    // 반짝이 설정 = 이관된 일반 설정 한 단계 위 (한글 5 → 5 유지, 곱셈 2 → 3)
    expect(g.settings.shiny.hangulLevel).toBe(5);
    expect(g.settings.shiny.ops.mul.presetIndex).toBe(3);
    expect(g.settings.shiny.ops.div.presetIndex).toBe(5);
    expect(g.settings.shiny.subject).toBe('mix');
    expect(g.settings.shiny.maxMiss).toBe(3);
  });

  it('v3 이하: 꾸미기(ownedItems·equipped)만 초기화되고 코인·도감·별은 유지', async () => {
    const v3 = { ...V5, schemaVersion: 3 };
    const { save } = await fresh({ 'dogyeom-save': v3 });
    await save.loadState();
    const g = save.gameState;
    expect(g.ownedItems).toEqual([]);
    expect(g.equipped).toEqual({});
    expect(g.coins).toBe(5);
    expect(g.caught).toEqual([1]);
    expect(g.stageStars).toEqual({ 1: 3 });
  });

  it('구버전 지우 단일 꾸미기(슬롯→아이템 평면 구조)는 포켓몬별 구조로 리셋', async () => {
    const v5flat = { ...V5, equipped: { hat: 'hat_x', shoes: 'shoes_y' } };
    const { save } = await fresh({ 'dogyeom-save': v5flat });
    await save.loadState();
    expect(save.gameState.equipped).toEqual({});
  });

  it('v8: 반짝이 목록은 유지, settings.shiny 가 없으니 일반 설정 한 단계 위로 생성 (한글 2 → 3, 쉬운 문제 섞기 끔)', async () => {
    const { save } = await fresh({ 'dogyeom-save': V8 });
    await save.loadState();
    const g = save.gameState;
    expect(g.shiny).toEqual([1]);
    expect(g.shinyMain).toEqual([1]);
    expect(g.settings.hangulLevel).toBe(2);
    expect(g.settings.mixEasier).toBe(false);
    expect(g.settings.shiny.hangulLevel).toBe(3);
    expect(g.settings.shiny.mixEasier).toBe(false);
    expect(g.settings.shiny.ops.add.presetIndex).toBe(2);
    expect(g.settings.shiny.ops.div).toEqual({ enabled: false, presetIndex: 4 }); // 끝(5)까지 한 칸, 켜짐 여부 그대로
  });

  it('v9: 그대로 읽힌다(값 하나도 안 바뀜)', async () => {
    const { save } = await fresh({ 'dogyeom-save': V9 });
    await save.loadState();
    const g = save.gameState;
    expect(g.settings).toEqual(V9.settings);
    expect(g.coins).toBe(5);
    expect(g.caught).toEqual([1]);
    expect(g.shiny).toEqual([1]);
    expect(g.outfit).toEqual({ '1': 'o1_1' });
    expect(g.dailyCatch).toEqual({ '2026-09-01': 2 });
  });

  it('exportSave → importSave 왕복은 상태를 그대로 보존한다', async () => {
    const { save } = await fresh({ 'dogyeom-save': V9 });
    await save.loadState();
    const code = save.exportSave();
    expect(code.startsWith('DGM1.')).toBe(true);
    const before = JSON.parse(JSON.stringify(save.gameState));
    const r = await save.importSave(code);
    expect(r.ok).toBe(true);
    expect(save.gameState).toEqual(before);
  });

  it('importSave: v1 백업 코드도 같은 이관을 거친다', async () => {
    const { save } = await fresh();
    const code = 'DGM1.' + Buffer.from(JSON.stringify(V1), 'utf8').toString('base64');
    const r = await save.importSave(code);
    expect(r.ok).toBe(true);
    expect(save.gameState.coins).toBe(37);
    expect(save.gameState.settings.ops.mul.presetIndex).toBe(0);
    expect(save.gameState.schemaVersion).toBe(9);
  });

  it('importSave: 깨진 코드는 거부하고 지금 상태를 건드리지 않는다', async () => {
    const { save } = await fresh({ 'dogyeom-save': V9 });
    await save.loadState();
    const before = JSON.parse(JSON.stringify(save.gameState));
    expect((await save.importSave('DGM1.###')).ok).toBe(false);
    expect((await save.importSave('DGM1.' + Buffer.from('{not json').toString('base64'))).ok).toBe(false);
    expect((await save.importSave('{"hello":1}')).ok).toBe(false);
    expect((await save.importSave('hello')).ok).toBe(false);
    expect((await save.importSave('')).ok).toBe(false);
    expect(save.gameState).toEqual(before);
  });
});
