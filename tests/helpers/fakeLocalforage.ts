// localforage 를 흉내 내는 메모리 저장소. 저장 순서 기록·실패 주입·특정 시점 "앱 종료" 흉내를 지원한다.
export type LogEntry = { op: 'get' | 'set' | 'remove'; key: string };

export function makeFakeLocalforage() {
  const store = new Map<string, unknown>();
  const log: LogEntry[] = [];
  const state = {
    store,
    log,
    /** 읽기를 실패시킬 키(모든 키면 '*') */
    failGet: new Set<string>(),
    /** 쓰기를 실패시킬 키 */
    failSet: new Set<string>(),
    /** n번째 쓰기/삭제 이후 "앱이 죽었다" — 그 뒤 모든 쓰기·삭제는 실패(저장소는 그대로) */
    dieAfterWrites: Infinity,
    writes: 0,
    reset() {
      store.clear();
      log.length = 0;
      this.failGet.clear();
      this.failSet.clear();
      this.dieAfterWrites = Infinity;
      this.writes = 0;
    },
  };
  const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  // 실제 IndexedDB 처럼 비동기로 끝난다. 쓰기(트랜잭션 커밋)는 읽기보다 느리게 — 동시 호출의 순서 경쟁을 드러내기 위해
  const tick = () => Promise.resolve();
  const readLatency = async () => { await tick(); };
  const writeLatency = async () => { await tick(); await tick(); };
  const lf = {
    config: () => {},
    async getItem<T>(key: string): Promise<T | null> {
      log.push({ op: 'get', key });
      await readLatency();
      if (state.failGet.has('*') || state.failGet.has(key)) throw new Error(`fake getItem fail: ${key}`);
      return store.has(key) ? clone(store.get(key) as T) : null;
    },
    async setItem<T>(key: string, value: T): Promise<T> {
      log.push({ op: 'set', key });
      const snapshot = clone(value); // IndexedDB 는 put 시점에 구조적 복제
      await writeLatency();
      if (state.failSet.has('*') || state.failSet.has(key)) throw new Error(`fake setItem fail: ${key}`);
      if (state.writes >= state.dieAfterWrites) throw new Error('fake: app died');
      state.writes++;
      store.set(key, snapshot);
      return value;
    },
    async removeItem(key: string): Promise<void> {
      log.push({ op: 'remove', key });
      await writeLatency();
      if (state.writes >= state.dieAfterWrites) throw new Error('fake: app died');
      state.writes++;
      store.delete(key);
    },
  };
  return { lf, state };
}
