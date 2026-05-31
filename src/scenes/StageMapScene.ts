import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, drawStars, toast } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';

export default class StageMapScene extends Phaser.Scene {
  constructor() {
    super('StageMap');
  }

  create() {
    drawBackground(this, BIOME_COLORS['숲']);
    addCoinHud(this);

    makeButton(this, 100, 56, 140, 58, '◀ 뒤로', () => this.scene.start('Title'), { fontSize: 26 });
    this.add
      .text(DESIGN.width / 2, 56, '스테이지', { fontFamily: FONT, fontSize: '40px', color: '#2b3a67', fontStyle: 'bold' })
      .setOrigin(0.5);
    makeButton(this, DESIGN.width - 400, 56, 150, 58, '🛍 상점', () => toast(this, '상점은 곧 추가됩니다!'), {
      bg: COLORS.tile,
      fontSize: 26,
    });
    makeButton(this, DESIGN.width - 250, 56, 110, 58, '⚙', () => this.scene.start('Settings'), { fontSize: 28 });

    // 스테이지 노드 (해금된 것 + 앞으로 3개까지 표시)
    const maxShow = Math.min(gameState.maxUnlocked + 3, 30);
    const cols = 6;
    const startX = 190;
    const startY = 190;
    const gapX = 180;
    const gapY = 135;
    for (let n = 1; n <= maxShow; n++) {
      const col = (n - 1) % cols;
      const row = Math.floor((n - 1) / cols);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      this.makeNode(x, y, n);
    }
  }

  private makeNode(x: number, y: number, n: number) {
    const unlocked = n <= gameState.maxUnlocked;
    const stars = gameState.stageStars[n] ?? 0;

    const c = this.add.container(x, y);
    const circ = this.add.circle(0, 0, 46, unlocked ? COLORS.panel : COLORS.lock);
    circ.setStrokeStyle(5, 0xffffff);
    const label = this.add
      .text(0, 0, unlocked ? `${n}` : '🔒', { fontFamily: FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    c.add([circ, label]);

    if (unlocked && stars > 0) {
      const st = drawStars(this, 0, 44, stars, 3, 9, 5);
      c.add(st);
    }

    if (unlocked) {
      c.setSize(92, 92);
      c.setInteractive(new Phaser.Geom.Circle(0, 0, 46), Phaser.Geom.Circle.Contains);
      c.on('pointerdown', () => {
        c.setScale(0.94);
        this.scene.start('Game', { index: n });
      });
      c.on('pointerup', () => c.setScale(1));
      c.on('pointerout', () => c.setScale(1));
    }
  }
}
