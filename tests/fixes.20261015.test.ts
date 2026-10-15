// 2026-10-15 사용자 요청 세 가지: 반짝이 그림을 매번 다시 만들지 않기 · 마지막 스테이지의 '다음' · 관리자 모드 중 백업 막기
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', async () => {
  const { makePhaserStub } = await import('./helpers/fakePhaser');
  const P = makePhaserStub();
  return { default: P, ...P };
});
vi.mock('localforage', async () => {
  const { makeFakeLocalforage } = await import('./helpers/fakeLocalforage');
  return { default: makeFakeLocalforage().lf };
});

beforeEach(() => vi.resetModules());

describe('반짝이 그림 — 지금 화면 것은 지우지 않는다', () => {
  it('남길 키에 보통 그림과 반짝이 그림이 모두 들어간다', async () => {
    const { pokeKeepKeys } = await import('../src/systems/dex');
    const keep = pokeKeepKeys([25, 150]);
    expect([...keep].sort()).toEqual(['poke_150', 'poke_25', 'poke_shiny_150', 'poke_shiny_25']);
  });

  it('도감 페이지를 바꿔도 지금 페이지의 반짝이 그림은 남고, 다른 페이지 것만 지워진다', async () => {
    const { fakeTextures } = await import('./helpers/fakePhaser');
    const DexScene = (await import('../src/scenes/DexScene')).default;
    const scene: any = new DexScene();
    scene.textures = fakeTextures();
    ['poke_1', 'poke_shiny_1', 'poke_2', 'poke_shiny_2', 'poke_99', 'poke_shiny_99'].forEach((k) => scene.textures.keys.add(k));
    scene.freeTexturesExcept([1, 2]);
    expect([...scene.textures.keys].sort()).toEqual(['poke_1', 'poke_2', 'poke_shiny_1', 'poke_shiny_2']);
  });
});

describe('마지막 스테이지(1025)', () => {
  it("배틀 화면은 1025를 넘는 스테이지 번호를 1025로 자른다 ('다음'이 1026을 열던 문제)", async () => {
    const GameScene = (await import('../src/scenes/GameScene')).default;
    const { TOTAL } = await import('../src/systems/dex');
    const scene: any = new GameScene();
    scene.init({ index: TOTAL + 1 });
    expect(scene.index).toBe(TOTAL);
    scene.init({ index: 0 });
    expect(scene.index).toBe(1);
    scene.init({});
    expect(scene.index).toBe(1);
    scene.init({ index: 300 });
    expect(scene.index).toBe(300);
  });
});

describe('관리자 모드 중 백업', () => {
  it('관리자 모드 중에는 백업 코드를 만들지 않고, 끄고 나면 다시 만든다', async () => {
    const save = await import('../src/systems/save');
    save.gameState.coins = 120;
    save.gameState.caught = [1, 4, 7];
    expect(save.exportSave()).not.toBe('');
    expect(await save.enterAdmin()).toBe(true);
    expect(save.gameState.coins).toBe(99999);
    expect(save.exportSave()).toBe('');
    expect(await save.exitAdmin()).toBe(true);
    const code = save.exportSave();
    expect(code).not.toBe('');
    // 끈 뒤의 코드는 진짜 기록(코인 120·3마리)을 담는다
    const r = await save.importSave(code);
    expect(r.ok).toBe(true);
    expect(save.gameState.coins).toBe(120);
    expect(save.gameState.caught).toEqual([1, 4, 7]);
  });
});
