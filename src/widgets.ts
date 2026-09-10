import Phaser from 'phaser';
import { FONT, COLORS, DESIGN, TEXT_RES, HD } from './theme';
import { gameState, getSettingsPw } from './systems/save';

type Scene = Phaser.Scene;

/**
 * 캔버스를 고해상도(gameSize=DESIGN×HD)로 렌더하면서 좌표계는 1280×720 으로 유지.
 * 각 씬 create() 첫 줄에서 호출. 카메라를 HD배 줌 + 디자인 중앙 정렬.
 * (입력 좌표는 카메라 변환이 반영된 pointer.worldX / worldY 를 사용해야 함)
 */
export function applyHiRes(scene: Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(HD);
  cam.centerOn(DESIGN.width / 2, DESIGN.height / 2);
}

export interface BtnOpts {
  bg?: number;
  color?: string;
  fontSize?: number;
  radius?: number;
  alpha?: number; // 배경 채움 투명도(반투명 글래스 버튼용). 기본 1(불투명)
  gloss?: boolean; // 상단 광택 하이라이트(세련된 펄 버튼)
  border?: number; // 테두리 색(지정 시)
  borderAlpha?: number; // 테두리 투명도(기본 1)
  icon?: 'gear'; // 라벨 앞 아이콘(직접 그림 — 폰트/이모지 글리프에 비의존)
}

/**
 * 톱니바퀴(기어) 아이콘 텍스처 — 흰 톱니 + 가운데를 진짜 투명으로 뚫음(뒤 배경/버튼색이 비쳐 제대로 된 기어로 보임).
 * R=바깥 반지름. 크기별 1회 생성 후 캐시. (Graphics는 구멍을 못 뚫어서 캔버스 destination-out 사용)
 */
function gearTexture(scene: Scene, R: number): string {
  const key = `gear_${Math.round(R * 10)}`;
  if (scene.textures.exists(key)) return key;
  const DPR = 3;
  const size = Math.ceil(R * 2 + 4);
  const canvas = document.createElement('canvas');
  canvas.width = size * DPR;
  canvas.height = size * DPR;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(DPR, DPR);
  const cx = size / 2, cy = size / 2, inner = R * 0.72, n = 32;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const r = i % 4 < 2 ? R : inner;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out'; // 가운데 구멍을 투명하게 뚫음
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  scene.textures.addCanvas(key, canvas);
  return key;
}

export interface ButtonContainer extends Phaser.GameObjects.Container {
  setLabel: (s: string) => void;
  setBg: (f: number, alpha?: number) => void;
  setColor: (c: string) => void;
}

/** 앱 공용 입체(은은한 그라데이션+흰 테두리) 버튼 옵션. opts에 펼쳐 사용: makeButton(..., { ...GLOSS3D, bg, fontSize }) */
export const GLOSS3D = { gloss: true, border: 0xffffff, borderAlpha: 0.5 } as const;

/** 숫자 컬러(0xRRGGBB)를 배수 f로 밝게/어둡게 → css rgb 문자열 */
function shade(col: number, f: number): string {
  const r = Math.min(255, Math.round(((col >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((col >> 8) & 255) * f));
  const b = Math.min(255, Math.round((col & 255) * f));
  return `rgb(${r},${g},${b})`;
}

/**
 * 광택 버튼 본체(은은한 세로 그라데이션 + 흰 테두리)를 캔버스 텍스처로 생성/캐시 후 key 반환.
 * Phaser fillRoundedRect 는 그라데이션 불가(경로) → 캔버스로만 가능. (색·크기별 1회 생성 후 재사용)
 */
function buttonBodyTexture(scene: Scene, w: number, h: number, radius: number, fill: number, border: number, borderAlpha: number): string {
  const key = `btnbody_${w}x${h}_${radius}_${fill}_${border}_${Math.round(borderAlpha * 100)}`;
  if (scene.textures.exists(key)) return key;
  const DPR = 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(DPR, DPR);
  const rr = (rx: number, ry: number, rw: number, rh: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r);
    ctx.closePath();
  };
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, shade(fill, 1.14)); // 위 밝게
  grad.addColorStop(1, shade(fill, 0.93)); // 아래 진하게
  ctx.fillStyle = grad;
  rr(0.6, 0.6, w - 1.2, h - 1.2, radius);
  ctx.fill();
  const br = (border >> 16) & 255, bgc = (border >> 8) & 255, bb = border & 255;
  ctx.strokeStyle = `rgba(${br},${bgc},${bb},${borderAlpha})`;
  ctx.lineWidth = 2.5;
  rr(1.5, 1.5, w - 3, h - 3, Math.max(2, radius - 1));
  ctx.stroke();
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function makeButton(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: BtnOpts = {}
): ButtonContainer {
  const bg = opts.bg ?? COLORS.btn;
  const color = opts.color ?? '#ffffff';
  const fontSize = opts.fontSize ?? 30;
  const radius = opts.radius ?? Math.min(h / 2, 26);
  const fillAlpha = opts.alpha ?? 1;
  const c = scene.add.container(x, y) as ButtonContainer;
  const g = scene.add.graphics();
  let curFill = bg;
  let bodyImg: Phaser.GameObjects.Image | undefined; // 광택(④ 그라데이션) 버튼의 캔버스 본체
  const draw = (fill?: number, a?: number) => {
    const al = a ?? fillAlpha;
    if (fill != null) curFill = fill;
    g.clear();
    if (opts.gloss && al >= 1) {
      // ④ 은은한 세로 그라데이션 본체 + 흰 테두리 (둥근 버튼은 캔버스 텍스처로만 그라데이션 가능)
      const key = buttonBodyTexture(scene, w, h, radius, curFill, opts.border ?? 0xffffff, opts.borderAlpha ?? 0.5);
      if (!bodyImg) {
        bodyImg = scene.add.image(0, 0, key).setScale(0.5); // 텍스처 DPR=2 → 0.5배 표시
        c.addAt(bodyImg, 0); // 맨 뒤
      } else {
        bodyImg.setTexture(key);
      }
      return; // 테두리는 텍스처에 포함
    }
    // 비광택 버튼 (기존 Graphics 방식)
    if (al >= 1) {
      g.fillStyle(0x000000, 0.12); // 그림자
      g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius);
    }
    g.fillStyle(curFill, al);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    if (opts.border != null) {
      g.lineStyle(2, opts.border, opts.borderAlpha ?? 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else if (al < 1) {
      // 반투명 버튼은 흰 테두리로 윤곽을 살림 (사진 배경에서도 또렷)
      g.lineStyle(2.5, 0xffffff, 0.5);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
  };
  draw(bg);
  const t = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color, fontStyle: 'bold', align: 'center', resolution: TEXT_RES })
    .setOrigin(0.5);
  if (opts.icon === 'gear') {
    const iconR = label && label.trim() ? fontSize * 0.46 : fontSize * 0.6;
    const gi = scene.add.image(0, 0, gearTexture(scene, iconR)).setScale(1 / 3); // 텍스처 DPR=3
    if (label && label.trim()) {
      // 아이콘 + 텍스트를 하나의 묶음으로 가운데 정렬(텍스트는 오른쪽으로, 왼쪽에 톱니바퀴)
      const gap = fontSize * 0.34;
      t.setX((iconR * 2 + gap) / 2);
      gi.setX(t.x - t.width / 2 - gap - iconR);
    }
    c.add([g, gi, t]);
  } else {
    c.add([g, t]);
  }
  c.setSize(w, h);
  // 좌표 기반(씬 레벨) 입력 — 기기 터치에서 오브젝트 단위 히트테스트가 불안정해 직접 판정.
  // (좌표 매핑은 정확함이 확인됨) destroy 시 리스너 정리해 누수 방지.
  const hit = (p: Phaser.Input.Pointer) => Math.abs(p.worldX - x) <= w / 2 && Math.abs(p.worldY - y) <= h / 2;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (hit(p)) {
      c.setScale(0.94);
      onClick();
    }
  };
  const onUp = () => c.setScale(1);
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointerup', onUp);
  c.once('destroy', () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointerup', onUp);
  });
  c.setLabel = (s: string) => t.setText(s);
  c.setBg = (f: number, a?: number) => draw(f, a);
  c.setColor = (col: string) => t.setColor(col);
  return c;
}

function darkenHex(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function gearPathCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, hole: string): void {
  const n = 32;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const r = i % 4 < 2 ? R : R * 0.72;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = hole;
  ctx.fill();
}

/**
 * 청키 글로시 3D 알약 버튼 — 캔버스로 그려 텍스처로 입힘(세로 그라데이션·상단 광택·바닥 입술·블러 드롭섀도·진한 테두리).
 * x,y = 중심. topColor/botColor = 본체 그라데이션 hex. icon = 'play'(▶)/'gear'(⚙)/null. 누르면 살짝 가라앉음.
 */
export function makeGlossy3DButton(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  topColor: string,
  botColor: string,
  label: string,
  icon: 'play' | 'gear' | null,
  fontSize: number,
  onClick: () => void
): Phaser.GameObjects.Image {
  const DPR = 2;
  const PX = 30,
    PV = 50;
  const cw = w + PX * 2,
    ch = h + PV * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cw * DPR;
  canvas.height = ch * DPR;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(DPR, DPR);
  const ox = PX,
    oy = PV,
    radius = h / 2;
  const lip = darkenHex(botColor, 0.72);
  const border = darkenHex(botColor, 0.6);
  const rr = (rx: number, ry: number, rw: number, rh: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
    ctx.arcTo(rx, ry + rh, rx, ry, r);
    ctx.arcTo(rx, ry, rx + rw, ry, r);
    ctx.closePath();
  };
  // 1) 바닥 입술 + 부드러운 드롭섀도
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = lip;
  rr(ox, oy + 8, w, h, radius);
  ctx.fill();
  ctx.restore();
  // 2) 본체 세로 그라데이션
  const g = ctx.createLinearGradient(0, oy, 0, oy + h);
  g.addColorStop(0, topColor);
  g.addColorStop(1, botColor);
  ctx.fillStyle = g;
  rr(ox, oy, w, h, radius);
  ctx.fill();
  // 3) 윗부분 광택 + 안쪽 바닥 음영(본체 클립)
  ctx.save();
  rr(ox, oy, w, h, radius);
  ctx.clip();
  const gloss = ctx.createLinearGradient(0, oy, 0, oy + h * 0.55);
  gloss.addColorStop(0, 'rgba(255,255,255,0.66)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(ox, oy, w, h * 0.55);
  const shade = ctx.createLinearGradient(0, oy + h * 0.7, 0, oy + h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = shade;
  ctx.fillRect(ox, oy + h * 0.7, w, h * 0.3);
  ctx.restore();
  // 4) 한 톤 진한 테두리(살짝 안쪽)
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  rr(ox + 1.5, oy + 1.5, w - 3, h - 3, radius - 1.5);
  ctx.stroke();
  // 5) 아이콘 + 텍스트(가로 배치, 흰색 + 다크 그림자)
  ctx.font = `${fontSize}px Jua, "Noto Sans KR", sans-serif`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(label).width;
  const iconW = icon ? fontSize * 1.05 : 0;
  const gap = icon ? fontSize * 0.34 : 0;
  const total = iconW + gap + tw;
  const sx = ox + w / 2 - total / 2;
  const cyb = oy + h / 2;
  if (icon === 'play') {
    const s = fontSize * 0.92;
    const icx = sx + iconW / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(icx - s * 0.36, cyb - s * 0.58);
    ctx.lineTo(icx - s * 0.36, cyb + s * 0.58);
    ctx.lineTo(icx + s * 0.62, cyb);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'gear') {
    gearPathCanvas(ctx, sx + iconW / 2, cyb, fontSize * 0.62, botColor);
  }
  const tx = sx + iconW + gap;
  ctx.textAlign = 'left';
  ctx.fillStyle = darkenHex(botColor, 0.42);
  ctx.globalAlpha = 0.7;
  ctx.fillText(label, tx, cyb + 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, tx, cyb);
  // 텍스처 등록 + 이미지 배치(중심 정렬) + 입력
  const key = `g3d_${label}_${Math.round(x)}_${Math.round(y)}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  const base = 1 / DPR;
  const img = scene.add.image(x, y, key).setScale(base);
  const hit = (p: Phaser.Input.Pointer) => Math.abs(p.worldX - x) <= w / 2 && Math.abs(p.worldY - y) <= h / 2;
  const onDown = (p: Phaser.Input.Pointer) => {
    if (hit(p)) {
      img.setScale(base * 0.97);
      img.y = y + 4;
      onClick();
    }
  };
  const onUp = () => {
    img.setScale(base);
    img.y = y;
  };
  scene.input.on('pointerdown', onDown);
  scene.input.on('pointerup', onUp);
  img.once('destroy', () => {
    scene.input.off('pointerdown', onDown);
    scene.input.off('pointerup', onUp);
  });
  return img;
}

/** 미포획 슬롯용 광택 글래스 박스(밝은 배경에서 또렷한 입체 유리 칸). x,y = 중심. */
export function glassSlot(scene: Scene, x: number, y: number, size = 78): Phaser.GameObjects.Graphics {
  const h2 = size / 2;
  const r = Math.round(size * 0.24); // 크기에 비례한 모서리(작아도 자연스럽게)
  const g = scene.add.graphics();
  g.fillStyle(0x1e2d50, 0.16); // 그림자
  g.fillRoundedRect(x - h2, y - h2 + 4, size, size, r);
  g.fillStyle(0xeef4fc, 0.82); // 프스티드 글래스(밝은 반투명)
  g.fillRoundedRect(x - h2, y - h2, size, size, r);
  g.fillStyle(0xffffff, 0.5); // 상단 광택
  g.fillRoundedRect(x - h2 + 5, y - h2 + 4, size - 10, size * 0.4, Math.max(2, r - 4));
  g.lineStyle(2, 0xffffff, 0.92); // 또렷한 라이트 테두리
  g.strokeRoundedRect(x - h2, y - h2, size, size, r);
  return g;
}

export function drawBackground(scene: Scene, colors: { top: number; bottom: number; ground: number }): void {
  const groundY = Math.round(DESIGN.height * 0.74);
  const g = scene.add.graphics();
  g.fillGradientStyle(colors.top, colors.top, colors.bottom, colors.bottom, 1);
  g.fillRect(0, 0, DESIGN.width, DESIGN.height);
  g.fillStyle(colors.ground, 1);
  g.fillRect(0, groundY, DESIGN.width, DESIGN.height - groundY);
  g.fillStyle(COLORS.dirt, 1);
  g.fillRect(0, groundY + 26, DESIGN.width, DESIGN.height - groundY - 26);
  g.fillStyle(COLORS.groundDark, 1);
  g.fillRect(0, groundY, DESIGN.width, 8);
  g.setDepth(-10);
}

export function drawStars(
  scene: Scene,
  cx: number,
  y: number,
  earned: number,
  total = 3,
  size = 26,
  gap = 10
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const step = size * 2 + gap;
  const startX = cx - ((total - 1) * step) / 2;
  for (let i = 0; i < total; i++) {
    const filled = i < earned;
    const s = scene.add.star(startX + i * step, y, 5, size * 0.5, size, filled ? COLORS.star : COLORS.starOff);
    s.setStrokeStyle(3, 0xffffff, filled ? 1 : 0.6);
    c.add(s);
  }
  return c;
}

export function addCoinHud(
  scene: Scene,
  x = DESIGN.width - 40,
  y = 46,
  opts: { pill?: boolean; color?: string; stroke?: string } = {}
): Phaser.GameObjects.Text {
  // 기본 = 포켓몬 도감 스타일: 28px, 어두운 글씨(#3a4860) + 흰 외곽선, 알약 없음 → 모든 화면 동일
  const t = scene.add
    .text(x, y, `🪙 ${gameState.coins}`, {
      fontFamily: FONT,
      fontSize: '28px',
      color: opts.color ?? '#3a4860',
      fontStyle: 'bold',
      stroke: opts.stroke ?? '#ffffff',
      strokeThickness: 4,
      resolution: TEXT_RES,
    })
    .setOrigin(1, 0.5)
    .setDepth(51);
  if (opts.pill ?? false) {
    const g = scene.add.graphics().setDepth(50);
    g.fillStyle(0x000000, 0.42);
    g.fillRoundedRect(x - t.width - 16, y - 27, t.width + 32, 54, 27);
  }
  return t;
}

let toastObj: Phaser.GameObjects.Container | null = null;
export function toast(scene: Scene, msg: string): void {
  if (toastObj) toastObj.destroy();
  const w = Math.max(220, msg.length * 20 + 60);
  const c = scene.add.container(DESIGN.width / 2, DESIGN.height - 130);
  const g = scene.add.graphics();
  g.fillStyle(0x2b3a67, 0.92);
  g.fillRoundedRect(-w / 2, -30, w, 60, 18);
  const t = scene.add
    .text(0, 0, msg, { fontFamily: FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES })
    .setOrigin(0.5);
  c.add([g, t]);
  c.setDepth(1000);
  toastObj = c;
  scene.tweens.add({ targets: c, alpha: { from: 1, to: 0 }, delay: 1100, duration: 500, onComplete: () => c.destroy() });
}

// 설정은 보호자 비밀번호로 보호(기본 0000, 설정 화면에서 변경·초기화).
// 맞으면 설정 화면 진입, 틀리면 안내.
export function gateSettings(scene: Scene): void {
  const pw = window.prompt('설정 비밀번호를 입력하세요 (보호자용)');
  if (pw == null) return; // 취소
  if (pw.trim() === getSettingsPw()) scene.scene.start('Settings');
  else toast(scene, '비밀번호가 틀렸어요 🔒');
}
