import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';
import { getName, placeholderColor, TOTAL } from '../systems/dex';

export default class DexScene extends Phaser.Scene {
  constructor() {
    super('Dex');
  }

  create() {
    drawBackground(this, BIOME_COLORS['하늘']);
    addCoinHud(this);

    makeButton(this, 100, 56, 140, 58, '◀ 뒤로', () => this.scene.start('StageMap'), { fontSize: 26 });
    this.add
      .text(DESIGN.width / 2, 56, '포켓몬 도감', { fontFamily: FONT, fontSize: '40px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    const caught = gameState.caught.slice().sort((a, b) => a - b);
    this.add
      .text(DESIGN.width / 2, 108, `${caught.length} / ${TOTAL} 마리`, { fontFamily: FONT, fontSize: '26px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    const topY = 150;
    if (caught.length === 0) {
      this.add
        .text(DESIGN.width / 2, 380, '아직 잡은 포켓몬이 없어요!\n스테이지를 클리어하면 포켓몬을 잡을 수 있어요 🎮', {
          fontFamily: FONT,
          fontSize: '30px',
          color: '#2b3a67',
          align: 'center',
          lineSpacing: 14,
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      return;
    }

    // 스크롤 가능한 그리드
    const cols = 6;
    const cellW = 196;
    const cellH = 150;
    const startX = DESIGN.width / 2 - ((cols - 1) * cellW) / 2;
    const grid = this.add.container(0, topY);
    caught.forEach((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = row * cellH + 44;
      const circ = this.add.circle(x, y, 38, placeholderColor(id));
      circ.setStrokeStyle(4, 0xffffff);
      const eyeL = this.add.circle(x - 12, y - 6, 7, 0xffffff);
      const eyeR = this.add.circle(x + 12, y - 6, 7, 0xffffff);
      const nm = this.add.text(x, y + 54, getName(id), { fontFamily: FONT, fontSize: '21px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5);
      const num = this.add.text(x, y + 78, `#${id}`, { fontFamily: FONT, fontSize: '15px', color: '#6c7a99', resolution: TEXT_RES }).setOrigin(0.5);
      grid.add([circ, eyeL, eyeR, nm, num]);
    });

    const rows = Math.ceil(caught.length / cols);
    const contentH = rows * cellH + 60;
    const viewH = DESIGN.height - topY - 16;
    const maxY = topY;
    const minY = topY - Math.max(0, contentH - viewH);

    // 뷰포트 밖 클리핑
    const mask = this.make.graphics({});
    mask.fillStyle(0xffffff);
    mask.fillRect(0, topY, DESIGN.width, viewH);
    grid.setMask(mask.createGeometryMask());

    // 드래그 스크롤 (그리드 영역에서만)
    let dragging = false;
    let startPY = 0;
    let startGY = topY;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > topY) {
        dragging = true;
        startPY = p.y;
        startGY = grid.y;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (dragging && p.isDown) grid.y = Phaser.Math.Clamp(startGY + (p.y - startPY), minY, maxY);
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });

    if (minY < maxY) {
      this.add
        .text(DESIGN.width / 2, DESIGN.height - 16, '↑↓ 끌어서 스크롤', { fontFamily: FONT, fontSize: '18px', color: '#6c7a99', resolution: TEXT_RES })
        .setOrigin(0.5, 1)
        .setDepth(5);
    }
  }
}
