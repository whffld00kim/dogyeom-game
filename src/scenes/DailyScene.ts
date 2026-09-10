import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, applyHiRes, GLOSS3D } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState, todayKey } from '../systems/save';

const ROWS = 7; // 페이지당 7일(1주)
const WD = ['일', '월', '화', '수', '목', '금', '토'];

/** 하루 포획 수 → 로블록스 보상 시간(분): 1마리 = 1분 */
function robloxMin(n: number): number {
  return n;
}

export default class DailyScene extends Phaser.Scene {
  private page = 0;
  private ui!: Phaser.GameObjects.Container;

  constructor() {
    super('Daily');
  }

  create() {
    applyHiRes(this);
    drawBackground(this, BIOME_COLORS['하늘']);
    // 배경: 지역선택과 같은 들판 이미지(있으면)
    if (this.textures.exists('bg_regions')) {
      this.placeBg();
    } else {
      this.load.image('bg_regions', 'bg/regions.webp?v=1');
      this.load.once('complete', () => this.placeBg());
      this.load.once('loaderror', () => {});
      this.load.start();
    }
    this.page = 0;
    this.ui = this.add.container(0, 0);
    this.render();
  }

  private placeBg() {
    if (!this.textures.exists('bg_regions') || !this.scene.isActive()) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, 'bg_regions');
    img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height)).setDepth(-9);
  }

  /** 기록된 가장 오래된 날짜 기준 총 페이지 수(최소 1, 최대 26주) */
  private pageCount(): number {
    const keys = Object.keys(gameState.dailyCatch);
    if (!keys.length) return 1;
    const earliest = keys.sort()[0];
    const e = new Date(`${earliest}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.round((now.getTime() - e.getTime()) / 86400000));
    return Math.min(26, Math.max(1, Math.ceil((days + 1) / ROWS)));
  }

  private keyOf(d: Date): string {
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private render() {
    this.ui.removeAll(true);
    const W = DESIGN.width;

    this.ui.add(makeButton(this, 110, 56, 150, 58, '◀ 뒤로', () => this.goBack(), { ...GLOSS3D, fontSize: 26 }));
    this.ui.add(
      this.add
        .text(W / 2, 56, '포켓몬 기록', { fontFamily: FONT, fontSize: '38px', color: '#ffffff', fontStyle: 'bold', stroke: '#2b3a67', strokeThickness: 6, resolution: TEXT_RES })
        .setOrigin(0.5),
    );

    // ── 오늘 카드 ──
    const todayN = gameState.dailyCatch[todayKey()] || 0;
    const tm = robloxMin(todayN);
    const g = this.add.graphics();
    g.fillStyle(0x1e3a66, 0.14);
    g.fillRoundedRect(W / 2 - 310, 106, 620, 186, 26);
    g.fillStyle(0xffffff, 0.96);
    g.fillRoundedRect(W / 2 - 310, 102, 620, 186, 26);
    g.lineStyle(4, COLORS.panel, 1);
    g.strokeRoundedRect(W / 2 - 310, 102, 620, 186, 26);
    this.ui.add(g);
    this.ui.add(
      this.add.text(W / 2, 136, '오늘 잡은 포켓몬', { fontFamily: FONT, fontSize: '24px', color: '#5a6b8c', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5),
    );
    this.ui.add(
      this.add.text(W / 2, 192, `${todayN}마리`, { fontFamily: FONT, fontSize: '62px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5),
    );
    const rewardTxt = tm > 0 ? `🎮 로블록스 ${tm}분!` : `한 마리 잡으면 🎮 1분!`;
    this.ui.add(
      this.add.text(W / 2, 252, rewardTxt, { fontFamily: FONT, fontSize: '26px', color: tm > 0 ? '#2e9e4f' : '#7a86a0', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5),
    );

    // ── 날짜별 기록(최근순, 페이지=1주) ──
    const pages = this.pageCount();
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const rowW = 780;
    const y0 = 330;
    const pitch = 46;
    const todayK = todayKey();
    for (let i = 0; i < ROWS; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (this.page * ROWS + i));
      const k = this.keyOf(d);
      const n = gameState.dailyCatch[k] || 0;
      const m = robloxMin(n);
      const y = y0 + i * pitch;
      const rg = this.add.graphics();
      rg.fillStyle(0xffffff, k === todayK ? 0.95 : 0.72);
      rg.fillRoundedRect(W / 2 - rowW / 2, y - 19, rowW, 40, 12);
      rg.lineStyle(2, k === todayK ? COLORS.tile : 0xbcd4ef, 1);
      rg.strokeRoundedRect(W / 2 - rowW / 2, y - 19, rowW, 40, 12);
      this.ui.add(rg);
      const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})${k === todayK ? ' · 오늘' : ''}`;
      this.ui.add(
        this.add.text(W / 2 - rowW / 2 + 26, y, label, { fontFamily: FONT, fontSize: '22px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0, 0.5),
      );
      this.ui.add(
        this.add.text(W / 2 + 120, y, `${n}마리`, { fontFamily: FONT, fontSize: '22px', color: n > 0 ? '#2b3a67' : '#9aa6b8', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(1, 0.5),
      );
      this.ui.add(
        this.add.text(W / 2 + rowW / 2 - 26, y, m > 0 ? `🎮 ${m}분` : '0분', { fontFamily: FONT, fontSize: '22px', color: m > 0 ? '#2e9e4f' : '#9aa6b8', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(1, 0.5),
      );
    }

    if (pages > 1) {
      const y = DESIGN.height - 40;
      this.ui.add(makeButton(this, W / 2 - 150, y, 92, 52, '◀', () => this.changePage(1), { ...GLOSS3D, fontSize: 26, bg: this.page < pages - 1 ? COLORS.btn : COLORS.btnGray }));
      this.ui.add(makeButton(this, W / 2 + 150, y, 92, 52, '▶', () => this.changePage(-1), { ...GLOSS3D, fontSize: 26, bg: this.page > 0 ? COLORS.btn : COLORS.btnGray }));
      this.ui.add(
        this.add.text(W / 2, y, `${this.page + 1} / ${pages} 주`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 4, resolution: TEXT_RES }).setOrigin(0.5),
      );
    }
  }

  /** ◀=과거로(페이지+), ▶=최근으로(페이지−) */
  private changePage(delta: number) {
    const np = Phaser.Math.Clamp(this.page + delta, 0, this.pageCount() - 1);
    if (np !== this.page) {
      this.page = np;
      this.render();
    }
  }

  /** 하드웨어 백버튼 / 뒤로 */
  goBack() {
    this.scene.start('StageMap');
  }
}
