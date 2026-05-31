import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, toast, ButtonContainer } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';
import { SLOTS, itemsBySlot, getItem, isOwned, equippedId, buyItem, equipItem } from '../systems/shop';
import type { Slot, Item } from '../systems/shop';

type Cell = { none: true } | { none: false; item: Item };

export default class ShopScene extends Phaser.Scene {
  private slot: Slot = 'hat';
  private coinText!: Phaser.GameObjects.Text;
  private gridLayer!: Phaser.GameObjects.Container;
  private previewItems!: Phaser.GameObjects.Container;
  private tabBtns: Partial<Record<Slot, ButtonContainer>> = {};
  private px = 300;
  private py = 380;

  constructor() {
    super('Shop');
  }

  create() {
    this.slot = 'hat';
    this.tabBtns = {};
    drawBackground(this, BIOME_COLORS['하늘']);

    makeButton(this, 110, 56, 150, 58, '◀ 뒤로', () => this.scene.start('StageMap'), { fontSize: 26 });
    this.add
      .text(DESIGN.width / 2, 40, '상점 · 꾸미기', { fontFamily: FONT, fontSize: '38px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5, 0);
    this.coinText = this.add
      .text(DESIGN.width - 40, 46, `🪙 ${gameState.coins}`, { fontFamily: FONT, fontSize: '34px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(1, 0.5)
      .setDepth(50);

    this.drawCharacter();
    this.previewItems = this.add.container(0, 0);
    this.refreshPreview();

    SLOTS.forEach((s, i) => {
      this.tabBtns[s.key] = makeButton(this, 600 + i * 180, 150, 165, 60, s.label, () => {
        this.slot = s.key;
        this.refreshTabs();
        this.scheduleGrid();
      }, { fontSize: 28 });
    });

    this.gridLayer = this.add.container(0, 0);
    this.refreshTabs();
    this.renderGrid();
  }

  private refreshTabs() {
    SLOTS.forEach((s) => this.tabBtns[s.key]!.setBg(s.key === this.slot ? COLORS.btnGreen : COLORS.btnGray));
  }

  private drawCharacter() {
    const { px, py } = this;
    const g = this.add.graphics();
    g.fillStyle(0x9fc6e0, 1);
    g.fillEllipse(px, py + 140, 230, 56);
    g.fillStyle(0x7fb0d0, 1);
    g.fillEllipse(px, py + 158, 190, 40);
    const face = this.add.circle(px, py, 80, 0xffd2a6);
    face.setStrokeStyle(6, 0xffffff);
    this.add.circle(px - 27, py + 6, 11, 0x222222);
    this.add.circle(px + 27, py + 6, 11, 0x222222);
    this.add.circle(px - 46, py + 30, 11, 0xff9aa2);
    this.add.circle(px + 46, py + 30, 11, 0xff9aa2);
    const mouth = this.add.graphics();
    mouth.lineStyle(4, 0x99603a, 1);
    mouth.beginPath();
    mouth.arc(px, py + 28, 24, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
    mouth.strokePath();
    this.add
      .text(px, py + 180, '지우', { fontFamily: FONT, fontSize: '30px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
  }

  private refreshPreview() {
    this.previewItems.removeAll(true);
    const { px, py } = this;
    const place = (id: string | undefined, ox: number, oy: number, size: string) => {
      if (!id) return;
      const it = getItem(id);
      if (it) this.previewItems.add(this.add.text(px + ox, py + oy, it.emoji, { fontSize: size }).setOrigin(0.5));
    };
    place(equippedId('hat'), 0, -66, '74px');
    place(equippedId('glasses'), 0, 2, '54px');
    place(equippedId('held'), 96, 44, '54px');
  }

  private scheduleGrid() {
    // 입력 emit 중 셀 파괴를 피하려고 다음 틱에 재구성
    this.time.delayedCall(1, () => this.renderGrid());
  }

  private renderGrid() {
    this.gridLayer.removeAll(true);
    const cells: Cell[] = [{ none: true }, ...itemsBySlot(this.slot).map((item) => ({ none: false as const, item }))];
    const cols = 3;
    const cellW = 210;
    const cellH = 152;
    const startX = 600;
    const startY = 246;
    cells.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.makeCell(startX + col * cellW, startY + row * cellH, cell);
    });
  }

  private makeCell(x: number, y: number, cell: Cell) {
    const w = 192;
    const h = 136;
    const equippedHere = cell.none ? !equippedId(this.slot) : equippedId(this.slot) === cell.item.id;
    const owned = cell.none ? true : isOwned(cell.item.id);

    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 16);
    g.fillStyle(equippedHere ? COLORS.btnGreen : 0xffffff, equippedHere ? 1 : 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(3, COLORS.panel, equippedHere ? 1 : 0.5);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    c.add(g);

    const txtColor = equippedHere ? '#ffffff' : '#2b3a67';
    if (cell.none) {
      c.add(this.add.text(0, -16, '🚫', { fontSize: '40px' }).setOrigin(0.5));
      c.add(this.add.text(0, 38, '없음', { fontFamily: FONT, fontSize: '24px', color: txtColor, fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    } else {
      const it = cell.item;
      c.add(this.add.text(0, -30, it.emoji, { fontSize: '48px' }).setOrigin(0.5));
      c.add(this.add.text(0, 22, it.name, { fontFamily: FONT, fontSize: '22px', color: txtColor, fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
      let status: string;
      let sColor: string;
      if (equippedHere) {
        status = '착용중';
        sColor = '#ffffff';
      } else if (owned) {
        status = '보유';
        sColor = '#2e9e4f';
      } else {
        status = `${it.price} 🪙`;
        sColor = '#2b3a67';
      }
      c.add(this.add.text(0, 50, status, { fontFamily: FONT, fontSize: '19px', color: sColor, fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    }

    const hit = (p: Phaser.Input.Pointer) => Math.abs(p.x - x) <= w / 2 && Math.abs(p.y - y) <= h / 2;
    const onDown = (p: Phaser.Input.Pointer) => {
      if (hit(p)) {
        c.setScale(0.95);
        this.onCellTap(cell);
      }
    };
    const onUp = () => c.setScale(1);
    this.input.on('pointerdown', onDown);
    this.input.on('pointerup', onUp);
    c.once('destroy', () => {
      this.input.off('pointerdown', onDown);
      this.input.off('pointerup', onUp);
    });
    this.gridLayer.add(c);
  }

  private onCellTap(cell: Cell) {
    if (cell.none) {
      equipItem(this.slot, null);
    } else {
      const it = cell.item;
      if (isOwned(it.id)) {
        equipItem(this.slot, equippedId(this.slot) === it.id ? null : it.id);
      } else if (buyItem(it)) {
        equipItem(this.slot, it.id);
        toast(this, `${it.name} 구매! 🎉`);
      } else {
        toast(this, '코인이 부족해요 😢');
        return;
      }
    }
    this.coinText.setText(`🪙 ${gameState.coins}`);
    this.refreshPreview();
    this.scheduleGrid();
  }
}
