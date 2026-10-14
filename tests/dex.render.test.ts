// 도감: 스프라이트 로드가 끝나기 전에 페이지를 넘겼을 때 늦은 콜백이 지금 페이지를 망치지 않아야 한다.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeLoader, fakeTextures, fakeAdd } from './helpers/fakePhaser';

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

describe('DexScene — 빠르게 페이지를 넘길 때', () => {
  it('앞 페이지의 늦은 로드 콜백이 지금 페이지 위에 겹쳐 그리지 않는다', async () => {
    const { gameState } = await import('../src/systems/save');
    gameState.caught = [1, 2];
    const DexScene = (await import('../src/scenes/DexScene')).default;
    const scene: any = new DexScene();
    scene.textures = fakeTextures();
    scene.load = new FakeLoader();
    scene.add = fakeAdd();
    scene.contentLayer = fakeAdd().container();
    scene.regionIdx = 0;
    scene.page = 0;
    scene.drawGrid = vi.fn();
    scene.renderPage(); // 1페이지: 1·2번 스프라이트 로드 대기
    expect(scene.load.requested).toEqual(['poke_1', 'poke_2']);
    scene.page = 1;
    scene.renderPage(); // 곧바로 2페이지(잡은 게 없어 즉시 그림)
    expect(scene.drawGrid).toHaveBeenCalledTimes(1);
    expect(scene.drawGrid.mock.calls[0][0][0]).toBe(25);
    scene.textures.keys.add('poke_1');
    scene.textures.keys.add('poke_2');
    scene.load.emit('complete'); // 1페이지 로드가 이제야 끝남
    expect(scene.drawGrid).toHaveBeenCalledTimes(1); // 2페이지 위에 1페이지를 겹쳐 그리면 안 된다
  });
});
