import Phaser from 'phaser';
import { DESIGN, FONT } from '../theme';
import { loadState } from '../systems/save';

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

    loadState().then(() => this.scene.start('Title'));
  }
}
