import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, applyHiRes, gateSettings, GLOSS3D } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { addAsh } from '../systems/dex';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    applyHiRes(this);
    drawBackground(this, BIOME_COLORS['숲']);
    // 메인 배경 이미지(cover-fit, 맨 뒤). 없으면 위 그라데이션 폴백.
    if (this.textures.exists('bg_main')) {
      this.placeMainBg();
    } else {
      this.load.image('bg_main', 'bg/main.webp?v=1');
      this.load.once('complete', () => this.placeMainBg());
      this.load.once('loaderror', () => {});
      this.load.start();
    }
    // (메인화면 코인 표시 삭제 — 도형 포함)

    // 주인공 (정지 — 위아래 움직임 없음) — 세로 확장 화면에서도 버튼 위에 위치
    addAsh(this, DESIGN.width / 2, DESIGN.height - 340, 280);

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

    // 버튼 (다른 화면과 동일한 ④ 그라데이션 서식) — 하단 앵커(모든 화면비에서 아래 고정)
    makeButton(this, DESIGN.width / 2, DESIGN.height - 140, 340, 96, '▶ 시작하기', () => this.scene.start('StageMap'), {
      ...GLOSS3D,
      bg: COLORS.btnGreen,
      fontSize: 40,
    });
    makeButton(this, DESIGN.width / 2, DESIGN.height - 50, 240, 64, '설정', () => gateSettings(this), {
      ...GLOSS3D,
      bg: 0x6a8cf5,
      fontSize: 30,
      icon: 'gear',
    });

    // 버전 표시(업데이트 적용 확인용)
    this.add
      .text(18, DESIGN.height - 14, 'v67', { fontFamily: FONT, fontSize: '22px', color: '#2b3a67', resolution: TEXT_RES })
      .setOrigin(0, 1)
      .setAlpha(0.7);
  }

  private placeMainBg() {
    if (!this.textures.exists('bg_main')) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, 'bg_main');
    img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height)).setDepth(-9);
  }
}
