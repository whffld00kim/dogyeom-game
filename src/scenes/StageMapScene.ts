import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES, regionBgPath } from '../theme';
import { drawBackground, makeButton, drawStars, applyHiRes, gateSettings, GLOSS3D } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState } from '../systems/save';
import { REGIONS, isCaught, isShiny, loadPokeSprites, addPokeIcon, SHINY_GOLD } from '../systems/dex';
import type { Region } from '../systems/dex';
import { regionIntro } from '../systems/story';

const COLS = 6;
const ROWS = 4;
const PER_PAGE = COLS * ROWS; // 24
// 세로 확장 화면(폴드 메인·16:10)에서 콘텐츠를 세로 중앙에 배치하기 위한 오프셋(16:9=0)
const OFFY = Math.floor((DESIGN.height - 720) / 2);
// 스테이지 노드 격자 좌표(스와이프 히트테스트와 렌더가 공유)
const GX0 = DESIGN.width / 2 - ((COLS - 1) * 196) / 2; // 150
const GY0 = 198 + OFFY;
const GAPX = 196;
const GAPY = 122;
const NODE_R = 48;

export default class StageMapScene extends Phaser.Scene {
  private view: 'regions' | 'stages' = 'regions';
  private regionIdx = 0;
  private page = 0;
  private ui!: Phaser.GameObjects.Container;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;
  private dragValid = false; // pointerdown 이 스테이지뷰에서 시작됐는지
  private dragNode = 0;

  constructor() {
    super('StageMap');
  }

  init(data: { openRegion?: number; page?: number }) {
    if (typeof data?.openRegion === 'number' && data.openRegion >= 0 && data.openRegion < REGIONS.length) {
      this.view = 'stages';
      this.regionIdx = data.openRegion;
    } else {
      this.view = 'regions';
    }
    this.page = typeof data?.page === 'number' ? data.page : 0;
  }

  create() {
    applyHiRes(this);
    drawBackground(this, BIOME_COLORS['숲']);
    this.ui = this.add.container(0, 0);
    this.bindSwipe();
    this.render();
  }

  // 탭/스와이프: 지역뷰=박스 탭 / 스테이지뷰=노드 탭 + 좌우 스와이프(페이지) — 씬 레벨 1회 바인딩
  private bindSwipe() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragStartX = p.worldX;
      this.dragStartY = p.worldY;
      this.dragMoved = false;
      this.dragValid = this.view === 'stages';
      this.dragNode = this.dragValid ? this.stageAt(p) : 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      if (Math.abs(p.worldX - this.dragStartX) > 12 || Math.abs(p.worldY - this.dragStartY) > 12) this.dragMoved = true;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.view === 'regions') {
        if (!this.dragMoved) {
          const i = this.regionBoxAt(p);
          if (i >= 0) this.openRegion(i);
        }
        return;
      }
      if (!this.dragValid || this.view !== 'stages') return;
      const dx = p.worldX - this.dragStartX;
      const dy = p.worldY - this.dragStartY;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
        this.changePage(dx < 0 ? 1 : -1); // 왼쪽으로 밀면 다음 페이지
        return;
      }
      if (!this.dragMoved && this.dragNode > 0 && this.stageAt(p) === this.dragNode) {
        this.scene.start('Game', { index: this.dragNode });
      }
    });
  }

  /** 포인터 위치의 스테이지 번호(노드 위) 또는 0 */
  private stageAt(p: Phaser.Input.Pointer): number {
    if (this.view !== 'stages') return 0;
    const region = REGIONS[this.regionIdx];
    const col = Math.round((p.worldX - GX0) / GAPX);
    const row = Math.round((p.worldY - GY0) / GAPY);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 0;
    if (Phaser.Math.Distance.Between(p.worldX, p.worldY, GX0 + col * GAPX, GY0 + row * GAPY) > NODE_R) return 0;
    const n = region.start + this.page * PER_PAGE + (row * COLS + col);
    return n <= region.end ? n : 0;
  }

  private pageCount(): number {
    const region = REGIONS[this.regionIdx];
    return Math.max(1, Math.ceil((region.end - region.start + 1) / PER_PAGE));
  }

  private changePage(delta: number) {
    const np = Phaser.Math.Clamp(this.page + delta, 0, this.pageCount() - 1);
    if (np !== this.page) {
      this.page = np;
      this.render();
    }
  }

  /** 하드웨어 백버튼 / 뒤로 */
  goBack() {
    if (this.view === 'stages') {
      this.view = 'regions';
      this.render();
    } else {
      this.scene.start('Title');
    }
  }

  private render() {
    this.ui.removeAll(true);
    if (this.view === 'regions') {
      this.renderRegions();
      return;
    }
    const region = REGIONS[this.regionIdx];
    if (!gameState.seenStory.includes(region.name)) {
      this.scene.start('Dialogue', { lines: regionIntro(region.name), next: 'StageMap', nextData: { openRegion: this.regionIdx }, seenKey: region.name });
      return;
    }
    this.renderStages();
  }

  // 상단 우측 버튼(도감/상점/설정) — 스테이지 뷰용. 코인(우측 99999까지)과 안 겹치게 왼쪽으로 당김
  /** 상단바 공통(지역선택·스테이지 동일): 뒤로 + 도감/상점(좌측) + 코인(우측끝) + 설정⚙(우측하단 투명). 라벨/동작만 다름 */
  private topBar(backLabel: string, backFn: () => void) {
    this.ui.add(makeButton(this, 110, 56, 150, 58, backLabel, backFn, { ...GLOSS3D, fontSize: 26 }));
    this.ui.add(makeButton(this, 272, 56, 134, 56, '📕 도감', () => this.scene.start('Dex'), { ...GLOSS3D, bg: COLORS.btnGreen, fontSize: 24 }));
    this.ui.add(makeButton(this, 416, 56, 134, 56, '🛍 상점', () => this.scene.start('Shop'), { ...GLOSS3D, bg: COLORS.tile, fontSize: 24 }));
    this.addCoin();
    // 설정(⚙): 화면 우측 하단 구석, 도형의 선·채움 모두 투명(흰 톱니바퀴만)
    this.ui.add(makeButton(this, DESIGN.width - 45, DESIGN.height - 38, 76, 56, '', () => gateSettings(this), { bg: 0xffffff, alpha: 0, border: 0xffffff, borderAlpha: 0, fontSize: 26, icon: 'gear' }));
    // 📅 기록(날짜별 포획 수): 좌측 하단 — ⚙와 대칭
    this.ui.add(makeButton(this, 105, DESIGN.height - 38, 150, 56, '📅 기록', () => this.scene.start('Daily'), { ...GLOSS3D, bg: COLORS.btn, fontSize: 24 }));
  }

  /** 코인 표시 — 포켓몬 도감과 동일 위치/스타일(우측 끝, y46, 28px, 어두운 글씨 + 흰 외곽선, 알약 없음) */
  private addCoin() {
    this.ui.add(
      this.add
        .text(DESIGN.width - 40, 46, `🪙 ${gameState.coins}`, { fontFamily: FONT, fontSize: '28px', color: '#3a4860', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4, resolution: TEXT_RES })
        .setOrigin(1, 0.5),
    );
  }

  // ── 지역 선택 화면 ──
  private renderRegions() {
    this.topBar('◀ 뒤로', () => this.goBack());
    this.ui.add(
      this.add.text(DESIGN.width / 2, 56, '지역 선택', { fontFamily: FONT, fontSize: '38px', color: '#ffffff', fontStyle: 'bold', stroke: '#2b3a67', strokeThickness: 6, resolution: TEXT_RES }).setOrigin(0.5),
    );

    // 전체 배경(지역선택) + 지역별 배틀 이미지 로드 후 박스 렌더
    const files: Record<string, string> = { bg_regions: 'bg/regions.webp?v=1' };
    REGIONS.forEach((_r, i) => (files[`rbg${i}`] = regionBgPath(i)));
    const need = Object.keys(files).filter((k) => !this.textures.exists(k));
    if (need.length === 0) {
      this.placeRegionsBgAndBoxes();
      return;
    }
    need.forEach((k) => this.load.image(k, files[k]));
    this.load.once('complete', () => this.placeRegionsBgAndBoxes());
    this.load.once('loaderror', () => this.placeRegionsBgAndBoxes());
    this.load.start();
  }

  private placeRegionsBgAndBoxes() {
    if (this.view !== 'regions' || !this.ui.active) return; // 로딩 중 화면 전환 방지
    if (this.textures.exists('bg_regions')) {
      const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, 'bg_regions');
      img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height));
      this.ui.addAt(img, 0); // this.ui 맨 뒤(다른 UI 뒤)
    }
    const cols = 3, cellW = 366, cellH = 170;
    const startX = DESIGN.width / 2 - cellW, startY = 210 + OFFY;
    REGIONS.forEach((r, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * cellW, y = startY + row * cellH;
      const total = r.end - r.start + 1;
      const got = gameState.caught.filter((id) => id >= r.start && id <= r.end).length;
      const sh = gameState.shiny.filter((id) => id >= r.start && id <= r.end).length;
      const done = got >= total;
      this.makeRegionBox(x, y, r, i, done);
      this.ui.add(
        this.add.text(x, y + 66, `${got} / ${total} 마리 ${done ? '✓' : ''}${sh > 0 ? ` · ✨ ${sh}` : ''}`, { fontFamily: FONT, fontSize: '21px', color: '#ffffff', fontStyle: 'bold', stroke: '#2b3a67', strokeThickness: 5, resolution: TEXT_RES }).setOrigin(0.5),
      );
    });
  }

  /** 지역 박스: 그 지역 배틀 이미지 배경(둥근 마스크) + 어두운 오버레이 + 흰 이름(외곽선) */
  private makeRegionBox(x: number, y: number, r: Region, i: number, done: boolean) {
    const w = 322, h = 96, rad = 18;
    const key = `rbg${i}`;
    if (this.textures.exists(key)) {
      const img = this.add.image(x, y, key);
      img.setScale(Math.max(w / img.width, h / img.height));
      const mg = this.make.graphics({});
      mg.fillStyle(0xffffff);
      mg.fillRoundedRect(x - w / 2, y - h / 2, w, h, rad);
      img.setMask(mg.createGeometryMask());
      this.ui.add(img);
    }
    const ov = this.add.graphics();
    ov.fillStyle(done ? 0x1e5b2a : 0x10151f, 0.4); // 글자 가독성용 어두운 틴트(완료지역은 초록빛)
    ov.fillRoundedRect(x - w / 2, y - h / 2, w, h, rad);
    ov.lineStyle(4, done ? 0x8fe06a : 0xffffff, 0.95);
    ov.strokeRoundedRect(x - w / 2, y - h / 2, w, h, rad);
    this.ui.add(ov);
    this.ui.add(
      this.add.text(x, y, `${r.name} 지역`, { fontFamily: FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold', stroke: '#1a2238', strokeThickness: 6, resolution: TEXT_RES }).setOrigin(0.5),
    );
  }

  /** 포인터가 어느 지역 박스 위인지(0~8) 또는 -1 */
  private regionBoxAt(p: Phaser.Input.Pointer): number {
    const cols = 3, cellW = 366, cellH = 170, w = 322, h = 96;
    const startX = DESIGN.width / 2 - cellW, startY = 210 + OFFY;
    for (let i = 0; i < REGIONS.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * cellW, y = startY + row * cellH;
      if (Math.abs(p.worldX - x) <= w / 2 && Math.abs(p.worldY - y) <= h / 2) return i;
    }
    return -1;
  }

  private openRegion(i: number) {
    this.view = 'stages';
    this.regionIdx = i;
    this.page = 0;
    this.render();
  }

  // ── 선택 지역의 스테이지 그리드 (몬스터로 표시) ──
  private renderStages() {
    const region = REGIONS[this.regionIdx];
    this.topBar('◀ 지역', () => this.goBack());
    // 배경: 해당 지역의 배틀 필드 이미지(cover-fit, 맨 뒤). 보통 지역선택서 이미 로드됨.
    const bgKey = `rbg${this.regionIdx}`;
    if (this.textures.exists(bgKey)) {
      this.placeStageBg(bgKey);
    } else {
      this.load.image(bgKey, regionBgPath(this.regionIdx));
      this.load.once(`filecomplete-image-${bgKey}`, () => {
        if (this.view === 'stages' && this.ui.active) this.placeStageBg(bgKey);
      });
      this.load.start();
    }
    this.ui.add(
      this.add.text(DESIGN.width / 2, 24, `${region.name} 지역`, { fontFamily: FONT, fontSize: '34px', color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 6, resolution: TEXT_RES }).setOrigin(0.5, 0),
    );

    const count = region.end - region.start + 1;
    const pages = this.pageCount();
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const got = gameState.caught.filter((id) => id >= region.start && id <= region.end).length;
    const sh = gameState.shiny.filter((id) => id >= region.start && id <= region.end).length;
    this.ui.add(
      this.add.text(DESIGN.width / 2, 92, `잡은 포켓몬 ${got} / ${count} · ✨ 반짝이 ${sh}`, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 4, resolution: TEXT_RES }).setOrigin(0.5),
    );

    if (pages > 1) {
      const y = DESIGN.height - 40;
      this.ui.add(makeButton(this, DESIGN.width / 2 - 150, y, 92, 52, '◀', () => this.changePage(-1), { ...GLOSS3D, fontSize: 26, bg: this.page > 0 ? COLORS.btn : COLORS.btnGray }));
      this.ui.add(makeButton(this, DESIGN.width / 2 + 150, y, 92, 52, '▶', () => this.changePage(1), { ...GLOSS3D, fontSize: 26, bg: this.page < pages - 1 ? COLORS.btn : COLORS.btnGray }));
      this.ui.add(
        this.add.text(DESIGN.width / 2, y, `${this.page + 1} / ${pages}  (좌우로 넘겨요)`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 4, resolution: TEXT_RES }).setOrigin(0.5),
      );
    }

    // 이 페이지의 포켓몬 스프라이트 로드 후 노드 그리기
    const grid = this.add.container(0, 0);
    this.ui.add(grid);
    const ids: number[] = [];
    const pageStart = region.start + this.page * PER_PAGE;
    const pageEnd = Math.min(region.end, pageStart + PER_PAGE - 1);
    for (let n = pageStart; n <= pageEnd; n++) ids.push(n);
    this.freePokeExcept(ids); // 메모리: 현재 페이지 외 포켓몬 텍스처 해제 (1025마리 누적 방지)
    const myRegion = this.regionIdx;
    const myPage = this.page;
    loadPokeSprites(this, ids, () => {
      if (!grid.active || this.view !== 'stages' || this.regionIdx !== myRegion || this.page !== myPage) return;
      ids.forEach((n, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        this.makeNode(grid, GX0 + col * GAPX, GY0 + row * GAPY, n);
      });
    });
  }

  /** 현재 페이지에 필요 없는 poke_ 텍스처 해제 (메모리 누적 방지, 필요 시 자동 재로드) */
  private freePokeExcept(keepIds: number[]) {
    const keep = new Set(keepIds.map((id) => `poke_${id}`));
    this.textures.getTextureKeys().forEach((k) => {
      if (k.startsWith('poke_') && !keep.has(k)) this.textures.remove(k);
    });
  }

  /** 스테이지 화면 배경 = 해당 지역 배틀 필드 이미지(cover-fit, this.ui 맨 뒤) */
  private placeStageBg(key: string) {
    if (!this.textures.exists(key)) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, key);
    img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height));
    this.ui.addAt(img, 0);
  }

  private makeNode(grid: Phaser.GameObjects.Container, x: number, y: number, n: number) {
    const stars = gameState.stageStars[n] ?? 0;
    const caught = isCaught(n);
    const shiny = isShiny(n); // 반짝이까지 잡은 스테이지는 금테 + 반짝이 색 그림 (2026-10-06)

    const c = this.add.container(x, y);
    const card = this.add.circle(0, 0, 46, shiny ? 0xfff3c4 : caught ? 0xd9f5d9 : 0xeaf0ff);
    card.setStrokeStyle(5, shiny ? SHINY_GOLD : caught ? 0x36a45a : 0xffffff);
    c.add(card);
    c.add(addPokeIcon(this, 0, 0, n, 76, shiny));
    c.add(this.add.text(0, 50, `${n}`, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 4, resolution: TEXT_RES }).setOrigin(0.5));
    if (shiny) {
      c.add(this.add.star(33, -33, 5, 6, 14, SHINY_GOLD).setStrokeStyle(3, 0xffffff));
    } else if (caught) {
      c.add(this.add.circle(33, -33, 13, 0x36a45a).setStrokeStyle(3, 0xffffff));
      c.add(this.add.text(33, -33, '✓', { fontFamily: FONT, fontSize: '15px', color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    }
    if (stars > 0) c.add(drawStars(this, 0, 70, stars, 3, 7, 3));
    grid.add(c);
  }
}
