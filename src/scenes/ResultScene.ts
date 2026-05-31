import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, drawStars } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { getName, placeholderColor } from '../systems/dex';

export default class ResultScene extends Phaser.Scene {
  private rdata!: { index: number; stars: number; reward: number; caught: number | null };

  constructor() {
    super('Result');
  }

  init(data: { index: number; stars: number; reward: number; caught: number | null }) {
    this.rdata = data;
  }

  create() {
    const { index, stars, reward, caught } = this.rdata;
    drawBackground(this, BIOME_COLORS['초원']);
    addCoinHud(this);

    const hasCatch = caught != null;
    const pw = 660;
    const ph = hasCatch ? 520 : 420;
    const px = DESIGN.width / 2;
    const py = DESIGN.height / 2 + 10;
    const top = py - ph / 2;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(px - pw / 2, py - ph / 2 + 6, pw, ph, 28);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);
    g.lineStyle(5, COLORS.panel, 1);
    g.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);

    this.add
      .text(px, top + 46, `스테이지 ${index} 완료!`, { fontFamily: FONT, fontSize: '44px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    const starG = drawStars(this, px, top + 120, stars, 3, 36, 18);
    starG.setScale(0);
    this.tweens.add({ targets: starG, scale: 1, duration: 450, ease: 'Back.easeOut' });

    this.add
      .text(px, top + 188, `+${reward}  🪙`, { fontFamily: FONT, fontSize: '42px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    if (hasCatch) {
      const cy = top + 292;
      const circ = this.add.circle(px - 78, cy, 36, placeholderColor(caught!));
      circ.setStrokeStyle(4, 0xffffff);
      circ.setScale(0);
      this.tweens.add({ targets: circ, scale: 1, duration: 420, delay: 280, ease: 'Back.easeOut' });
      this.add
        .text(px - 24, cy, `${getName(caught!)}\n잡았다! 🎉`, {
          fontFamily: FONT,
          fontSize: '30px',
          color: '#2b3a67',
          fontStyle: 'bold',
          align: 'left',
          lineSpacing: 6,
          resolution: TEXT_RES,
        })
        .setOrigin(0, 0.5);
    }

    const by = py + ph / 2 - 56;
    makeButton(this, px - 185, by, 160, 72, '↻ 다시', () => this.scene.start('Game', { index }), { bg: COLORS.btnGray, fontSize: 30 });
    makeButton(this, px, by, 160, 72, '🗺 맵', () => this.scene.start('StageMap'), { fontSize: 30 });
    makeButton(this, px + 185, by, 160, 72, '다음 ▶', () => this.scene.start('Game', { index: index + 1 }), { bg: COLORS.btnGreen, fontSize: 30 });
  }
}
