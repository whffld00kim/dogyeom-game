import Phaser from 'phaser';
import type { Slot } from './shop';

// ── 꾸미기 아이템: 벡터로 직접 그림(어떤 해상도서도 또렷, 저작권 무관). ──
// 기본 디자인(BaseDesign) × 색 팔레트(PALETTE) → 카탈로그(ITEMS) 자동 생성.
// drawItem() 하나로 상점 칸과 포켓몬 위에 같은 그림을 그림(WYSIWYG).

export interface PaletteColor {
  key: string;
  name: string;
  color: number;
  rarity: 0 | 1 | 2;
}

export interface BaseDesign {
  key: string;
  name: string;
  tier: number; // 1~4 가격 등급
  monochrome?: boolean; // true 면 팔레트 색을 안 입히고 단색 1개만
  draw: (scene: Phaser.Scene, x: number, y: number, size: number, color: number, color2: number) => Phaser.GameObjects.Container;
}

export interface ItemDef {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  base: string;
  color: number;
  color2: number;
  img?: string; // 직접 그린 이미지 아이템이면 png 경로(public 기준). 있으면 벡터 대신 이미지 사용.
}

const DEG = Phaser.Math.DegToRad;

/** 색을 어둡게(f<1) 또는 밝게(f>1). 외곽선·명암용 보조색 생성. */
function shade(color: number, f: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  if (f <= 1) return Phaser.Display.Color.GetColor((c.red * f) | 0, (c.green * f) | 0, (c.blue * f) | 0);
  const t = f - 1;
  return Phaser.Display.Color.GetColor(
    (c.red + (255 - c.red) * t) | 0,
    (c.green + (255 - c.green) * t) | 0,
    (c.blue + (255 - c.blue) * t) | 0,
  );
}

function starPts(cx: number, cy: number, n: number, inner: number, outer: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = DEG(-90 + (180 / n) * i);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function heart(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number) {
  g.fillStyle(color, 1);
  g.fillCircle(cx - r * 0.5, cy - r * 0.32, r * 0.56);
  g.fillCircle(cx + r * 0.5, cy - r * 0.32, r * 0.56);
  g.fillTriangle(cx - r, cy - r * 0.08, cx + r, cy - r * 0.08, cx, cy + r * 0.92);
}

type Build = (
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  u: number,
  c1: number,
  c2: number,
  c: Phaser.GameObjects.Container,
) => void;

function mk(key: string, name: string, tier: number, build: Build, monochrome?: boolean): BaseDesign {
  return {
    key,
    name,
    tier,
    monochrome,
    draw: (scene, x, y, size, color, color2) => {
      const c = scene.add.container(x, y);
      const g = scene.add.graphics();
      c.add(g);
      build(scene, g, size, color, color2, c);
      return c;
    },
  };
}

const OUT = (u: number) => Math.max(2, u * 0.035); // 외곽선 두께

// ───────────────────── 모자 (hat) ─────────────────────
const HATS: BaseDesign[] = [
  mk('cap', '야구모자', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillEllipse(u * 0.16, u * 0.08, u * 0.56, u * 0.16); // 챙
    g.fillStyle(c1, 1); g.beginPath(); g.slice(0, u * 0.08, u * 0.34, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
    g.fillStyle(0xffffff, 1); g.fillCircle(0, -u * 0.13, u * 0.05);
  }),
  mk('beanie', '비니', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.beginPath(); g.slice(0, u * 0.12, u * 0.32, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.34, u * 0.04, u * 0.68, u * 0.14, u * 0.06);
    g.fillStyle(c2, 1); g.fillCircle(0, -u * 0.24, u * 0.07);
  }),
  mk('tophat', '마술모자', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillEllipse(0, u * 0.22, u * 0.7, u * 0.16); // 챙
    g.fillStyle(c1, 1); g.fillRect(-u * 0.22, -u * 0.34, u * 0.44, u * 0.56); // 통
    g.fillStyle(c2, 1); g.fillRect(-u * 0.22, u * 0.06, u * 0.44, u * 0.1); // 띠
    g.fillStyle(c1, 1); g.fillEllipse(0, -u * 0.34, u * 0.44, u * 0.1);
  }),
  mk('crown', '왕관', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillPoints([
      { x: -u * 0.36, y: u * 0.2 }, { x: -u * 0.36, y: -u * 0.06 }, { x: -u * 0.18, y: u * 0.06 },
      { x: 0, y: -u * 0.24 }, { x: u * 0.18, y: u * 0.06 }, { x: u * 0.36, y: -u * 0.06 },
      { x: u * 0.36, y: u * 0.2 },
    ], true);
    g.fillStyle(0xffffff, 1); g.fillCircle(0, -u * 0.06, u * 0.05); g.fillCircle(-u * 0.26, u * 0.0, u * 0.04); g.fillCircle(u * 0.26, u * 0.0, u * 0.04);
  }),
  mk('party', '파티모자', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillTriangle(0, -u * 0.36, -u * 0.26, u * 0.24, u * 0.26, u * 0.24);
    g.fillStyle(c2, 1); g.fillTriangle(0, -u * 0.1, -u * 0.14, u * 0.24, u * 0.14, u * 0.24);
    g.fillStyle(0xffffff, 1); g.fillCircle(0, -u * 0.38, u * 0.07);
  }),
  mk('cowboy', '카우보이', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillEllipse(0, u * 0.16, u * 0.78, u * 0.2); // 넓은 챙
    g.fillStyle(c1, 1); g.beginPath(); g.slice(0, u * 0.14, u * 0.28, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.28, u * 0.04, u * 0.56, u * 0.1, u * 0.04);
  }),
  mk('wizard', '마법사모자', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillEllipse(0, u * 0.24, u * 0.66, u * 0.16);
    g.fillStyle(c1, 1); g.fillTriangle(-u * 0.04, -u * 0.4, -u * 0.24, u * 0.22, u * 0.24, u * 0.22);
    g.fillStyle(0xffd24a, 1); g.fillPoints(starPts(-u * 0.02, -u * 0.06, 5, u * 0.04, u * 0.1), true);
  }),
  mk('straw', '밀짚모자', 2, (s, g, u, c1, c2) => {
    const straw = 0xe6c772;
    g.fillStyle(shade(straw, 0.8), 1); g.fillEllipse(0, u * 0.18, u * 0.82, u * 0.2);
    g.fillStyle(straw, 1); g.beginPath(); g.slice(0, u * 0.16, u * 0.26, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.26, u * 0.06, u * 0.52, u * 0.1, u * 0.04); // 색 띠
  }),
  mk('headband', '머리띠', 1, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.12, c1, 1); g.beginPath(); g.arc(0, u * 0.16, u * 0.34, DEG(200), DEG(340), false); g.strokePath();
    g.fillStyle(c2, 1); g.fillTriangle(-u * 0.3, -u * 0.04, -u * 0.42, -u * 0.16, -u * 0.18, -u * 0.16);
    g.fillTriangle(u * 0.3, -u * 0.04, u * 0.42, -u * 0.16, u * 0.18, -u * 0.16);
  }),
  mk('ribbon', '리본', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillTriangle(-u * 0.04, 0, -u * 0.34, -u * 0.18, -u * 0.34, u * 0.18);
    g.fillTriangle(u * 0.04, 0, u * 0.34, -u * 0.18, u * 0.34, u * 0.18);
    g.fillStyle(c2, 1); g.fillCircle(0, 0, u * 0.08);
  }),
  mk('flower', '꽃모자', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    for (let i = 0; i < 6; i++) { const a = DEG(i * 60); g.fillCircle(Math.cos(a) * u * 0.2, Math.sin(a) * u * 0.2, u * 0.13); }
    g.fillStyle(0xffd24a, 1); g.fillCircle(0, 0, u * 0.12);
  }),
  mk('halo', '천사고리', 4, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.1, 0xffe27a, 1); g.strokeEllipse(0, -u * 0.1, u * 0.6, u * 0.24);
  }, true),
];

// ───────────────────── 안경 (glasses) ─────────────────────
const GLASSES: BaseDesign[] = [
  mk('round', '동그란안경', 1, (s, g, u, c1, c2) => {
    g.lineStyle(OUT(u) * 1.6, c1, 1);
    g.strokeCircle(-u * 0.2, 0, u * 0.16); g.strokeCircle(u * 0.2, 0, u * 0.16);
    g.lineBetween(-u * 0.04, 0, u * 0.04, 0);
  }),
  mk('square', '네모안경', 1, (s, g, u, c1, c2) => {
    g.lineStyle(OUT(u) * 1.6, c1, 1);
    g.strokeRoundedRect(-u * 0.38, -u * 0.14, u * 0.3, u * 0.28, u * 0.05);
    g.strokeRoundedRect(u * 0.08, -u * 0.14, u * 0.3, u * 0.28, u * 0.05);
    g.lineBetween(-u * 0.08, 0, u * 0.08, 0);
  }),
  mk('sun', '선글라스', 2, (s, g, u, c1, c2) => {
    g.fillStyle(0x2b2f3a, 1);
    g.fillRoundedRect(-u * 0.4, -u * 0.14, u * 0.34, u * 0.26, u * 0.08);
    g.fillRoundedRect(u * 0.06, -u * 0.14, u * 0.34, u * 0.26, u * 0.08);
    g.fillStyle(c1, 1); g.fillRect(-u * 0.06, -u * 0.05, u * 0.12, u * 0.06);
    g.fillStyle(0xffffff, 0.5); g.fillRect(-u * 0.36, -u * 0.1, u * 0.1, u * 0.06);
  }),
  mk('goggles', '물안경', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.4, -u * 0.16, u * 0.36, u * 0.32, u * 0.12);
    g.fillRoundedRect(u * 0.04, -u * 0.16, u * 0.36, u * 0.32, u * 0.12);
    g.fillStyle(0xbfe9ff, 1);
    g.fillRoundedRect(-u * 0.36, -u * 0.12, u * 0.28, u * 0.24, u * 0.1);
    g.fillRoundedRect(u * 0.08, -u * 0.12, u * 0.28, u * 0.24, u * 0.1);
  }),
  mk('star', '별안경', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillPoints(starPts(-u * 0.2, 0, 5, u * 0.07, u * 0.17), true);
    g.fillPoints(starPts(u * 0.2, 0, 5, u * 0.07, u * 0.17), true);
  }),
  mk('heart', '하트안경', 3, (s, g, u, c1, c2) => {
    heart(g, -u * 0.2, 0, u * 0.15, c1); heart(g, u * 0.2, 0, u * 0.15, c1);
  }),
  mk('cat', '고양이안경', 2, (s, g, u, c1, c2) => {
    g.lineStyle(OUT(u) * 1.6, c1, 1);
    g.beginPath();
    g.moveTo(-u * 0.36, u * 0.06); g.lineTo(-u * 0.34, -u * 0.1); g.lineTo(-u * 0.06, -u * 0.04); g.lineTo(-u * 0.08, u * 0.1); g.closePath(); g.strokePath();
    g.beginPath();
    g.moveTo(u * 0.36, u * 0.06); g.lineTo(u * 0.34, -u * 0.1); g.lineTo(u * 0.06, -u * 0.04); g.lineTo(u * 0.08, u * 0.1); g.closePath(); g.strokePath();
  }),
  mk('monocle', '외알안경', 3, (s, g, u, c1, c2) => {
    g.lineStyle(OUT(u) * 1.8, c1, 1); g.strokeCircle(0, -u * 0.02, u * 0.18);
    g.lineStyle(OUT(u), c1, 1); g.lineBetween(u * 0.14, u * 0.12, u * 0.22, u * 0.3);
  }),
  mk('visor', '바이저', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.beginPath(); g.slice(0, -u * 0.04, u * 0.36, DEG(20), DEG(160), false); g.closePath(); g.fillPath();
    g.fillStyle(c2, 1); g.fillRect(-u * 0.36, -u * 0.06, u * 0.72, u * 0.06);
  }),
  mk('eyepatch', '안대', 2, (s, g, u, c1, c2) => {
    g.lineStyle(OUT(u), c2, 1); g.lineBetween(-u * 0.38, -u * 0.14, u * 0.38, -u * 0.14);
    g.fillStyle(c1, 1); g.fillRoundedRect(u * 0.04, -u * 0.16, u * 0.3, u * 0.3, u * 0.06);
  }),
];

// ───────────────────── 무기 (weapon) — 손 옆에 세로로 ─────────────────────
const WEAPONS: BaseDesign[] = [
  mk('sword', '검', 1, (s, g, u, c1, c2) => {
    g.fillStyle(0xd7dde8, 1); g.fillTriangle(-u * 0.07, -u * 0.46, u * 0.07, -u * 0.46, 0, -u * 0.5);
    g.fillRect(-u * 0.07, -u * 0.46, u * 0.14, u * 0.5);
    g.fillStyle(c1, 1); g.fillRect(-u * 0.22, u * 0.02, u * 0.44, u * 0.08); // 가드
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.06, u * 0.1, u * 0.12, u * 0.26, u * 0.04); // 손잡이
  }),
  mk('wand', '마법봉', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.04, -u * 0.1, u * 0.08, u * 0.55, u * 0.03);
    g.fillStyle(c1, 1); g.fillPoints(starPts(0, -u * 0.28, 5, u * 0.08, u * 0.2), true);
  }),
  mk('bow', '활', 2, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.07, c1, 1); g.beginPath(); g.arc(-u * 0.05, 0, u * 0.42, DEG(300), DEG(60), false); g.strokePath();
    g.lineStyle(u * 0.02, 0xffffff, 1); g.lineBetween(u * 0.16, -u * 0.36, u * 0.16, u * 0.36);
  }),
  mk('hammer', '망치', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.26, -u * 0.42, u * 0.52, u * 0.26, u * 0.05); // 머리
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.06, -u * 0.16, u * 0.12, u * 0.5, u * 0.04); // 자루
  }),
  mk('axe', '도끼', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.05, -u * 0.4, u * 0.1, u * 0.78, u * 0.03);
    g.fillStyle(0xd7dde8, 1); g.fillPoints([{ x: u * 0.05, y: -u * 0.38 }, { x: u * 0.36, y: -u * 0.3 }, { x: u * 0.36, y: -u * 0.02 }, { x: u * 0.05, y: -u * 0.08 }], true);
  }),
  mk('shield', '방패', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillPoints([{ x: -u * 0.3, y: -u * 0.34 }, { x: u * 0.3, y: -u * 0.34 }, { x: u * 0.3, y: u * 0.06 }, { x: 0, y: u * 0.42 }, { x: -u * 0.3, y: u * 0.06 }], true);
    g.fillStyle(0xffffff, 1); g.fillPoints(starPts(0, -u * 0.02, 5, u * 0.06, u * 0.15), true);
  }),
  mk('staff', '지팡이', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.04, -u * 0.24, u * 0.08, u * 0.7, u * 0.03);
    g.fillStyle(c1, 1); g.fillCircle(0, -u * 0.34, u * 0.14);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(-u * 0.04, -u * 0.38, u * 0.04);
  }),
  mk('trident', '삼지창', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.04, -u * 0.1, u * 0.08, u * 0.56, u * 0.03);
    g.fillStyle(c1, 1);
    g.fillRect(-u * 0.26, -u * 0.18, u * 0.52, u * 0.06); // 가로대
    [-0.22, 0, 0.22].forEach((dx) => g.fillTriangle(u * (dx - 0.05), -u * 0.18, u * (dx + 0.05), -u * 0.18, u * dx, -u * 0.42));
  }),
  mk('dagger', '단검', 1, (s, g, u, c1, c2) => {
    g.fillStyle(0xd7dde8, 1); g.fillTriangle(-u * 0.06, -u * 0.04, u * 0.06, -u * 0.04, 0, -u * 0.34);
    g.fillStyle(c1, 1); g.fillRect(-u * 0.16, -u * 0.04, u * 0.32, u * 0.06);
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.05, u * 0.02, u * 0.1, u * 0.22, u * 0.03);
  }),
  mk('spear', '창', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.035, -u * 0.32, u * 0.07, u * 0.78, u * 0.03);
    g.fillStyle(0xd7dde8, 1); g.fillTriangle(-u * 0.1, -u * 0.32, u * 0.1, -u * 0.32, 0, -u * 0.5);
  }),
];

// ───────────────────── 신발 (shoes) — 한 짝, 옆모습 ─────────────────────
const SHOES: BaseDesign[] = [
  mk('sneaker', '운동화', 1, (s, g, u, c1, c2) => {
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(-u * 0.4, u * 0.1, u * 0.8, u * 0.12, u * 0.05); // 밑창
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.38, -u * 0.12, u * 0.62, u * 0.24, u * 0.08);
    g.fillStyle(0xffffff, 1); g.fillRect(u * 0.08, -u * 0.12, u * 0.16, u * 0.22); // 앞코
    g.lineStyle(OUT(u), c2, 1); g.lineBetween(-u * 0.2, -u * 0.06, -u * 0.05, -u * 0.06);
  }),
  mk('boot', '부츠', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.4, u * 0.16, u * 0.78, u * 0.1, u * 0.04);
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.22, -u * 0.4, u * 0.3, u * 0.58, u * 0.06); // 목
    g.fillRoundedRect(-u * 0.38, u * 0.02, u * 0.62, u * 0.18, u * 0.06); // 발
  }),
  mk('sandal', '샌들', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.38, u * 0.1, u * 0.76, u * 0.12, u * 0.05);
    g.lineStyle(u * 0.06, c2, 1);
    g.lineBetween(-u * 0.28, u * 0.1, 0, -u * 0.16); g.lineBetween(u * 0.05, u * 0.1, 0, -u * 0.16);
  }),
  mk('dress', '구두', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.4, u * 0.12, u * 0.8, u * 0.08, u * 0.03);
    g.fillStyle(c1, 1); g.beginPath(); g.slice(-u * 0.05, u * 0.12, u * 0.42, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
  }),
  mk('rainboot', '장화', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.2, -u * 0.4, u * 0.32, u * 0.6, u * 0.08);
    g.fillRoundedRect(-u * 0.38, u * 0.04, u * 0.6, u * 0.18, u * 0.08);
    g.fillStyle(0xffffff, 0.5); g.fillRect(-u * 0.14, -u * 0.34, u * 0.06, u * 0.5);
  }),
  mk('slipper', '슬리퍼', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.38, u * 0.08, u * 0.76, u * 0.14, u * 0.06);
    g.fillStyle(c1, 1); g.beginPath(); g.slice(-u * 0.1, u * 0.08, u * 0.3, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
  }),
  mk('skate', '롤러스케이트', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.36, -u * 0.12, u * 0.6, u * 0.26, u * 0.08);
    g.fillStyle(0x3a3f4a, 1); g.fillRect(-u * 0.36, u * 0.14, u * 0.62, u * 0.06);
    g.fillStyle(0x3a3f4a, 1); g.fillCircle(-u * 0.24, u * 0.26, u * 0.08); g.fillCircle(u * 0.12, u * 0.26, u * 0.08);
  }),
  mk('hightop', '하이탑', 2, (s, g, u, c1, c2) => {
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(-u * 0.4, u * 0.1, u * 0.8, u * 0.12, u * 0.05);
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.32, -u * 0.32, u * 0.5, u * 0.42, u * 0.08);
    g.fillStyle(c2, 1); g.fillCircle(-u * 0.08, -u * 0.1, u * 0.03); g.fillCircle(-u * 0.08, -u * 0.0, u * 0.03);
  }),
  mk('clog', '나막신', 1, (s, g, u, c1, c2) => {
    const wood = 0xc89b6a;
    g.fillStyle(shade(wood, 0.8), 1); g.fillRoundedRect(-u * 0.38, u * 0.04, u * 0.76, u * 0.18, u * 0.05);
    g.fillStyle(c1, 1); g.beginPath(); g.slice(-u * 0.08, u * 0.06, u * 0.32, DEG(180), DEG(360), false); g.closePath(); g.fillPath();
  }),
];

// ───────────────────── 옷 (clothes) — 상체 정면 ─────────────────────
const CLOTHES: BaseDesign[] = [
  mk('tshirt', '티셔츠', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.26, -u * 0.2, u * 0.52, u * 0.5, u * 0.06);
    g.fillTriangle(-u * 0.26, -u * 0.2, -u * 0.44, -u * 0.04, -u * 0.26, u * 0.06);
    g.fillTriangle(u * 0.26, -u * 0.2, u * 0.44, -u * 0.04, u * 0.26, u * 0.06);
    g.fillStyle(c2, 1); g.fillTriangle(-u * 0.1, -u * 0.2, u * 0.1, -u * 0.2, 0, -u * 0.06);
  }),
  mk('hoodie', '후드티', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.28, -u * 0.16, u * 0.56, u * 0.5, u * 0.06);
    g.fillTriangle(-u * 0.28, -u * 0.16, -u * 0.46, 0, -u * 0.28, u * 0.1);
    g.fillTriangle(u * 0.28, -u * 0.16, u * 0.46, 0, u * 0.28, u * 0.1);
    g.fillStyle(c2, 1); g.beginPath(); g.slice(0, -u * 0.16, u * 0.18, DEG(0), DEG(180), false); g.closePath(); g.fillPath(); // 후드
    g.lineStyle(u * 0.02, c2, 1); g.lineBetween(0, -u * 0.06, 0, u * 0.2);
  }),
  mk('dress', '드레스', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.18, -u * 0.18, u * 0.36, u * 0.24, u * 0.05); // 상의
    g.fillPoints([{ x: -u * 0.18, y: u * 0.04 }, { x: u * 0.18, y: u * 0.04 }, { x: u * 0.4, y: u * 0.36 }, { x: -u * 0.4, y: u * 0.36 }], true); // 치마
    g.fillStyle(c2, 1); g.fillRect(-u * 0.18, u * 0.0, u * 0.36, u * 0.05);
  }),
  mk('vest', '조끼', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillPoints([{ x: -u * 0.26, y: -u * 0.2 }, { x: -u * 0.06, y: -u * 0.12 }, { x: u * 0.06, y: -u * 0.12 }, { x: u * 0.26, y: -u * 0.2 }, { x: u * 0.26, y: u * 0.3 }, { x: -u * 0.26, y: u * 0.3 }], true);
    g.fillStyle(c2, 1); g.fillCircle(0, u * 0.02, u * 0.03); g.fillCircle(0, u * 0.14, u * 0.03);
  }),
  mk('cape', '망토', 3, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillPoints([{ x: -u * 0.22, y: -u * 0.2 }, { x: u * 0.22, y: -u * 0.2 }, { x: u * 0.4, y: u * 0.36 }, { x: -u * 0.4, y: u * 0.36 }], true);
    g.fillStyle(0xffd24a, 1); g.fillCircle(-u * 0.16, -u * 0.18, u * 0.05); g.fillCircle(u * 0.16, -u * 0.18, u * 0.05);
  }),
  mk('scarf', '목도리', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.3, -u * 0.18, u * 0.6, u * 0.14, u * 0.06);
    g.fillRoundedRect(-u * 0.04, -u * 0.12, u * 0.16, u * 0.42, u * 0.05);
    g.fillStyle(c2, 1); g.fillRect(-u * 0.04, u * 0.24, u * 0.16, u * 0.06);
  }),
  mk('overall', '멜빵바지', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.24, -u * 0.06, u * 0.48, u * 0.4, u * 0.05);
    g.fillRect(-u * 0.2, -u * 0.22, u * 0.08, u * 0.2); g.fillRect(u * 0.12, -u * 0.22, u * 0.08, u * 0.2); // 멜빵
    g.fillStyle(c2, 1); g.fillRect(-u * 0.1, u * 0.0, u * 0.2, u * 0.12); // 주머니
  }),
  mk('jacket', '재킷', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillRoundedRect(-u * 0.28, -u * 0.18, u * 0.56, u * 0.5, u * 0.06);
    g.fillStyle(c2, 1);
    g.fillTriangle(-u * 0.04, -u * 0.18, -u * 0.2, -u * 0.04, -u * 0.04, u * 0.24);
    g.fillTriangle(u * 0.04, -u * 0.18, u * 0.2, -u * 0.04, u * 0.04, u * 0.24);
  }),
  mk('sweater', '스웨터', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillRoundedRect(-u * 0.28, -u * 0.18, u * 0.56, u * 0.5, u * 0.08);
    g.fillTriangle(-u * 0.28, -u * 0.18, -u * 0.46, -u * 0.02, -u * 0.28, u * 0.08);
    g.fillTriangle(u * 0.28, -u * 0.18, u * 0.46, -u * 0.02, u * 0.28, u * 0.08);
    g.fillStyle(c2, 1); g.fillRect(-u * 0.28, u * 0.24, u * 0.56, u * 0.06); // 밑단
  }),
];

// ───────────────────── 목걸이 (necklace) — 목 둘레 + 펜던트 ─────────────────────
const NECKLACES: BaseDesign[] = [
  mk('pendant', '펜던트', 1, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.04, 0xf6c945, 1); g.beginPath(); g.arc(0, -u * 0.1, u * 0.3, DEG(20), DEG(160), false); g.strokePath();
    g.fillStyle(c1, 1); g.fillCircle(0, u * 0.18, u * 0.1);
  }),
  mk('beads', '구슬목걸이', 1, (s, g, u, c1, c2) => {
    for (let i = 0; i <= 8; i++) {
      const a = DEG(20 + (140 / 8) * i);
      g.fillStyle(i % 2 ? c2 : c1, 1);
      g.fillCircle(Math.cos(a) * u * 0.32, -u * 0.06 + Math.sin(a) * u * 0.32, u * 0.05);
    }
  }),
  mk('gem', '보석목걸이', 3, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.035, 0xc7ced8, 1); g.beginPath(); g.arc(0, -u * 0.12, u * 0.28, DEG(25), DEG(155), false); g.strokePath();
    g.fillStyle(c1, 1); g.fillPoints([{ x: 0, y: u * 0.04 }, { x: u * 0.12, y: u * 0.14 }, { x: 0, y: u * 0.3 }, { x: -u * 0.12, y: u * 0.14 }], true);
    g.fillStyle(0xffffff, 0.6); g.fillTriangle(0, u * 0.04, u * 0.06, u * 0.12, -u * 0.06, u * 0.12);
  }),
  mk('bowtie', '나비넥타이', 1, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1);
    g.fillTriangle(-u * 0.04, 0, -u * 0.32, -u * 0.16, -u * 0.32, u * 0.16);
    g.fillTriangle(u * 0.04, 0, u * 0.32, -u * 0.16, u * 0.32, u * 0.16);
    g.fillStyle(c2, 1); g.fillRoundedRect(-u * 0.06, -u * 0.1, u * 0.12, u * 0.2, u * 0.03);
  }),
  mk('medal', '메달', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillTriangle(-u * 0.18, -u * 0.28, u * 0.18, -u * 0.28, 0, u * 0.0); // 리본
    g.fillStyle(0xf6c945, 1); g.fillCircle(0, u * 0.16, u * 0.15);
    g.fillStyle(shade(0xf6c945, 0.8), 1); g.fillPoints(starPts(0, u * 0.16, 5, u * 0.04, u * 0.09), true);
  }),
  mk('bell', '방울', 1, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.1, c1, 1); g.beginPath(); g.arc(0, -u * 0.08, u * 0.28, DEG(25), DEG(155), false); g.strokePath();
    g.fillStyle(0xf6c945, 1); g.fillCircle(0, u * 0.2, u * 0.11);
    g.fillStyle(shade(0xf6c945, 0.7), 1); g.fillRect(-u * 0.11, u * 0.2, u * 0.22, u * 0.03);
  }),
  mk('locket', '로켓', 2, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.035, 0xf6c945, 1); g.beginPath(); g.arc(0, -u * 0.12, u * 0.28, DEG(25), DEG(155), false); g.strokePath();
    heart(g, 0, u * 0.12, u * 0.12, c1);
  }),
  mk('choker', '초커', 1, (s, g, u, c1, c2) => {
    g.lineStyle(u * 0.1, c1, 1); g.beginPath(); g.arc(0, -u * 0.16, u * 0.3, DEG(30), DEG(150), false); g.strokePath();
    g.fillStyle(c2, 1); g.fillCircle(0, u * 0.12, u * 0.06);
  }),
  mk('tie', '넥타이', 2, (s, g, u, c1, c2) => {
    g.fillStyle(c1, 1); g.fillTriangle(-u * 0.08, -u * 0.12, u * 0.08, -u * 0.12, 0, -u * 0.24); // 매듭
    g.fillPoints([{ x: -u * 0.08, y: -u * 0.1 }, { x: u * 0.08, y: -u * 0.1 }, { x: u * 0.05, y: u * 0.22 }, { x: 0, y: u * 0.32 }, { x: -u * 0.05, y: u * 0.22 }], true);
  }),
];

export const BASE_DESIGNS: Record<Slot, BaseDesign[]> = {
  hat: HATS,
  glasses: GLASSES,
  weapon: WEAPONS,
  shoes: SHOES,
  clothes: CLOTHES,
  necklace: NECKLACES,
};

export const PALETTE: PaletteColor[] = [
  { key: 'red', name: '빨강', color: 0xff5a5a, rarity: 0 },
  { key: 'blue', name: '파랑', color: 0x4a90e2, rarity: 0 },
  { key: 'green', name: '초록', color: 0x5ec26a, rarity: 0 },
  { key: 'yellow', name: '노랑', color: 0xffd24a, rarity: 0 },
  { key: 'pink', name: '분홍', color: 0xff8fc7, rarity: 0 },
  { key: 'purple', name: '보라', color: 0xa779e8, rarity: 0 },
  { key: 'orange', name: '주황', color: 0xff9f43, rarity: 0 },
  { key: 'white', name: '하양', color: 0xf2f2f2, rarity: 0 },
  { key: 'black', name: '검정', color: 0x3a3f4a, rarity: 1 },
  { key: 'sky', name: '하늘', color: 0x6fd6e8, rarity: 1 },
  { key: 'gold', name: '황금', color: 0xf6c945, rarity: 2 },
  { key: 'silver', name: '은빛', color: 0xc7ced8, rarity: 2 },
];

const TIER_PRICE = [0, 3, 6, 12, 24];
const RARITY_ADD = [0, 6, 20];

function buildItems(): ItemDef[] {
  const out: ItemDef[] = [];
  (Object.keys(BASE_DESIGNS) as Slot[]).forEach((slot) => {
    BASE_DESIGNS[slot].forEach((b) => {
      const colors = b.monochrome ? [PALETTE.find((p) => p.key === 'gold')!] : PALETTE;
      colors.forEach((p) => {
        out.push({
          id: `${slot}_${b.key}_${p.key}`,
          slot,
          name: b.monochrome ? b.name : `${p.name} ${b.name}`,
          price: Phaser.Math.Clamp(TIER_PRICE[b.tier] + RARITY_ADD[p.rarity], 3, 50),
          base: b.key,
          color: p.color,
          color2: shade(p.color, 0.72),
        });
      });
    });
  });
  return out;
}

// ── 직접 그린 이미지 아이템 (범용: 한 장으로 1025마리 모두 착용) ──
// public/items/{slot}/*.png 에 그림을 넣고 여기 등록. (흰 배경은 로드시 자동 제거)
export const IMAGE_ITEMS: ItemDef[] = [
  { id: 'hat_img_safari', slot: 'hat', name: '사파리모자', price: 8, base: '', color: 0, color2: 0, img: 'items/hat/safari.png' },
];

export const ITEMS: ItemDef[] = [...IMAGE_ITEMS, ...buildItems()];

const BY_BASE: Record<string, BaseDesign> = (() => {
  const m: Record<string, BaseDesign> = {};
  (Object.keys(BASE_DESIGNS) as Slot[]).forEach((slot) => BASE_DESIGNS[slot].forEach((b) => (m[b.key] = b)));
  return m;
})();

const itemKey = (id: string) => `item_${id}`;
const SPRITE_VER = '1'; // 이미지 아이템 캐시 버전(그림 교체 시 올릴 것)

/** 흰 배경(가장자리에서 연결된 흰색)을 투명으로 만들어 반환. */
function removeWhiteBg(src: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width as number;
  const h = src.height as number;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src as CanvasImageSource, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const isWhite = (i: number) => d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const i = p * 4;
    if (!isWhite(i)) continue;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** 이미지 아이템 텍스처를 로드(흰배경 제거 후 캔버스 텍스처로 등록)한 뒤 done(). 파일 없으면 건너뜀. */
export function loadItemTextures(scene: Phaser.Scene, done: () => void): void {
  const need = IMAGE_ITEMS.filter((i) => i.img && !scene.textures.exists(itemKey(i.id)));
  if (need.length === 0) {
    done();
    return;
  }
  need.forEach((i) => scene.load.image(`raw_${i.id}`, `${i.img}?v=${SPRITE_VER}`));
  scene.load.once('complete', () => {
    need.forEach((i) => {
      const rk = `raw_${i.id}`;
      if (!scene.textures.exists(rk)) return; // 파일 없음 → 건너뜀(placeholder 표시)
      try {
        const srcImg = scene.textures.get(rk).getSourceImage() as HTMLImageElement;
        scene.textures.addCanvas(itemKey(i.id), removeWhiteBg(srcImg));
      } catch {
        /* ignore */
      }
      scene.textures.remove(rk);
    });
    done();
  });
  scene.load.start();
}

/** 아이템 하나를 (x,y) 중심·size 크기로 그려 컨테이너 반환. 상점 칸·포켓몬 오버레이 공용. */
export function drawItem(scene: Phaser.Scene, def: ItemDef, x: number, y: number, size: number): Phaser.GameObjects.Container {
  if (def.img) {
    const c = scene.add.container(x, y);
    const key = itemKey(def.id);
    if (scene.textures.exists(key)) {
      const im = scene.add.image(0, 0, key);
      im.setScale(size / Math.max(im.width, im.height));
      c.add(im);
    } else {
      // 이미지 아직 없음 → 간단 placeholder
      const g = scene.add.graphics();
      g.fillStyle(0xdfe7ff, 1);
      g.fillRoundedRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8, size * 0.12);
      g.lineStyle(2, 0x6c8cff, 1);
      g.strokeRoundedRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8, size * 0.12);
      c.add(g);
      c.add(scene.add.text(0, 0, '🖼', { fontSize: `${Math.round(size * 0.4)}px` }).setOrigin(0.5));
    }
    return c;
  }
  const b = BY_BASE[def.base];
  if (!b) return scene.add.container(x, y);
  return b.draw(scene, x, y, size, def.color, def.color2);
}
