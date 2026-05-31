import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { addAsh } from '../systems/dex';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    drawBackground(this, BIOME_COLORS['숲']);
    addCoinHud(this);

    // 주인공 지우 (스프라이트 없으면 도형으로 대체)
    const hero = addAsh(this, DESIGN.width / 2, 470, 150);
    this.tweens.add({ targets: hero, y: 454, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 타이틀
    this.add
      .text(DESIGN.width / 2, 120, '도겸이의', { fontFamily: FONT, fontSize: '40px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    this.add
      .text(DESIGN.width / 2, 190, '포켓몬 수학모험', {
        fontFamily: FONT,
        fontSize: '76px',
        color: '#2b3a67',
        fontStyle: 'bold',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);

    // 버튼
    makeButton(this, DESIGN.width / 2, 580, 340, 96, '▶  시작하기', () => this.scene.start('StageMap'), {
      bg: COLORS.btnGreen,
      fontSize: 40,
    });
    makeButton(this, DESIGN.width / 2, 670, 240, 64, '⚙  설정', () => this.scene.start('Settings'), { fontSize: 30 });

    // 버전 표시(업데이트 적용 확인용)
    this.add
      .text(18, DESIGN.height - 14, 'v17', { fontFamily: FONT, fontSize: '22px', color: '#2b3a67', resolution: TEXT_RES })
      .setOrigin(0, 1)
      .setAlpha(0.7);
  }
}
