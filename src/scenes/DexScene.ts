import Phaser from 'phaser';
import { DESIGN, FONT, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, applyHiRes, ButtonContainer, glassSlot } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { getName, REGIONS, loadPokeSprites, isCaught } from '../systems/dex';
import type { Region } from '../systems/dex';
import { addPokeDisplay, loadOutfitTextures, equippedOutfit } from '../systems/outfits';
import { gameState } from '../systems/save';

const COLS = 6;
const ROWS = 4;
const PER_PAGE = COLS * ROWS; // 24

export default class DexScene extends Phaser.Scene {
  private regionIdx = 0;
  private page = 0;
  private tabBtns: ButtonContainer[] = [];
  private contentLayer!: Phaser.GameObjects.Container;
  private swStartX = 0;
  private swStartY = 0;

  constructor() {
    super('Dex');
  }

  create() {
    applyHiRes(this);
    drawBackground(this, BIOME_COLORS['하늘']);
    addCoinHud(this, DESIGN.width - 40, 46, { pill: false, color: '#3a4860', stroke: '#ffffff' });
    makeButton(this, 96, 52, 150, 58, '◀ 뒤로', () => this.goBack(), { fontSize: 26, bg: 0x6a8cf5, gloss: true, border: 0xffffff, borderAlpha: 0.55, color: '#ffffff' });
    this.add
      .text(DESIGN.width / 2, 20, '포켓몬 도감', { fontFamily: FONT, fontSize: '36px', color: '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 5, resolution: TEXT_RES })
      .setOrigin(0.5, 0);

    // 기본: 잡은 게 가장 많은 지역 + 그 지역에서 첫 포획이 보이는 페이지 (없으면 관동 1페이지)
    const counts = REGIONS.map((r) => gameState.caught.filter((id) => id >= r.start && id <= r.end).length);
    let best = 0;
    for (let i = 1; i < REGIONS.length; i++) if (counts[i] > counts[best]) best = i;
    this.regionIdx = best;
    const r0 = REGIONS[best];
    const firstCaught = gameState.caught.filter((id) => id >= r0.start && id <= r0.end).sort((a, b) => a - b)[0];
    this.page = firstCaught ? Math.floor((firstCaught - r0.start) / PER_PAGE) : 0;
    this.contentLayer = this.add.container(0, 0);
    this.bindSwipe();
    this.buildTabs();
    this.loadDexBgThen(() => this.renderPage());
  }

  // 도감 배경 이미지(있으면) 로드 후 콜백. cover-fit·맨 뒤(-9), 없으면 그라데이션 폴백.
  private loadDexBgThen(done: () => void) {
    if (this.textures.exists('bg_dex')) {
      this.placeDexBg();
      done();
      return;
    }
    this.load.image('bg_dex', 'bg/dex.webp?v=4');
    this.load.once('complete', () => {
      this.placeDexBg();
      done();
    });
    this.load.once('loaderror', () => {});
    this.load.start();
  }

  private placeDexBg() {
    if (!this.textures.exists('bg_dex')) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, 'bg_dex');
    img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height)).setDepth(-9);
  }

  // 좌우 스와이프로 페이지 넘김 (탭 영역 y<170 은 제외)
  private bindSwipe() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swStartX = p.worldX;
      this.swStartY = p.worldY;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.swStartY < 170) return;
      const dx = p.worldX - this.swStartX;
      const dy = p.worldY - this.swStartY;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) this.changePage(dx < 0 ? 1 : -1);
    });
  }

  private changePage(delta: number) {
    const region = this.region();
    const pages = Math.max(1, Math.ceil((region.end - region.start + 1) / PER_PAGE));
    const np = Phaser.Math.Clamp(this.page + delta, 0, pages - 1);
    if (np !== this.page) {
      this.page = np;
      this.renderPage();
    }
  }

  /** 하드웨어 백버튼 / 뒤로 */
  goBack() {
    this.scene.start('StageMap');
  }

  private region(): Region {
    return REGIONS[this.regionIdx];
  }

  private regionCaughtCount(r: Region): number {
    return gameState.caught.filter((id) => id >= r.start && id <= r.end).length;
  }

  // ── 지역 탭(전 9지역 항상 표시) ──
  private buildTabs() {
    const n = REGIONS.length;
    const tabW = Math.min(150, Math.floor(1180 / n) - 8);
    const pitch = tabW + 8;
    const startX = DESIGN.width / 2 - ((n - 1) * pitch) / 2;
    this.tabBtns = REGIONS.map((r, i) =>
      makeButton(this, startX + i * pitch, 128, tabW, 50, r.name, () => {
        if (this.regionIdx === i) return;
        this.regionIdx = i;
        this.page = 0;
        this.refreshTabs();
        this.renderPage();
      }, { fontSize: 21, gloss: true, border: 0xffffff, borderAlpha: 0.6, bg: 0xffffff, color: '#3e4c70' }),
    );
    this.refreshTabs();
  }

  private refreshTabs() {
    // 활성 탭 = 라벤더 펄 + 흰 글자, 비활성 = 흰 글래스 펄 + 남색 글자
    this.tabBtns.forEach((b, i) => {
      if (i === this.regionIdx) {
        b.setBg(0xa6abec);
        b.setColor('#ffffff');
      } else {
        b.setBg(0xffffff);
        b.setColor('#3e4c70');
      }
    });
  }

  // ── 한 페이지 렌더 ──
  private renderPage() {
    this.contentLayer.removeAll(true);
    const region = this.region();
    const count = region.end - region.start + 1;
    const pages = Math.max(1, Math.ceil(count / PER_PAGE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);

    const pageStart = region.start + this.page * PER_PAGE;
    const pageEnd = Math.min(region.end, pageStart + PER_PAGE - 1);
    const ids: number[] = [];
    for (let id = pageStart; id <= pageEnd; id++) ids.push(id);
    this.freeTexturesExcept(ids); // 메모리: 현재 페이지 외 포켓몬/코디 텍스처 해제 (목록 가볍게)

    const got = this.regionCaughtCount(region);
    this.contentLayer.add(
      this.add
        .text(DESIGN.width / 2, 178, `${region.name} 지역 · ${got} / ${count} 마리`, { fontFamily: FONT, fontSize: '26px', color: '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4, resolution: TEXT_RES })
        .setOrigin(0.5),
    );

    // 잡은 포켓몬만 스프라이트/코디 로드(못 잡은 건 ❓ 카드라 로드 불필요 → 메모리 절약)
    const caughtIds = ids.filter((id) => isCaught(id));
    const oids = caughtIds.map((id) => equippedOutfit(id)).filter(Boolean) as string[];
    loadPokeSprites(this, caughtIds, () => loadOutfitTextures(this, oids, () => this.drawGrid(ids, pages)));
  }

  /** 현재 페이지에 필요 없는 poke_/outfit_ 텍스처를 해제해 메모리 누적 방지 (필요 시 자동 재로드) */
  private freeTexturesExcept(keepIds: number[]) {
    const keepPoke = new Set(keepIds.map((id) => `poke_${id}`));
    const keepOutfit = new Set(
      (keepIds.map((id) => equippedOutfit(id)).filter(Boolean) as string[]).map((oid) => `outfit_${oid}`),
    );
    this.textures.getTextureKeys().forEach((k) => {
      if ((k.startsWith('poke_') && !keepPoke.has(k)) || (k.startsWith('outfit_') && !keepOutfit.has(k))) {
        this.textures.remove(k);
      }
    });
  }

  private drawGrid(ids: number[], pages: number) {
    const topY = 236;
    const cellW = 196;
    const cellH = 110;
    const startX = DESIGN.width / 2 - ((COLS - 1) * cellW) / 2;
    ids.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * cellW;
      const y = topY + row * cellH;

      if (isCaught(id)) {
        const icon = addPokeDisplay(this, x, y, id, 72);
        const nm = this.add.text(x, y + 44, getName(id), { fontFamily: FONT, fontSize: '18px', color: '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        const num = this.add.text(x, y + 64, `#${id}`, { fontFamily: FONT, fontSize: '13px', color: '#3a4a6a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        this.contentLayer.add([icon, nm, num]);
      } else {
        // 미포획 = 포켓몬 크기 광택 글래스 슬롯 + 박스 아래 ???/번호 (텍스트 겹침 없음)
        const box = glassSlot(this, x, y, 47);
        const q = this.add.text(x, y, '?', { fontFamily: FONT, fontSize: '20px', color: '#7e93b8', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5);
        const nm = this.add.text(x, y + 44, '???', { fontFamily: FONT, fontSize: '18px', color: '#5a6b8c', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        const num = this.add.text(x, y + 64, `#${id}`, { fontFamily: FONT, fontSize: '13px', color: '#7a86a0', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        this.contentLayer.add([box, q, nm, num]);
      }
    });

    if (pages > 1) {
      const y = DESIGN.height - 40;
      const prev = makeButton(this, DESIGN.width / 2 - 150, y, 92, 52, '◀', () => {
        if (this.page > 0) {
          this.page--;
          this.renderPage();
        }
      }, { fontSize: 26, bg: 0xeaf0fa, gloss: true, border: 0xffffff, borderAlpha: 0.6, color: this.page > 0 ? '#5a6b8c' : '#aab4c4' });
      const next = makeButton(this, DESIGN.width / 2 + 150, y, 92, 52, '▶', () => {
        if (this.page < pages - 1) {
          this.page++;
          this.renderPage();
        }
      }, { fontSize: 26, bg: 0x6a8cf5, gloss: true, border: 0xffffff, borderAlpha: 0.55, color: this.page < pages - 1 ? '#ffffff' : '#c5d0e0' });
      const lbl = this.add.text(DESIGN.width / 2, y, `${this.page + 1} / ${pages}  (좌우로 넘겨요)`, { fontFamily: FONT, fontSize: '20px', color: '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
      this.contentLayer.add([prev, next, lbl]);
    }
  }
}
