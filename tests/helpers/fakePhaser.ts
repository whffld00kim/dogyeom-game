// Phaser 없이 씬의 "흐름"만 시험하기 위한 최소 대역. 그림은 전혀 그리지 않고 호출만 받아 준다.
import { vi } from 'vitest';

export function makePhaserStub() {
  class Scene {
    constructor(_config?: unknown) {}
  }
  return {
    Scene,
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
      Between: (a: number, _b: number) => a,
      DegToRad: (d: number) => (d * Math.PI) / 180,
      Distance: { Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1) },
    },
  };
}

type Listener = { fn: (...a: unknown[]) => void; once: boolean };

/** scene.load 대역: image() 로 요청된 키를 기록하고, 시험이 emit('loaderror'|'complete') 로 로더 이벤트를 일으킨다 */
export class FakeLoader {
  requested: string[] = [];
  started = 0;
  private listeners = new Map<string, Listener[]>();
  image(key: string, _url: string) {
    this.requested.push(key);
    return this;
  }
  start() {
    this.started++;
  }
  on(ev: string, fn: (...a: unknown[]) => void) {
    this.listeners.set(ev, [...(this.listeners.get(ev) || []), { fn, once: false }]);
    return this;
  }
  once(ev: string, fn: (...a: unknown[]) => void) {
    this.listeners.set(ev, [...(this.listeners.get(ev) || []), { fn, once: true }]);
    return this;
  }
  off(ev: string, fn?: (...a: unknown[]) => void) {
    if (!fn) this.listeners.delete(ev);
    else this.listeners.set(ev, (this.listeners.get(ev) || []).filter((l) => l.fn !== fn));
    return this;
  }
  listenerCount(ev: string) {
    return (this.listeners.get(ev) || []).length;
  }
  emit(ev: string, ...args: unknown[]) {
    const ls = this.listeners.get(ev) || [];
    this.listeners.set(
      ev,
      ls.filter((l) => !l.once),
    ); // Phaser(eventemitter3)처럼 once 는 호출 전에 빠지고, 호출 중 추가된 리스너는 이번 emit 에 안 들어간다
    ls.forEach((l) => l.fn(...args));
  }
}

/** scene.textures 대역 */
export function fakeTextures(initial: string[] = []) {
  const keys = new Set(initial);
  return {
    keys,
    exists: (k: string) => keys.has(k),
    getTextureKeys: () => [...keys],
    remove: (k: string) => keys.delete(k),
    get: (k: string) => ({ key: k, getSourceImage: () => ({ width: 10, height: 10 }) }),
    addCanvas: (k: string) => keys.add(k),
  };
}

/** scene.add 대역: 어떤 게임오브젝트든 체이닝 가능한 빈 객체를 돌려준다 */
export function fakeAdd() {
  const obj = (): any => {
    const o: any = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scaleX: 1,
      active: true,
      list: [] as unknown[],
    };
    const chain = ['setOrigin', 'setScale', 'setDepth', 'setAlpha', 'setPosition', 'setStrokeStyle', 'setText', 'setFontSize', 'setColor', 'setVisible', 'setSize', 'setAngle', 'setMask', 'addAt', 'setInteractive'];
    chain.forEach((m) => (o[m] = () => o));
    o.add = (c: unknown) => {
      o.list.push(c);
      return o;
    };
    o.removeAll = () => {
      o.list = [];
      return o;
    };
    o.destroy = vi.fn();
    o.once = vi.fn();
    o.on = vi.fn();
    o.clear = () => o;
    o.fillStyle = () => o;
    o.fillRoundedRect = () => o;
    o.lineStyle = () => o;
    o.strokeRoundedRect = () => o;
    o.fillRect = () => o;
    o.fillGradientStyle = () => o;
    o.fillCircle = () => o;
    o.createGeometryMask = () => ({});
    return o;
  };
  return {
    text: obj,
    image: obj,
    graphics: obj,
    container: obj,
    rectangle: obj,
    circle: obj,
    star: obj,
    make: obj,
  };
}
