import Phaser from 'phaser';
import { DESIGN, FONT, COLORS } from '../theme';
import { drawBackground, makeButton, addCoinHud, drawStars } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';

export default class ResultScene extends Phaser.Scene {
  private rdata!: { index: number; stars: number; reward: number };

  constructor() {
    super('Result');
  }

  init(data: { index: number; stars: number; reward: number }) {
    this.rdata = data;
  }

  create() {
    const { index, stars, reward } = this.rdata;
    drawBackground(this, BIOME_COLORS['초원']);
    addCoinHud(this);

    const pw = 640;
    const ph = 430;
    const px = DESIGN.width / 2;
    const py = DESIGN.height / 2 + 20;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(px - pw / 2, py - ph / 2 + 6, pw, ph, 28);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);
    g.lineStyle(5, COLORS.panel, 1);
    g.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);

    this.add
      .text(px, py - 150, `스테이지 ${index} 완료!`, {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#2b3a67',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const starGroup = drawStars(this, px, py - 50, stars, 3, 40, 20);
    starGroup.setScale(0);
    this.tweens.add({ targets: starGroup, scale: 1, duration: 450, ease: 'Back.easeOut' });

    this.add
      .text(px, py + 55, `+${reward}  🪙`, { fontFamily: FONT, fontSize: '50px', color: '#2b3a67', fontStyle: 'bold' })
      .setOrigin(0.5);

    makeButton(this, px - 185, py + 145, 160, 72, '↻ 다시', () => this.scene.start('Game', { index }), {
      bg: COLORS.btnGray,
      fontSize: 30,
    });
    makeButton(this, px, py + 145, 160, 72, '🗺 맵', () => this.scene.start('StageMap'), { fontSize: 30 });
    makeButton(this, px + 185, py + 145, 160, 72, '다음 ▶', () => this.scene.start('Game', { index: index + 1 }), {
      bg: COLORS.btnGreen,
      fontSize: 30,
    });
  }
}
