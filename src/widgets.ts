import Phaser from 'phaser';
import { FONT, COLORS, DESIGN } from './theme';
import { gameState } from './systems/save';

type Scene = Phaser.Scene;

export interface BtnOpts {
  bg?: number;
  color?: string;
  fontSize?: number;
  radius?: number;
}

export interface ButtonContainer extends Phaser.GameObjects.Container {
  setLabel: (s: string) => void;
  setBg: (f: number) => void;
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
  const c = scene.add.container(x, y) as ButtonContainer;
  const g = scene.add.graphics();
  const draw = (fill: number) => {
    g.clear();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  };
  draw(bg);
  const t = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color, fontStyle: 'bold', align: 'center' })
    .setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  c.on('pointerdown', () => c.setScale(0.95));
  c.on('pointerup', () => {
    c.setScale(1);
    onClick();
  });
  c.on('pointerout', () => c.setScale(1));
  c.setLabel = (s: string) => t.setText(s);
  c.setBg = (f: number) => draw(f);
  return c;
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

export function addCoinHud(scene: Scene, x = DESIGN.width - 40, y = 46): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, `🪙 ${gameState.coins}`, { fontFamily: FONT, fontSize: '34px', color: '#2b3a67', fontStyle: 'bold' })
    .setOrigin(1, 0.5)
    .setDepth(50);
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
    .text(0, 0, msg, { fontFamily: FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5);
  c.add([g, t]);
  c.setDepth(1000);
  toastObj = c;
  scene.tweens.add({ targets: c, alpha: { from: 1, to: 0 }, delay: 1100, duration: 500, onComplete: () => c.destroy() });
}
