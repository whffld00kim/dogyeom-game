import Phaser from 'phaser';
import POKEMON_DATA from '../data/pokemon.json';
import { gameState, persist } from './save';

export interface Pokemon {
  id: number;
  name: string;
}

export const POKEMON: Pokemon[] = POKEMON_DATA as Pokemon[];
export const TOTAL = POKEMON.length; // 1025

export function getName(id: number): string {
  const p = POKEMON[id - 1];
  return p ? p.name : `#${id}`;
}

export function isCaught(id: number): boolean {
  return gameState.caught.includes(id);
}

export function caughtCount(): number {
  return gameState.caught.length;
}

// 실제 스프라이트 적용 전까지 쓰는 임시 색 (id 기반으로 일정)
const PALETTE = [
  0xff6b6b, 0xffa726, 0xffd24a, 0x7cc63e, 0x4dd0e1, 0x6c8cff, 0xb085f5, 0xff80ab, 0x8d6e63, 0x90a4ae,
];
export function placeholderColor(id: number): number {
  return PALETTE[id % PALETTE.length];
}

// ── 실제 포켓몬 스프라이트 (있으면 사용, 없으면 도형으로 대체) ──
// 스프라이트 파일 버전: 파일명이 동일(sprites/{id}.png)해 구버전 SW/브라우저 캐시가 옛 이미지를
// 그대로 서빙하는 문제를 피하려 URL에 ?v= 를 붙임. 스프라이트 화질을 바꾸면 이 숫자를 올릴 것.
const SPRITE_VER = '4'; // v48: PNG → WebP 변환(용량 ~1/3, 화질 동일), 캐시 무효화 위해 버전 올림
export function pokeKey(id: number): string {
  return `poke_${id}`;
}

/** 필요한 포켓몬 스프라이트를 로드한 뒤 done() 호출. 파일이 없으면(공개 Pages 등) 자동으로 건너뛰고 placeholder 사용. */
export function loadPokeSprites(scene: Phaser.Scene, ids: number[], done: () => void): void {
  const need = ids.filter((id) => id >= 1 && !scene.textures.exists(pokeKey(id)));
  if (need.length === 0) {
    done();
    return;
  }
  need.forEach((id) => scene.load.image(pokeKey(id), `sprites/${id}.webp?v=${SPRITE_VER}`));
  scene.load.once('complete', done);
  scene.load.start();
}

/** 흰 배경(테두리 연결된 밝은 무채색)을 투명화해 캔버스 텍스처(dstKey)로 등록. (지우 이미지 등) */
export function cutoutToTexture(scene: Phaser.Scene, srcKey: string, dstKey: string): boolean {
  if (!scene.textures.exists(srcKey)) return false;
  try {
    const src = scene.textures.get(srcKey).getSourceImage() as HTMLImageElement;
    const w = src.width as number;
    const h = src.height as number;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(src as CanvasImageSource, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const isBg = (i: number) => {
      const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      if (a < 8) return true;
      return Math.max(r, g, b) - Math.min(r, g, b) <= 18 && (r + g + b) / 3 >= 210;
    };
    const seen = new Uint8Array(w * h);
    const st: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const p = y * w + x;
      if (!seen[p]) {
        seen[p] = 1;
        st.push(p);
      }
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (st.length) {
      const p = st.pop()!;
      const i = p * 4;
      if (!isBg(i)) continue;
      d[i + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    ctx.putImageData(img, 0, 0);
    if (scene.textures.exists(dstKey)) scene.textures.remove(dstKey);
    scene.textures.addCanvas(dstKey, cv);
    return true;
  } catch {
    return false;
  }
}

/** 주인공 지우(Ash): 'ash' 텍스처가 있으면 이미지, 없으면 벡터로 그림. size = 대략 키. */
export function addAsh(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.GameObject {
  if (scene.textures.exists('ash')) {
    const img = scene.add.image(x, y, 'ash');
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }
  const c = scene.add.container(x, y);
  const u = size;
  const D = Phaser.Math.DegToRad;
  const g = scene.add.graphics();

  // 몸통(파란 재킷)
  g.fillStyle(0x2f57b5, 1);
  g.fillRoundedRect(-0.24 * u, 0.06 * u, 0.48 * u, 0.45 * u, 0.12 * u);
  // 흰 소매
  g.fillStyle(0xe8eeff, 1);
  g.fillRoundedRect(-0.31 * u, 0.1 * u, 0.12 * u, 0.3 * u, 0.06 * u);
  g.fillRoundedRect(0.19 * u, 0.1 * u, 0.12 * u, 0.3 * u, 0.06 * u);
  // 흰 옷깃
  g.fillStyle(0xeef2ff, 1);
  g.fillTriangle(-0.13 * u, 0.07 * u, 0.13 * u, 0.07 * u, 0, 0.22 * u);
  // 목
  g.fillStyle(0xffcf9e, 1);
  g.fillRect(-0.06 * u, -0.02 * u, 0.12 * u, 0.12 * u);

  // 머리
  g.fillStyle(0xffd9a8, 1);
  g.fillCircle(0, -0.14 * u, 0.25 * u);
  g.lineStyle(Math.max(2, 0.01 * u), 0xe7b483, 1);
  g.strokeCircle(0, -0.14 * u, 0.25 * u);

  // 머리카락(검정) 옆/아래 삐죽
  g.fillStyle(0x2c2118, 1);
  g.fillTriangle(-0.255 * u, -0.17 * u, -0.255 * u, 0.01 * u, -0.12 * u, -0.09 * u);
  g.fillTriangle(0.255 * u, -0.17 * u, 0.255 * u, 0.01 * u, 0.12 * u, -0.09 * u);
  g.fillTriangle(-0.07 * u, 0.08 * u, 0.07 * u, 0.08 * u, 0, -0.02 * u);

  // 눈
  g.fillStyle(0x2b2b2b, 1);
  g.fillEllipse(-0.095 * u, -0.08 * u, 0.07 * u, 0.1 * u);
  g.fillEllipse(0.095 * u, -0.08 * u, 0.07 * u, 0.1 * u);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(-0.08 * u, -0.1 * u, 0.02 * u);
  g.fillCircle(0.11 * u, -0.1 * u, 0.02 * u);
  // 볼터치
  g.fillStyle(0xff9aa2, 1);
  g.fillCircle(-0.17 * u, -0.01 * u, 0.035 * u);
  g.fillCircle(0.17 * u, -0.01 * u, 0.035 * u);
  // 입(미소)
  g.lineStyle(Math.max(2, 0.014 * u), 0x9a5a37, 1);
  g.beginPath();
  g.arc(0, 0.0 * u, 0.05 * u, D(20), D(160), false);
  g.strokePath();

  // 모자(빨강 돔)
  g.fillStyle(0xe5392f, 1);
  g.beginPath();
  g.slice(0, -0.18 * u, 0.285 * u, D(180), D(360), false);
  g.closePath();
  g.fillPath();
  // 모자 챙(앞으로)
  g.fillStyle(0xc62f27, 1);
  g.fillEllipse(0, -0.18 * u, 0.56 * u, 0.1 * u);
  // 흰 앞판
  g.fillStyle(0xf4f4f4, 1);
  g.fillEllipse(0, -0.25 * u, 0.27 * u, 0.14 * u);
  // 초록 마크(반원)
  g.fillStyle(0x36a45a, 1);
  g.beginPath();
  g.slice(0, -0.25 * u, 0.07 * u, D(0), D(180), false);
  g.closePath();
  g.fillPath();

  c.add(g);
  return c;
}

// ── 반짝이(색이 다른 포켓몬) — 2026-10-06 ──
// 도감을 다 채운 뒤에도 잡을 거리가 남게, 이미 잡은 스테이지를 한 단계 어려운 문제로 다시 깨면 '반짝이'가 잡힌다.
// 그림은 새로 넣지 않고 원본 스프라이트의 색상(hue)만 돌려 캔버스 텍스처로 만든다(용량 無). 흰색·검은 테두리는 그대로.
export const SHINY_GOLD = 0xffc428;
export const SHINY_GOLD_CSS = '#c98a00';

export function isShiny(id: number): boolean {
  return gameState.shiny.includes(id);
}
export function shinyCount(): number {
  return gameState.shiny.length;
}
/** 반짝이 포획. 보통을 아직 안 잡았거나 이미 반짝이면 null. */
export function catchShiny(id: number): number | null {
  if (id < 1 || id > TOTAL) return null;
  if (!gameState.caught.includes(id) || gameState.shiny.includes(id)) return null;
  gameState.shiny.push(id);
  persist();
  return id;
}
export function shinyKey(id: number): string {
  return `poke_shiny_${id}`;
}
/** 텍스처 해제 때 남길 키: 보통 그림 + 그 포켓몬의 반짝이 그림.
 *  반짝이도 `poke_` 로 시작해 전엔 지금 화면의 반짝이까지 지웠다 → 톡·넘김마다 색 변환을 다시 했다 (2026-10-15) */
export function pokeKeepKeys(ids: number[]): Set<string> {
  const keep = new Set<string>();
  ids.forEach((id) => {
    keep.add(pokeKey(id));
    keep.add(shinyKey(id));
  });
  return keep;
}
/** 도감 메인 그림이 반짝이인지(반짝이를 잡은 것만 의미 있음) */
export function isShinyMain(id: number): boolean {
  return isShiny(id) && gameState.shinyMain.includes(id);
}
/** 도감 칸 톡: 메인 그림을 반짝이 ↔ 보통으로. 반짝이를 안 잡았으면 false */
export function toggleShinyMain(id: number): boolean {
  if (!isShiny(id)) return false;
  const i = gameState.shinyMain.indexOf(id);
  if (i >= 0) gameState.shinyMain.splice(i, 1);
  else gameState.shinyMain.push(id);
  persist();
  return true;
}

// 반짝이 색 후보(도 단위): 금 · 얼음 · 보라 · 장미 · 에메랄드 · 바다 · 청록 · 진홍 · 자홍 · 초록.
// 원본의 주된 색에서 100° 이상 떨어진 것만 골라 "같은 포켓몬인데 색이 확 다르다"가 되게 한다.
// (처음엔 70°·라임·코랄도 넣었는데 이상해씨가 올리브, 팬텀이 카키가 돼 칙칙했다 — 2026-10-06 미리 보기로 확인)
const SHINY_HUES = [48, 205, 275, 335, 150, 230, 180, 0, 300, 120];
const SHINY_MIN_DIST = 100;

function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}
function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
/** 이 포켓몬의 반짝이 목표 색. id마다 정해져 있어 늘 같은 색이 나온다 */
export function shinyTargetHue(id: number, dominant: number): number {
  const n = SHINY_HUES.length;
  let i = (id * 7 + Math.round(dominant / 36)) % n;
  for (let k = 0; k < n; k++) {
    const h = SHINY_HUES[(i + k) % n];
    if (hueDist(h, dominant) >= SHINY_MIN_DIST) return h;
  }
  return SHINY_HUES[i];
}

/** 원본 스프라이트(poke_{id})가 로드돼 있으면 반짝이 텍스처를 만든다. 만들었거나 이미 있으면 true */
export function ensureShinyTexture(scene: Phaser.Scene, id: number): boolean {
  const key = shinyKey(id);
  if (scene.textures.exists(key)) return true;
  const base = pokeKey(id);
  if (!scene.textures.exists(base)) return false;
  try {
    const src = scene.textures.get(base).getSourceImage() as HTMLImageElement;
    const w = src.width as number, h = src.height as number;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(src as CanvasImageSource, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // 1) 주된 색: 채도·밝기 있는 픽셀의 hue 히스토그램(36칸)
    const bins = new Float32Array(36);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 32) continue;
      const [hh, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2]);
      if (s < 0.3 || v < 0.25) continue;
      bins[Math.floor(hh / 10) % 36] += s * v;
    }
    let best = 0;
    for (let b = 1; b < 36; b++) if (bins[b] > bins[best]) best = b;
    const dominant = best * 10 + 5;
    const shift = shinyTargetHue(id, dominant) - dominant;
    // 2) 색 돌리기 — 흰색·회색·검은 테두리(채도 낮거나 아주 어두움)는 그대로, 나머지는 hue 이동 + 채도 살짝 올림
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const [hh, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2]);
      if (s < 0.12 || v < 0.18) continue;
      const [r, g, b] = hsv2rgb((((hh + shift) % 360) + 360) % 360, Math.min(1, s * 1.2), Math.min(1, v * 1.03));
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(key, cv);
    return true;
  } catch {
    return false;
  }
}

/** 반짝이 별 가루: (x,y) 주위 size 안에 금빛 별 n개가 번갈아 반짝인다. 담은 컨테이너가 파괴되면 트윈도 정리 */
export function addSparkles(scene: Phaser.Scene, x: number, y: number, size: number, n = 6): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const tweens: Phaser.Tweens.Tween[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + (i % 2) * 0.4;
    const rad = size * (0.42 + (i % 3) * 0.08);
    const r = size * (0.06 + (i % 2) * 0.03);
    const st = scene.add.star(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.85, 4, r * 0.38, r, SHINY_GOLD);
    st.setStrokeStyle(Math.max(1, r * 0.18), 0xffffff, 0.9);
    st.setScale(0.4).setAlpha(0.5);
    c.add(st);
    tweens.push(
      scene.tweens.add({ targets: st, scale: { from: 0.4, to: 1.1 }, alpha: { from: 0.5, to: 1 }, angle: 25, duration: 520 + i * 70, yoyo: true, repeat: -1, delay: i * 140, ease: 'Sine.inOut' }),
    );
  }
  c.once('destroy', () => tweens.forEach((t) => t.remove()));
  return c;
}

/** 포켓몬 아이콘 생성: 스프라이트가 있으면 이미지, 없으면 색 원(placeholder). shiny면 반짝이 텍스처(원본이 있어야 함) */
export function addPokeIcon(scene: Phaser.Scene, x: number, y: number, id: number, size: number, shiny = false): Phaser.GameObjects.GameObject {
  if (shiny && ensureShinyTexture(scene, id)) {
    const img = scene.add.image(x, y, shinyKey(id));
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }
  if (scene.textures.exists(pokeKey(id))) {
    const img = scene.add.image(x, y, pokeKey(id));
    img.setScale(size / Math.max(img.width, img.height));
    return img;
  }
  const c = scene.add.container(x, y);
  const circ = scene.add.circle(0, 0, size * 0.46, placeholderColor(id));
  circ.setStrokeStyle(4, 0xffffff);
  c.add([
    circ,
    scene.add.circle(-size * 0.16, -size * 0.08, size * 0.085, 0xffffff),
    scene.add.circle(size * 0.16, -size * 0.08, size * 0.085, 0xffffff),
  ]);
  return c;
}

// ── 스프라이트 실제 외곽(알파 바운딩박스) ── 꾸미기 아이템을 포켓몬 머리/얼굴/옆에 정확히 얹기 위함.
interface Box { w: number; h: number; minX: number; minY: number; maxX: number; maxY: number }
const _boxCache = new Map<string, Box>();
function contentBox(scene: Phaser.Scene, key: string): Box | null {
  if (_boxCache.has(key)) return _boxCache.get(key)!;
  try {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = src.width as number;
    const h = src.height as number;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(src as CanvasImageSource, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 16) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const box: Box = found ? { w, h, minX, minY, maxX, maxY } : { w, h, minX: 0, minY: 0, maxX: w - 1, maxY: h - 1 };
    _boxCache.set(key, box);
    return box;
  } catch {
    return null;
  }
}

export interface IconAnchors {
  headX: number; headY: number; // 머리 위 중앙 (모자)
  faceX: number; faceY: number; // 얼굴 (안경)
  neckX: number; neckY: number; // 목 (목걸이)
  bodyX: number; bodyY: number; // 몸통 (옷)
  sideX: number; sideY: number; // 옆 (무기)
  feetX: number; feetY: number; // 발 (신발)
  cw: number; // 화면상 콘텐츠 가로폭
  ch: number; // 화면상 콘텐츠 세로높이
}

/** 포켓몬 아이콘(중심 x,y / 크기 size) 위에서 6슬롯 착용 위치를 스프라이트 실제 외곽 기준으로 자동 계산(종별 수작업 불필요). */
export function pokeAnchors(scene: Phaser.Scene, id: number, x: number, y: number, size: number): IconAnchors {
  const key = pokeKey(id);
  const box = scene.textures.exists(key) ? contentBox(scene, key) : null;
  if (!box) {
    // placeholder(도형) 대비 고정 오프셋
    return {
      headX: x, headY: y - size * 0.42,
      faceX: x, faceY: y - size * 0.04,
      neckX: x, neckY: y + size * 0.02,
      bodyX: x, bodyY: y + size * 0.14,
      sideX: x + size * 0.42, sideY: y + size * 0.3,
      feetX: x, feetY: y + size * 0.46,
      cw: size * 0.9, ch: size * 0.9,
    };
  }
  const scale = size / Math.max(box.w, box.h);
  const cx = x + ((box.minX + box.maxX) / 2 - box.w / 2) * scale;
  const top = y + (box.minY - box.h / 2) * scale;
  const bottom = y + (box.maxY - box.h / 2) * scale;
  const right = x + (box.maxX - box.w / 2) * scale;
  const ch = bottom - top;
  return {
    headX: cx, headY: top,
    faceX: cx, faceY: top + ch * 0.26,
    neckX: cx, neckY: top + ch * 0.42,
    bodyX: cx, bodyY: top + ch * 0.6,
    sideX: right, sideY: bottom - ch * 0.22,
    feetX: cx, feetY: bottom - ch * 0.04,
    cw: (box.maxX - box.minX) * scale,
    ch,
  };
}

// 세대 = 지역. 현재 지역 안에서 랜덤으로 포획하고, 다 모으면 다음 지역으로.
export interface Region {
  name: string;
  start: number;
  end: number;
}
export const REGIONS: Region[] = [
  { name: '관동', start: 1, end: 151 },
  { name: '성도', start: 152, end: 251 },
  { name: '호연', start: 252, end: 386 },
  { name: '신오', start: 387, end: 493 },
  { name: '하나', start: 494, end: 649 },
  { name: '칼로스', start: 650, end: 721 },
  { name: '알로라', start: 722, end: 809 },
  { name: '가라르', start: 810, end: 905 },
  { name: '팔데아', start: 906, end: 1025 },
];

function caughtSet(): Set<number> {
  return new Set(gameState.caught);
}

/** 아직 다 못 모은 첫 지역(=현재 지역). 전부 모았으면 마지막 지역. */
export function currentRegion(): Region {
  const have = caughtSet();
  for (const r of REGIONS) {
    for (let id = r.start; id <= r.end; id++) if (!have.has(id)) return r;
  }
  return REGIONS[REGIONS.length - 1];
}

/** 특정 포켓몬 포획(스테이지=포켓몬 방식). 범위 밖이거나 이미 잡았으면 null. */
export function catchSpecific(id: number): number | null {
  if (id < 1 || id > TOTAL) return null;
  if (gameState.caught.includes(id)) return null;
  gameState.caught.push(id);
  persist();
  return id;
}

/** 다음 포켓몬 포획: 1번부터 차례대로(아직 안 잡은 가장 낮은 번호). 전부 모았으면 null. */
export function catchNext(): number | null {
  const have = caughtSet();
  for (let id = 1; id <= TOTAL; id++) {
    if (!have.has(id)) {
      gameState.caught.push(id);
      persist();
      return id;
    }
  }
  return null;
}

/** 구버전 저장 1회 보정: 이미 클리어한 스테이지 수만큼 도감을 채우고 보상완료로 마킹. */
export function reconcileCaught(): void {
  const cleared = Object.keys(gameState.stageStars)
    .map(Number)
    .filter((n) => (gameState.stageStars[n] ?? 0) > 0)
    .sort((a, b) => a - b);
  let guard = 0;
  while (gameState.caught.length < Math.min(cleared.length, TOTAL) && guard < TOTAL) {
    if (catchNext() === null) break;
    guard++;
  }
  gameState.caughtStages = Array.from(new Set([...gameState.caughtStages, ...cleared]));
  persist();
}
