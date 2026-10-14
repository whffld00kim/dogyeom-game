import Phaser from 'phaser';
import { DESIGN, FONT, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, applyHiRes, ButtonContainer, glassSlot, toast } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { getName, REGIONS, loadPokeSprites, isCaught, isShiny, isShinyMain, toggleShinyMain, addPokeIcon, addSparkles, SHINY_GOLD, SHINY_GOLD_CSS } from '../systems/dex';
import type { Region } from '../systems/dex';
import { addPokeDisplay, loadOutfitTextures, equippedOutfit } from '../systems/outfits';
import { gameState } from '../systems/save';

const COLS = 6;
const ROWS = 4;
const PER_PAGE = COLS * ROWS; // 24
// 칸 격자(그리기와 탭 히트테스트가 공유)
const GRID_TOP = 236;
const CELL_W = 196;
const CELL_H = 110;
const GRID_X0 = DESIGN.width / 2 - ((COLS - 1) * CELL_W) / 2;
const LONG_MS = 500; // 꾹 누르기 판정

export default class DexScene extends Phaser.Scene {
  private regionIdx = 0;
  private page = 0;
  private tabBtns: ButtonContainer[] = [];
  private contentLayer!: Phaser.GameObjects.Container;
  private swStartX = 0;
  private swStartY = 0;
  private swMoved = false;
  private longTimer?: Phaser.Time.TimerEvent;
  private longFired = false;
  private pageIds: number[] = []; // 지금 페이지의 포켓몬 id(히트테스트용)
  private renderSeq = 0; // renderPage 호출 번호 — 늦게 끝난 앞 페이지의 로드 콜백을 버리기 위해
  private popup?: Phaser.GameObjects.Container; // 꾹 누르기 큰 그림 팝업

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

  // 입력 셋 (2026-10-06 톡·꾹 추가): 옆으로 밀기 = 페이지 / 칸을 톡 = 메인 그림 반짝이↔보통 / 칸을 꾹(0.5초) = 큰 그림 팝업.
  // 탭 영역 y<170 은 제외. 팝업이 떠 있으면 아무 데나 톡 → 닫기만
  private bindSwipe() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swStartX = p.worldX;
      this.swStartY = p.worldY;
      this.swMoved = false;
      this.longFired = false;
      this.longTimer?.remove();
      if (this.popup || p.worldY < 170) return;
      const id = this.cellAt(p.worldX, p.worldY);
      if (id > 0 && isCaught(id)) {
        this.longTimer = this.time.delayedCall(LONG_MS, () => {
          if (this.swMoved || !p.isDown) return;
          this.longFired = true;
          this.openPopup(id);
        });
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      if (Math.abs(p.worldX - this.swStartX) > 12 || Math.abs(p.worldY - this.swStartY) > 12) {
        this.swMoved = true;
        this.longTimer?.remove();
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.longTimer?.remove();
      if (this.popup) {
        if (!this.longFired) this.closePopup(); // 팝업 뜬 채로 손을 뗀 그 터치는 닫지 않는다
        return;
      }
      if (this.longFired || this.swStartY < 170) return;
      const dx = p.worldX - this.swStartX;
      const dy = p.worldY - this.swStartY;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
        this.changePage(dx < 0 ? 1 : -1);
        return;
      }
      if (this.swMoved) return;
      const id = this.cellAt(p.worldX, p.worldY);
      if (id > 0 && this.cellAt(this.swStartX, this.swStartY) === id) this.onTapCell(id);
    });
  }

  /** 포인터 위치의 칸 포켓몬 id(현재 페이지) 또는 0 */
  private cellAt(wx: number, wy: number): number {
    const col = Math.round((wx - GRID_X0) / CELL_W);
    const row = Math.round((wy - GRID_TOP) / CELL_H);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 0;
    if (Math.abs(wx - (GRID_X0 + col * CELL_W)) > CELL_W / 2 - 8 || Math.abs(wy - (GRID_TOP + row * CELL_H)) > CELL_H / 2 - 4) return 0;
    const i = row * COLS + col;
    return i < this.pageIds.length ? this.pageIds[i] : 0;
  }

  /** 칸 톡: 반짝이를 잡은 포켓몬이면 메인 그림을 바꾸고 다시 그림, 아니면 한 줄 안내(고장난 게 아니라는 걸 알리려고) */
  private onTapCell(id: number) {
    if (!isCaught(id)) return;
    if (toggleShinyMain(id)) {
      this.renderPage();
      toast(this, isShinyMain(id) ? `✨ ${getName(id)} 반짝이가 메인!` : `${getName(id)} 보통 색이 메인!`);
    } else {
      toast(this, '반짝이를 먼저 잡아 봐! (잡은 스테이지를 다시 깨면 돼요)');
    }
  }

  /** 꾹 누르기 팝업: 어두운 배경 + 카드에 큰 그림(상점 미리 보기보다 크게). 반짝이가 있으면 둘을 나란히, 메인 쪽에 금테 */
  private openPopup(id: number) {
    this.closePopup();
    const c = this.add.container(0, 0).setDepth(60);
    this.popup = c;
    const dim = this.add.rectangle(DESIGN.width / 2, DESIGN.height / 2, DESIGN.width, DESIGN.height, 0x0b1022, 0.62);
    c.add(dim);
    const two = isShiny(id);
    const pw = two ? 820 : 520, ph = 460;
    const px = DESIGN.width / 2, py = DESIGN.height / 2;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(px - pw / 2, py - ph / 2 + 8, pw, ph, 32);
    g.fillStyle(0xffffff, 0.98);
    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 32);
    g.lineStyle(5, two ? SHINY_GOLD : 0x6a8cf5, 1);
    g.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 32);
    c.add(g);
    c.add(this.add.text(px, py - ph / 2 + 44, `${getName(id)}  #${id}`, { fontFamily: FONT, fontSize: '36px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    const size = 240;
    const iy = py + 10;
    const mainShiny = isShinyMain(id);
    const slot = (x: number, shiny: boolean, label: string, isMain: boolean) => {
      if (isMain && two) c.add(this.add.circle(x, iy, size * 0.6, 0xfff3c4).setStrokeStyle(5, SHINY_GOLD));
      // 보통 쪽은 입힌 코디가 있으면 코디 그림(칸과 같게). 반짝이는 코디 합성 그림이 없어 반짝이 색 원본 (2026-10-06 사용자 지적)
      c.add(shiny ? addPokeIcon(this, x, iy, id, size, true) : addPokeDisplay(this, x, iy, id, size));
      if (shiny) c.add(addSparkles(this, x, iy, size, 7));
      c.add(this.add.text(x, iy + size * 0.62, label + (isMain && two ? ' · 메인' : ''), { fontFamily: FONT, fontSize: '24px', color: shiny ? SHINY_GOLD_CSS : '#3e4c70', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0.5));
    };
    if (two) {
      slot(px - 190, false, '보통', !mainShiny);
      slot(px + 190, true, '✨ 반짝이', mainShiny);
    } else {
      slot(px, false, '', false);
    }
    c.add(this.add.text(px, py + ph / 2 - 28, '아무 데나 누르면 닫혀요', { fontFamily: FONT, fontSize: '18px', color: '#8a96ad', resolution: TEXT_RES }).setOrigin(0.5));
    c.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
  }

  private closePopup() {
    if (!this.popup) return;
    this.popup.destroy(true);
    this.popup = undefined;
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

  /** 하드웨어 백버튼 / 뒤로 — 팝업이 떠 있으면 팝업만 닫는다 */
  goBack() {
    if (this.popup) {
      this.closePopup();
      return;
    }
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
    this.closePopup();
    this.contentLayer.removeAll(true);
    const region = this.region();
    const count = region.end - region.start + 1;
    const pages = Math.max(1, Math.ceil(count / PER_PAGE));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);

    const pageStart = region.start + this.page * PER_PAGE;
    const pageEnd = Math.min(region.end, pageStart + PER_PAGE - 1);
    const ids: number[] = [];
    for (let id = pageStart; id <= pageEnd; id++) ids.push(id);
    this.pageIds = ids;
    this.freeTexturesExcept(ids); // 메모리: 현재 페이지 외 포켓몬/코디 텍스처 해제 (목록 가볍게)

    const got = this.regionCaughtCount(region);
    const shinyGot = gameState.shiny.filter((id) => id >= region.start && id <= region.end).length;
    this.contentLayer.add(
      this.add
        .text(DESIGN.width / 2, 178, `${region.name} 지역 · ${got} / ${count} 마리 · ✨ ${shinyGot}`, { fontFamily: FONT, fontSize: '26px', color: '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4, resolution: TEXT_RES })
        .setOrigin(0.5),
    );

    // 잡은 포켓몬만 스프라이트/코디 로드(못 잡은 건 ❓ 카드라 로드 불필요 → 메모리 절약)
    const caughtIds = ids.filter((id) => isCaught(id));
    const oids = caughtIds.map((id) => equippedOutfit(id)).filter(Boolean) as string[];
    // 로드가 끝나기 전에 다른 페이지·지역으로 넘어갔으면 이 콜백은 버린다 (안 그러면 앞 페이지가 지금 페이지 위에 겹쳐 그려졌다)
    const seq = ++this.renderSeq;
    const stillMine = () => seq === this.renderSeq && this.contentLayer.active;
    loadPokeSprites(this, caughtIds, () => {
      if (!stillMine()) return;
      loadOutfitTextures(this, oids, () => {
        if (stillMine()) this.drawGrid(ids, pages);
      });
    });
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
    ids.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = GRID_X0 + col * CELL_W;
      const y = GRID_TOP + row * CELL_H;

      if (isCaught(id)) {
        // 메인 그림: 톡으로 반짝이를 메인으로 두었으면 반짝이 색, 아니면 코디/보통 (2026-10-06)
        const mainShiny = isShinyMain(id);
        const icon = mainShiny ? addPokeIcon(this, x, y, id, 72, true) : addPokeDisplay(this, x, y, id, 72);
        const nm = this.add.text(x, y + 44, getName(id), { fontFamily: FONT, fontSize: '18px', color: mainShiny ? SHINY_GOLD_CSS : '#2b3a67', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        const num = this.add.text(x, y + 64, `#${id}`, { fontFamily: FONT, fontSize: '13px', color: '#3a4a6a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 3, resolution: TEXT_RES }).setOrigin(0.5);
        this.contentLayer.add([icon, nm, num]);
        // 반짝이 자리(오른쪽 위): 잡았으면 금테 안에 "메인이 아닌 쪽" 작은 그림 + 별, 아직이면 회색 ★ (2026-10-06)
        const sx = x + 58, sy = y - 30;
        if (isShiny(id)) {
          const ring = this.add.circle(sx, sy, 24, 0xfff3c4).setStrokeStyle(3, SHINY_GOLD);
          const mini = addPokeIcon(this, sx, sy, id, 40, !mainShiny);
          const star = this.add.star(sx + 19, sy - 19, 5, 5, 11, SHINY_GOLD).setStrokeStyle(2, 0xffffff);
          this.contentLayer.add([ring, mini, star]);
        } else {
          const ring = this.add.circle(sx, sy, 18, 0xffffff, 0.55).setStrokeStyle(2, 0xc5cde0);
          const star = this.add.star(sx, sy, 5, 5, 11, 0xd3d9e6);
          this.contentLayer.add([ring, star]);
        }
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
