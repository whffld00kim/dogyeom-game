import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    drawBackground(this, BIOME_COLORS['숲']);
    addCoinHud(this);

    // 마스코트(임시 도형)
    const hero = this.add.container(DESIGN.width / 2, 470);
    const body = this.add.circle(0, 0, 64, COLORS.player);
    body.setStrokeStyle(6, 0xffffff);
    const eyeL = this.add.circle(-22, -10, 15, 0xffffff);
    const eyeR = this.add.circle(22, -10, 15, 0xffffff);
    const pupL = this.add.circle(-20, -8, 7, 0x222222);
    const pupR = this.add.circle(24, -8, 7, 0x222222);
    const cheekL = this.add.circle(-34, 14, 8, 0xff9aa2);
    const cheekR = this.add.circle(34, 14, 8, 0xff9aa2);
    hero.add([body, cheekL, cheekR, eyeL, eyeR, pupL, pupR]);
    this.tweens.add({ targets: hero, y: hero.y - 16, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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
      .text(18, DESIGN.height - 14, 'v13', { fontFamily: FONT, fontSize: '22px', color: '#2b3a67', resolution: TEXT_RES })
      .setOrigin(0, 1)
      .setAlpha(0.7);
  }
}
