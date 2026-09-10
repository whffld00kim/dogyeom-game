import Phaser from 'phaser';
import { DESIGN, FONT } from '../theme';
import { loadState, gameState } from '../systems/save';
import { reconcileCaught } from '../systems/dex';
import { setLevel } from '../systems/music';
import { applyHiRes } from '../widgets';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // 주인공 이미지(이미 투명 PNG) → 직접 'ash' 텍스처로 로드(cutout 불필요). 없으면 벡터 대체.
    this.load.image('ash', 'ash.png?v=3');
    this.load.on('loaderror', () => {}); // ash.png 없을 때 무시
  }

  create() {
    applyHiRes(this);
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

    loadState().then(async (oldSave) => {
      if (oldSave) reconcileCaught(); // 구버전 저장만 1회 보정
      setLevel(gameState.soundLevel); // 저장된 소리 레벨 적용
      await this.ensureFonts(); // Jua 로딩 완료 후 진입(텍스트가 폴백폰트로 굳는 것 방지)
      this.scene.start('Title');
    });
  }

  /** Jua 웹폰트 로딩 대기 (최대 3.5초 — 캔버스/텍스트가 폴백으로 렌더되는 것 방지) */
  private async ensureFonts(): Promise<void> {
    try {
      const fonts = (document as unknown as { fonts?: { load: (s: string) => Promise<unknown>; ready: Promise<unknown> } }).fonts;
      if (!fonts || !fonts.load) return;
      await Promise.race([
        fonts.load('48px Jua').then(() => fonts.ready),
        new Promise((res) => setTimeout(res, 3500)),
      ]);
    } catch {
      /* 폰트 로딩 실패해도 폴백으로 진행 */
    }
  }
}
