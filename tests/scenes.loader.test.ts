// 씬의 로더 콜백 흐름: 그림 파일이 없거나(loaderror) 로드가 늦게 끝났을 때 같은 일이 두 번 일어나지 않아야 한다.
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

describe('GameScene — 지역 배경 로드 → 적 스프라이트 로드 → 첫 문제', () => {
  async function setup() {
    const GameScene = (await import('../src/scenes/GameScene')).default;
    const scene: any = new GameScene();
    scene.textures = fakeTextures();
    scene.load = new FakeLoader();
    scene.add = fakeAdd();
    scene.targetId = 5; // 관동 → 지역 0
    scene.nextProblem = vi.fn();
    return scene;
  }

  it('배경 그림이 없어도(loaderror + complete) 첫 문제는 한 번만 시작된다', async () => {
    const scene = await setup();
    scene.loadRegionBgThenStart();
    expect(scene.load.requested).toEqual(['bg_r0']);
    scene.load.emit('loaderror', { key: 'bg_r0' }); // 파일 없음
    scene.load.emit('complete'); // 로더는 실패해도 complete 를 낸다
    // 이제 적 스프라이트 로드가 끝난다
    scene.textures.keys.add('poke_5');
    scene.load.emit('complete');
    expect(scene.nextProblem).toHaveBeenCalledTimes(1);
  });

  it('배경이 잘 로드된 뒤 다른 파일이 실패해도(한글 문제의 랜덤 포켓몬 등) 문제 흐름이 다시 시작되지 않는다', async () => {
    const scene = await setup();
    scene.loadRegionBgThenStart();
    scene.textures.keys.add('bg_r0');
    scene.textures.keys.add('poke_5');
    scene.load.emit('complete');
    expect(scene.nextProblem).toHaveBeenCalledTimes(1);
    scene.load.emit('loaderror', { key: 'poke_777' }); // 나중에 다른 그림이 없음
    scene.load.emit('complete');
    expect(scene.nextProblem).toHaveBeenCalledTimes(1);
    expect(scene.load.listenerCount('loaderror')).toBe(0); // 묵은 리스너가 남지 않는다
  });

  it('배경이 이미 있으면 바로 시작한다', async () => {
    const scene = await setup();
    scene.textures.keys.add('rbg0');
    scene.textures.keys.add('poke_5');
    scene.loadRegionBgThenStart();
    expect(scene.nextProblem).toHaveBeenCalledTimes(1);
    expect(scene.load.requested).toEqual([]);
  });
});

describe('StageMapScene — 지역 선택 화면 배경 로드', () => {
  it('그림 파일이 없어도 지역 상자는 한 번만 그린다', async () => {
    const StageMapScene = (await import('../src/scenes/StageMapScene')).default;
    const scene: any = new StageMapScene();
    scene.textures = fakeTextures();
    scene.load = new FakeLoader();
    scene.add = fakeAdd();
    scene.ui = fakeAdd().container();
    scene.view = 'regions';
    scene.topBar = vi.fn();
    scene.placeRegionsBgAndBoxes = vi.fn();
    scene.renderRegions();
    expect(scene.load.requested.length).toBe(10); // 전체 배경 + 9지역
    scene.load.emit('loaderror', { key: 'rbg3' });
    expect(scene.placeRegionsBgAndBoxes).toHaveBeenCalledTimes(0); // 아직 다른 그림이 오는 중
    scene.load.emit('complete');
    expect(scene.placeRegionsBgAndBoxes).toHaveBeenCalledTimes(1);
  });
});
