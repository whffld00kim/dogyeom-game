import Phaser from 'phaser';
import { DESIGN, FONT } from '../theme';
import { loadState, gameState } from '../systems/save';
import { reconcileCaught } from '../systems/dex';
import { setLevel } from '../systems/music';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#8fd3ff');
    this.add.text(DESIGN.width / 2, DESIGN.height / 2 - 30, '🐲', { fontSize: '96px' }).setOrigin(0.5);
    this.add
      .text(DESIGN.width / 2, DESIGN.height / 2 + 80, '불러오는 중...', {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#2b3a67',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    loadState().then((oldSave) => {
      if (oldSave) reconcileCaught(); // 구버전 저장만 1회 보정
      setLevel(gameState.soundLevel); // 저장된 소리 레벨 적용
      this.scene.start('Title');
    });
  }
}
