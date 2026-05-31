import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, drawStars, toast } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';
import { currentRegion } from '../systems/dex';
import { regionIntro } from '../systems/story';

export default class StageMapScene extends Phaser.Scene {
  constructor() {
    super('StageMap');
  }

  create() {
    // 새 지역에 처음 들어오면 지역 인트로 대사 1회 표시
    const region = currentRegion();
    if (!gameState.seenStory.includes(region.name)) {
      this.scene.start('Dialogue', { lines: regionIntro(region.name), next: 'StageMap', seenKey: region.name });
      return;
    }

    drawBackground(this, BIOME_COLORS['숲']);
    addCoinHud(this);

    makeButton(this, 110, 56, 150, 58, '◀ 뒤로', () => this.scene.start('Title'), { fontSize: 26 });
    this.add
      .text(DESIGN.width / 2, 56, '스테이지', { fontFamily: FONT, fontSize: '38px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    makeButton(this, DESIGN.width - 480, 56, 150, 58, '📕 도감', () => this.scene.start('Dex'), { bg: COLORS.btnGreen, fontSize: 25 });
    makeButton(this, DESIGN.width - 320, 56, 150, 58, '🛍 상점', () => toast(this, '상점은 곧 추가됩니다!'), { bg: COLORS.tile, fontSize: 25 });
    makeButton(this, DESIGN.width - 185, 56, 100, 58, '⚙', () => this.scene.start('Settings'), { fontSize: 28 });

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
      // 좌표 기반(씬 레벨) 입력
      const hit = (p: Phaser.Input.Pointer) => Phaser.Math.Distance.Between(p.x, p.y, x, y) <= 46;
      const onDown = (p: Phaser.Input.Pointer) => {
        if (hit(p)) {
          c.setScale(0.94);
          this.scene.start('Game', { index: n });
        }
      };
      const onUp = () => c.setScale(1);
      this.input.on('pointerdown', onDown);
      this.input.on('pointerup', onUp);
      c.once('destroy', () => {
        this.input.off('pointerdown', onDown);
        this.input.off('pointerup', onUp);
      });
    }
  }
}
