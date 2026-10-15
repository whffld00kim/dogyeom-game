import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, toast, ButtonContainer, applyHiRes, GLOSS3D, addCoinHud } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';
import {
  outfitsFor,
  getOutfit,
  drawOutfit,
  loadOutfitTextures,
  isOutfitOwned,
  equippedOutfit,
  buyOutfit,
  equipOutfit,
  outfitPrice,
  type OutfitDef,
} from '../systems/outfits';
import { getName, loadPokeSprites, addPokeIcon, REGIONS, pokeKeepKeys } from '../systems/dex';

type Cell = { none: true } | { none: false; outfit: OutfitDef };
const NONE = '__none__';
const SEL_PER = 12; // 선택기 한 페이지 포켓몬 수

export default class ShopScene extends Phaser.Scene {
  private selectedId = 0;
  private previewId: string = NONE; // 미리보기/구입 대상 코디 (NONE=없음)
  private caught: number[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private gridLayer!: Phaser.GameObjects.Container;
  private selRing!: Phaser.GameObjects.Graphics;
  private previewLayer!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private emptyText!: Phaser.GameObjects.Text;
  private actionBtn!: ButtonContainer;
  private selHighlights: Record<number, Phaser.GameObjects.Graphics> = {};
  private tier = 0; // 0 일반 / 1 희귀 / 2 최고
  private tierBtns: ButtonContainer[] = [];

  private cells: Cell[] = [];
  private gridMinY = 0;
  private gridMaxY = 0;

  // 와이드 화면에서 콘텐츠 블록(미리보기+코디 격자)을 가운데 유지하는 가로 오프셋(16:9=0)
  private readonly offX = Math.floor((DESIGN.width - 1280) / 2);

  // 미리보기(선택 포켓몬) 위치
  private px = 235 + this.offX;
  private py = 470;

  // 잡은 포켓몬 가로 선택 스트립
  private selClipX = 56;
  private selClipW = 1168;
  private selClipY = 100;
  private selClipH = 104;
  private selItemW = 116;

  // 지역 탭 + 페이지 선택기 (마리 수 많아도 가볍고 쉽게)
  private selRegion = 0;
  private selPage = 0;
  private selTabBtns: ButtonContainer[] = [];
  private selRegionsList: number[] = [];
  private selRowLayer!: Phaser.GameObjects.Container;
  private selPageIds: number[] = [];
  private selRowStartX = 0;
  private selBusy = false; // 선택→로드 중 재선택 방지(동시 로드/해제 충돌 차단)

  // 코디 그리드(우측, 세로 스크롤) — 탭 없음. 세로 확장 화면에선 그리드가 아래로 더 길어짐
  private readonly gridX0 = 430 + this.offX;
  private readonly gridW = 810;
  private readonly gridTop = 380;
  private readonly gridViewH = DESIGN.height - 402;
  private readonly gridCols = 4;
  private readonly pitchX = 810 / 4;
  private readonly cellH = 150;

  constructor() {
    super('Shop');
  }

  create() {
    applyHiRes(this);
    this.selHighlights = {};
    this.cells = [];
    drawBackground(this, BIOME_COLORS['하늘']);

    makeButton(this, 110, 56, 150, 58, '◀ 뒤로', () => this.goBack(), { ...GLOSS3D, fontSize: 26 });
    this.add
      .text(DESIGN.width / 2, 30, '상점 꾸미기', { fontFamily: FONT, fontSize: '36px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5, 0);
    // 코인: 도감(포켓몬 도감) 기준 동일 스타일 — 28px, 어두운 글씨, 흰 외곽선, 알약 없음
    this.coinText = addCoinHud(this, DESIGN.width - 40, 46, { pill: false, color: '#3a4860', stroke: '#ffffff' });

    // 코디가 있는(꾸밀 수 있는) 포켓몬만 표시 — 관리자모드(전부 포획)에서도 가볍고, 빈 포켓몬을 안 보여줌
    this.caught = gameState.caught.filter((id) => outfitsFor(id).length > 0).sort((a, b) => a - b);
    if (this.caught.length === 0) {
      this.add
        .text(DESIGN.width / 2, DESIGN.height / 2, '아직 꾸밀 수 있는 포켓몬이 없어요!\n스테이지를 클리어해서 포켓몬을 잡으면\n예쁘게 꾸밀 수 있어요 🎀', {
          fontFamily: FONT,
          fontSize: '32px',
          color: '#2b3a67',
          align: 'center',
          lineSpacing: 16,
          fontStyle: 'bold',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      return;
    }

    this.selectedId = this.caught[0];
    // 선택 포켓몬만 먼저 로드 → buildUI. 선택기는 지역/페이지별로만 스프라이트 로드(마리 수 많아도 가벼움).
    loadPokeSprites(this, [this.selectedId], () => this.buildUI());
  }

  private buildUI() {
    this.buildSelector();
    this.buildPreviewPanel();

    this.gridLayer = this.add.container(0, this.gridTop);
    const mask = this.make.graphics({});
    mask.fillStyle(0xffffff);
    mask.fillRect(this.gridX0, this.gridTop, this.gridW, this.gridViewH);
    this.gridLayer.setMask(mask.createGeometryMask());
    this.emptyText = this.add
      .text(this.gridX0 + this.gridW / 2, this.gridTop + this.gridViewH / 2, '아직 코디가 없어요 🎨\n(시트를 만들면 여기 나와요)', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#6c7a99',
        align: 'center',
        lineSpacing: 12,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.bindGridInput();
    this.buildTierTabs();

    this.loadAndRender();
  }

  // ── 등급 탭 (일반/희귀/최고) ──
  private buildTierTabs() {
    const labels = ['일반', '희귀', '최고'];
    const cx = this.gridX0 + this.gridW / 2;
    const pitch = 252;
    const startX = cx - pitch;
    this.tierBtns = labels.map((l, i) =>
      makeButton(this, startX + i * pitch, 348, 232, 42, l, () => {
        if (this.tier === i) return;
        this.tier = i;
        this.refreshTierTabs();
        this.renderGrid(true);
      }, { ...GLOSS3D, fontSize: 22 }),
    );
    this.refreshTierTabs();
  }

  private refreshTierTabs() {
    this.tierBtns.forEach((b, i) => b.setBg(i === this.tier ? COLORS.btnGreen : COLORS.btnGray));
  }

  /** 선택 포켓몬의 코디 텍스처 로드 후 그리드/미리보기 갱신 */
  private loadAndRender() {
    this.previewId = equippedOutfit(this.selectedId) ?? NONE;
    const ids = outfitsFor(this.selectedId).map((o) => o.id);
    // 선택 포켓몬 스프라이트(아직 안 받았으면) + 코디 텍스처 로드 후 갱신
    loadPokeSprites(this, [this.selectedId], () =>
      loadOutfitTextures(this, ids, () => {
        try {
          this.renderGrid(true);
          this.refreshPreview();
          this.updateActionPanel();
        } catch (e) {
          console.warn('[shop] 렌더 오류', e);
        }
        // 메모리 해제는 반드시 미리보기 갱신 '후'에 — 표시 중 텍스처를 먼저 지우면 다음 렌더에서 크래시
        this.freeOutfitTexturesExcept(ids); // 지금 보는 포켓몬 코디만 유지
        this.freeSelPoke(); // 현재 페이지 + 선택 포켓몬 외 스프라이트 해제
        this.selBusy = false;
      }),
    );
  }

  /** 현재 포켓몬 외 코디 텍스처 해제 (메모리 누적 방지, 필요 시 자동 재로드) */
  private freeOutfitTexturesExcept(keepIds: string[]) {
    const keep = new Set(keepIds.map((id) => `outfit_${id}`));
    this.textures.getTextureKeys().forEach((k) => {
      if (k.startsWith('outfit_') && !keep.has(k)) this.textures.remove(k);
    });
  }

  // ── 지역 탭 + 페이지로 꾸밀 포켓몬 선택 (드래그 X, 실제 스프라이트는 페이지별로만 로드) ──
  private buildSelector() {
    // (뒤로 버튼과 겹쳐서 '꾸밀 포켓몬' 라벨 제거 — 지역 탭만으로 충분)
    // 9개 지역 모두 탭에 표시 (잡은 포켓몬 없는 지역은 비활성화)
    this.selRegionsList = REGIONS.map((_r, i) => i);
    this.selRegion = this.regionOf(this.selectedId);
    if (!this.selRegionsList.includes(this.selRegion)) this.selRegion = this.selRegionsList[0] ?? 0;
    const list0 = this.regionPokemon(this.selRegion);
    this.selPage = Math.max(0, Math.floor(list0.indexOf(this.selectedId) / SEL_PER));
    this.buildSelTabs();
    this.selRowLayer = this.add.container(0, 0);
    this.bindSelRowInput();
    this.renderSelRow();
  }

  private regionOf(id: number): number {
    for (let i = 0; i < REGIONS.length; i++) if (id >= REGIONS[i].start && id <= REGIONS[i].end) return i;
    return 0;
  }
  private regionPokemon(ri: number): number[] {
    const r = REGIONS[ri];
    return this.caught.filter((id) => id >= r.start && id <= r.end);
  }

  private buildSelTabs() {
    const n = this.selRegionsList.length;
    const areaL = 244, areaR = DESIGN.width - 28;
    const tabW = Math.min(126, Math.floor((areaR - areaL) / Math.max(1, n)) - 6);
    const pitch = tabW + 6;
    const totalW = n * pitch - 6;
    const firstCx = (areaL + areaR) / 2 - totalW / 2 + tabW / 2;
    this.selTabBtns = this.selRegionsList.map((ri, k) =>
      makeButton(this, firstCx + k * pitch, 108, tabW, 40, REGIONS[ri].name, () => {
        if (this.regionPokemon(ri).length === 0 || this.selRegion === ri) return; // 비활성(잡은 포켓몬 없음) 지역은 무시
        this.selRegion = ri;
        this.selPage = 0;
        this.refreshSelTabs();
        this.renderSelRow();
      }, { ...GLOSS3D, fontSize: 20 }),
    );
    this.refreshSelTabs();
  }
  private refreshSelTabs() {
    this.selTabBtns.forEach((b, k) => {
      const ri = this.selRegionsList[k];
      if (this.regionPokemon(ri).length === 0) {
        b.setBg(COLORS.btnGray); // 비활성: 회색 + 흐리게
        b.setAlpha(0.4);
        return;
      }
      b.setAlpha(1);
      b.setBg(ri === this.selRegion ? COLORS.btnGreen : COLORS.btnGray);
    });
  }

  private renderSelRow() {
    this.selRowLayer.removeAll(true);
    const list = this.regionPokemon(this.selRegion);
    const pages = Math.max(1, Math.ceil(list.length / SEL_PER));
    this.selPage = Phaser.Math.Clamp(this.selPage, 0, pages - 1);
    const pageIds = list.slice(this.selPage * SEL_PER, this.selPage * SEL_PER + SEL_PER);
    this.selPageIds = pageIds;
    const pitch = 94;
    const startX = DESIGN.width / 2 - ((SEL_PER - 1) * pitch) / 2;
    this.selRowStartX = startX;
    const cy = 222;
    if (pages > 1) {
      this.selRowLayer.add(makeButton(this, 44, cy, 52, 72, '◀', () => { if (this.selPage > 0) { this.selPage--; this.renderSelRow(); } }, { ...GLOSS3D, fontSize: 24, bg: this.selPage > 0 ? COLORS.btn : COLORS.btnGray }));
      this.selRowLayer.add(makeButton(this, DESIGN.width - 44, cy, 52, 72, '▶', () => { if (this.selPage < pages - 1) { this.selPage++; this.renderSelRow(); } }, { ...GLOSS3D, fontSize: 24, bg: this.selPage < pages - 1 ? COLORS.btn : COLORS.btnGray }));
      this.selRowLayer.add(this.add.text(DESIGN.width / 2, 290, `${this.selPage + 1} / ${pages}`, { fontFamily: FONT, fontSize: '16px', color: '#6c7a99', resolution: TEXT_RES }).setOrigin(0.5));
    }
    const myRegion = this.selRegion, myPage = this.selPage;
    loadPokeSprites(this, pageIds, () => {
      if (this.selRegion !== myRegion || this.selPage !== myPage || !this.selRowLayer.active) return;
      pageIds.forEach((id, i) => {
        const cx = startX + i * pitch;
        const hl = this.add.graphics();
        hl.fillStyle(COLORS.btnGreen, 1);
        hl.fillRoundedRect(cx - 39, cy - 39, 78, 78, 14);
        hl.setVisible(id === this.selectedId);
        const icon = addPokeIcon(this, cx, cy - 4, id, 58);
        const lbl = this.add.text(cx, cy + 34, getName(id), { fontFamily: FONT, fontSize: '12px', color: '#2b3a67', resolution: TEXT_RES }).setOrigin(0.5);
        this.selRowLayer.add([hl, icon, lbl]);
      });
      // 스프라이트 해제는 여기서 하지 않음 — loadAndRender에서 미리보기 갱신 후 freeSelPoke() 호출
    });
  }

  /** 현재 페이지 + 선택 포켓몬 외 스프라이트 해제(메모리).
   *  반드시 미리보기 갱신 후 호출 — 표시 중 텍스처를 먼저 지우면 렌더 크래시. */
  private freeSelPoke() {
    const keep = pokeKeepKeys([...this.selPageIds, this.selectedId]);
    this.textures.getTextureKeys().forEach((k) => {
      if (k.startsWith('poke_') && !keep.has(k)) this.textures.remove(k);
    });
  }

  private bindSelRowInput() {
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.worldY < 184 || p.worldY > 262) return;
      if (p.worldX < 84 || p.worldX > DESIGN.width - 84) return; // 좌우 화살표 영역 제외
      const i = Math.round((p.worldX - this.selRowStartX) / 94);
      if (i >= 0 && i < this.selPageIds.length && Math.abs(p.worldX - (this.selRowStartX + i * 94)) < 47) {
        this.selectPokemon(this.selPageIds[i]);
      }
    });
  }

  private selectPokemon(id: number) {
    if (id === this.selectedId || this.selBusy) return;
    this.selBusy = true;
    this.selectedId = id;
    this.renderSelRow();
    this.loadAndRender();
  }

  // ── 미리보기 패널 ──
  private buildPreviewPanel() {
    const { px, py } = this;
    this.nameText = this.add
      .text(px, 350, '', { fontFamily: FONT, fontSize: '26px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    const g = this.add.graphics();
    g.fillStyle(0x9fc6e0, 1);
    g.fillEllipse(px, py + 112, 240, 54);
    g.fillStyle(0x7fb0d0, 1);
    g.fillEllipse(px, py + 128, 198, 38);
    this.previewLayer = this.add.container(0, 0);

    // (코디명·가격 텍스트 삭제 — 구입 버튼에 가격 표시) 미리보기 아래 상대 위치(=640 at 16:9)
    this.actionBtn = makeButton(this, px, py + 170, 232, 62, '구입', () => this.onAction(), { ...GLOSS3D, fontSize: 28, bg: COLORS.btnGreen });
  }

  private refreshPreview() {
    this.previewLayer.removeAll(true);
    const { px, py } = this;
    const obj =
      this.previewId === NONE
        ? addPokeIcon(this, px, py, this.selectedId, 168)
        : drawOutfit(this, this.previewId, px, py, 168);
    this.previewLayer.add(obj);
    this.nameText.setText(getName(this.selectedId));
  }

  private updateActionPanel() {
    const id = this.previewId;
    if (id === NONE) {
      const has = !!equippedOutfit(this.selectedId);
      this.actionBtn.setVisible(has);
      if (has) {
        this.actionBtn.setLabel('기본으로');
        this.actionBtn.setBg(COLORS.btnGray);
      }
      return;
    }
    const o = getOutfit(id);
    if (!o) {
      this.actionBtn.setVisible(false);
      return;
    }
    this.actionBtn.setVisible(true);
    const appliedHere = equippedOutfit(this.selectedId) === id;
    if (appliedHere) {
      this.actionBtn.setLabel('적용 해제');
      this.actionBtn.setBg(COLORS.btnGray);
    } else if (isOutfitOwned(id)) {
      this.actionBtn.setLabel('적용하기');
      this.actionBtn.setBg(COLORS.btnGreen);
    } else {
      const price = outfitPrice(this.selectedId, id);
      const afford = gameState.coins >= price;
      this.actionBtn.setLabel(`구입  ${price}🪙`);
      this.actionBtn.setBg(afford ? COLORS.btnGreen : COLORS.btnGray);
    }
  }

  private onAction() {
    const id = this.previewId;
    const poke = this.selectedId;
    if (id === NONE) {
      equipOutfit(poke, null);
    } else {
      const o = getOutfit(id);
      if (!o) return;
      const appliedHere = equippedOutfit(poke) === id;
      if (appliedHere) {
        equipOutfit(poke, null); // 적용 해제
      } else if (isOutfitOwned(id)) {
        equipOutfit(poke, id); // 도감에 적용
      } else if (buyOutfit({ ...o, price: outfitPrice(poke, o.id) })) {
        toast(this, `${o.name} 구입! 🎉 적용 버튼을 누르면 도감에 반영돼요`); // 구입만(적용은 따로)
      } else {
        toast(this, '코인이 부족해요 😢');
        return;
      }
    }
    this.coinText.setText(`🪙 ${gameState.coins}`);
    this.refreshPreview();
    this.updateActionPanel();
    this.renderGrid();
  }

  // ── 코디 그리드 ──
  private renderGrid(resetScroll = false) {
    if (!this.gridLayer) return;
    this.gridLayer.removeAll(true);
    const full = outfitsFor(this.selectedId);
    const N = full.length;
    // 코디를 인덱스 기준 3등분: 일반(앞)/희귀(중간)/최고(뒤)
    const list = full.filter((_o, gi) => (N > 0 ? Math.floor((gi * 3) / N) : 0) === this.tier);
    this.emptyText.setVisible(N === 0);
    this.cells = [{ none: true }, ...list.map((outfit) => ({ none: false as const, outfit }))];
    if (N === 0) {
      // 코디 자체가 없음: 미리보기/버튼만(없음)
      this.selRing = this.add.graphics();
      this.gridLayer.add(this.selRing);
      this.gridMinY = this.gridMaxY = this.gridTop;
      this.gridLayer.y = this.gridTop;
      return;
    }
    this.cells.forEach((cell, i) => {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const x = this.gridX0 + this.pitchX * (col + 0.5);
      const localY = row * this.cellH + this.cellH / 2;
      this.makeCell(x, localY, cell);
    });
    this.selRing = this.add.graphics();
    this.gridLayer.add(this.selRing);
    const rows = Math.ceil(this.cells.length / this.gridCols);
    const contentH = rows * this.cellH;
    this.gridMaxY = this.gridTop;
    this.gridMinY = this.gridTop - Math.max(0, contentH - this.gridViewH);
    this.gridLayer.y = resetScroll ? this.gridMaxY : Phaser.Math.Clamp(this.gridLayer.y, this.gridMinY, this.gridMaxY);
    this.positionSelRing();
  }

  private positionSelRing() {
    if (!this.selRing) return;
    this.selRing.clear();
    const idx = this.cells.findIndex((c) => (c.none ? this.previewId === NONE : c.outfit.id === this.previewId));
    if (idx < 0) return;
    const col = idx % this.gridCols;
    const row = Math.floor(idx / this.gridCols);
    const x = this.gridX0 + this.pitchX * (col + 0.5);
    const y = row * this.cellH + this.cellH / 2;
    this.selRing.lineStyle(6, 0x2b7cff, 1);
    this.selRing.strokeRoundedRect(x - 92, y - 69, 184, 138, 16);
  }

  private makeCell(x: number, localY: number, cell: Cell) {
    const w = 184;
    const h = 138;
    const equippedHere = cell.none ? !equippedOutfit(this.selectedId) : equippedOutfit(this.selectedId) === cell.outfit.id;
    const owned = cell.none ? true : isOutfitOwned(cell.outfit.id);

    const c = this.add.container(x, localY);
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
      // 금지표시(벡터) — 이모지는 기기별로 위아래가 잘려서 직접 그림
      const ng = this.add.graphics();
      ng.lineStyle(7, 0xe23b3b, 1);
      ng.strokeCircle(0, -14, 30);
      ng.beginPath();
      ng.moveTo(-21.2, -35.2);
      ng.lineTo(21.2, 7.2);
      ng.strokePath();
      c.add(ng);
      c.add(this.add.text(0, 40, '기본', { fontFamily: FONT, fontSize: '22px', color: txtColor, fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    } else {
      const o = cell.outfit;
      c.add(drawOutfit(this, o.id, 0, -22, 84));
      let status: string;
      let sColor: string;
      if (equippedHere) {
        status = '적용중';
        sColor = '#ffffff';
      } else if (owned) {
        status = '보유';
        sColor = '#2e9e4f';
      } else {
        status = `${outfitPrice(this.selectedId, o.id)} 🪙`;
        sColor = '#2b3a67';
      }
      c.add(this.add.text(0, 52, status, { fontFamily: FONT, fontSize: '18px', color: sColor, fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    }
    this.gridLayer.add(c);
  }

  // ── 그리드 입력: 스크롤(드래그) vs 선택(탭) ──
  private bindGridInput() {
    let active = false;
    let downY = 0;
    let downGY = 0;
    let moved = false;
    let downIdx = -1;
    const inGrid = (p: Phaser.Input.Pointer) =>
      p.worldX >= this.gridX0 && p.worldX <= this.gridX0 + this.gridW && p.worldY >= this.gridTop && p.worldY <= this.gridTop + this.gridViewH;
    const cellIndexAt = (p: Phaser.Input.Pointer): number => {
      if (!inGrid(p)) return -1;
      const col = Math.floor((p.worldX - this.gridX0) / this.pitchX);
      if (col < 0 || col >= this.gridCols) return -1;
      const row = Math.floor((p.worldY - this.gridLayer.y) / this.cellH);
      if (row < 0) return -1;
      const i = row * this.gridCols + col;
      return i >= 0 && i < this.cells.length ? i : -1;
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!inGrid(p)) return;
      active = true;
      downY = p.worldY;
      downGY = this.gridLayer.y;
      moved = false;
      downIdx = cellIndexAt(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!active || !p.isDown) return;
      if (Math.abs(p.worldY - downY) > 6) moved = true;
      if (moved && this.gridMinY < this.gridMaxY) this.gridLayer.y = Phaser.Math.Clamp(downGY + (p.worldY - downY), this.gridMinY, this.gridMaxY);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!active) return;
      active = false;
      if (moved) return;
      const i = cellIndexAt(p);
      if (i >= 0 && i === downIdx) this.onCellSelect(this.cells[i]);
    });
  }

  private onCellSelect(cell: Cell) {
    this.previewId = cell.none ? NONE : cell.outfit.id;
    this.positionSelRing();
    this.refreshPreview();
    this.updateActionPanel();
  }

  /** 하드웨어 백버튼 / 뒤로 */
  goBack() {
    this.scene.start('StageMap');
  }
}
