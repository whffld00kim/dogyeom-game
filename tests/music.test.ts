// 배틀 음악: 파일 디코딩이 끝나기 전에 배틀이 시작되거나, 디코딩 도중 배틀을 나간 경우.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function fakeAudio() {
  const started: { loop: boolean; buffer: unknown }[] = [];
  const stopped: unknown[] = [];
  class FakeGain {
    gain = { value: 1, setTargetAtTime: vi.fn() };
    connect = vi.fn();
    disconnect = vi.fn();
  }
  class FakeCtx {
    state = 'running';
    currentTime = 0;
    destination = {};
    resume = vi.fn(() => Promise.resolve());
    suspend = vi.fn(() => Promise.resolve());
    createGain = () => new FakeGain();
    createMediaElementSource = () => ({ connect: vi.fn() });
    createOscillator = () => ({ type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() });
    createBufferSource = () => {
      const src = {
        buffer: null as unknown,
        loop: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(() => started.push({ loop: src.loop, buffer: src.buffer })),
        stop: vi.fn(() => stopped.push(src)),
      };
      return src;
    };
    decodeAudioData = vi.fn(async (arr: ArrayBuffer) => ({ decodedFrom: arr.byteLength }));
  }
  class FakeAudioEl {
    loop = false;
    preload = '';
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
  }
  const fetchGate = deferred<void>();
  const fetchFn = vi.fn(async () => {
    await fetchGate.promise;
    return { arrayBuffer: async () => new ArrayBuffer(8) };
  });
  vi.stubGlobal('window', { AudioContext: FakeCtx });
  vi.stubGlobal('Audio', FakeAudioEl);
  vi.stubGlobal('fetch', fetchFn);
  return { started, stopped, fetchGate, fetchFn };
}

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('startBattleMusic', () => {
  it('첫 터치로 디코딩이 시작된 뒤 곧바로 배틀에 들어가도, 디코딩이 끝나면 배틀 음악이 난다', async () => {
    const f = fakeAudio();
    const m = await import('../src/systems/music');
    m.startMusic(); // 첫 터치 → 배틀 음악 미리 디코딩 시작(아직 안 끝남)
    m.startBattleMusic(); // 그 사이 배틀 시작
    await flush();
    expect(f.started.length).toBe(0); // 아직 파일이 없으니 못 틀지만
    f.fetchGate.resolve(); // 디코딩 완료
    await flush();
    expect(f.started.length).toBe(1); // 이제 배틀 음악이 흘러야 한다
    expect(f.started[0].loop).toBe(true);
    expect(f.fetchFn).toHaveBeenCalledTimes(1); // 파일은 한 번만 받는다
  });

  it('디코딩이 끝나기 전에 배틀을 나가면, 나중에 디코딩이 끝나도 배틀 음악을 틀지 않는다 (BGM 과 겹치지 않게)', async () => {
    const f = fakeAudio();
    const m = await import('../src/systems/music');
    m.startMusic();
    m.startBattleMusic();
    m.stopBattleMusic(); // 맵으로 나감
    f.fetchGate.resolve();
    await flush();
    expect(f.started.length).toBe(0);
    // 다음 배틀은 정상적으로 한 번만
    m.startBattleMusic();
    await flush();
    expect(f.started.length).toBe(1);
    m.startBattleMusic(); // 반복 호출 안전
    await flush();
    expect(f.started.length).toBe(1);
  });
});
