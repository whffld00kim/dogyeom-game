import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground, makeButton, addCoinHud, drawStars, applyHiRes } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { TOTAL, getName, loadPokeSprites, addPokeIcon, addSparkles, SHINY_GOLD, SHINY_GOLD_CSS } from '../systems/dex';
import { playCatch } from '../systems/music';
import { gameState, todayKey } from '../systems/save';

type ResultData = { index: number; stars: number; reward: number; caught: number | null; shiny?: number | null; shinyTry?: boolean; missedCatch?: boolean; counted?: boolean };

export default class ResultScene extends Phaser.Scene {
  private rdata!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData) {
    this.rdata = data;
  }

  create() {
    applyHiRes(this);
    const { index, stars, reward, caught, missedCatch, shinyTry } = this.rdata;
    const shiny = this.rdata.shiny ?? null;
    drawBackground(this, BIOME_COLORS['초원']);
    addCoinHud(this);

    const hasCatch = caught != null;
    const hasShiny = shiny != null;
    if (hasCatch || hasShiny) playCatch();
    const pw = 660;
    const ph = hasCatch || hasShiny || missedCatch ? 520 : 420;
    const px = DESIGN.width / 2;
    const py = DESIGN.height / 2 + 10;
    const top = py - ph / 2;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(px - pw / 2, py - ph / 2 + 6, pw, ph, 28);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);
    g.lineStyle(5, hasShiny ? SHINY_GOLD : COLORS.panel, 1);
    g.strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);

    this.add
      .text(px, top + 46, `스테이지 ${index} 완료!`, { fontFamily: FONT, fontSize: '44px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    const starG = drawStars(this, px, top + 120, stars, 3, 36, 18);
    starG.setScale(0);
    this.tweens.add({ targets: starG, scale: 1, duration: 450, ease: 'Back.easeOut' });

    if (reward > 0) {
      this.add
        .text(px, top + 188, `+${reward}  🪙`, { fontFamily: FONT, fontSize: '42px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
        .setOrigin(0.5);
    }

    if (hasShiny) {
      // 반짝이 포획 — 금빛 제목 + 반짝이 색 아이콘 + 별 가루
      const cy = top + 296;
      this.add
        .text(px + 6, cy, `✨ 반짝이 ${getName(shiny!)}\n잡았다! 🎉`, {
          fontFamily: FONT,
          fontSize: '30px',
          color: SHINY_GOLD_CSS,
          fontStyle: 'bold',
          align: 'left',
          lineSpacing: 6,
          resolution: TEXT_RES,
        })
        .setOrigin(0, 0.5);
      loadPokeSprites(this, [shiny!], () => {
        const icon = addPokeIcon(this, px - 96, cy, shiny!, 96, true) as Phaser.GameObjects.Image;
        const ns = icon.scaleX || 1;
        icon.setScale(0);
        this.tweens.add({ targets: icon, scaleX: ns, scaleY: ns, duration: 440, ease: 'Back.easeOut' });
        addSparkles(this, px - 96, cy, 110, 7);
      });
      const tn = gameState.dailyCatch[todayKey()] || 0;
      this.add
        .text(px, cy + 70, `오늘 ${tn}마리째! · 🎮 로블록스 ${tn}분`, {
          fontFamily: FONT,
          fontSize: '24px',
          color: '#2e9e4f',
          fontStyle: 'bold',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
    } else if (hasCatch) {
      const cy = top + 296;
      this.add
        .text(px + 6, cy, `${getName(caught!)}\n잡았다! 🎉`, {
          fontFamily: FONT,
          fontSize: '30px',
          color: '#2b3a67',
          fontStyle: 'bold',
          align: 'left',
          lineSpacing: 6,
          resolution: TEXT_RES,
        })
        .setOrigin(0, 0.5);
      loadPokeSprites(this, [caught!], () => {
        const icon = addPokeIcon(this, px - 96, cy, caught!, 96) as Phaser.GameObjects.Image;
        const ns = icon.scaleX || 1;
        icon.setScale(0);
        this.tweens.add({ targets: icon, scaleX: ns, scaleY: ns, duration: 440, ease: 'Back.easeOut' });
      });
      // 오늘 잡은 수 + 로블록스 보상(1마리 = 1분)
      const tn = gameState.dailyCatch[todayKey()] || 0;
      this.add
        .text(px, cy + 70, `오늘 ${tn}마리째! · 🎮 로블록스 ${tn}분`, {
          fontFamily: FONT,
          fontSize: '24px',
          color: '#2e9e4f',
          fontStyle: 'bold',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
    } else if (missedCatch) {
      const cy = top + 290;
      this.add
        .text(px, cy, shinyTry ? '아쉽다! 실수가 많아서\n반짝이를 놓쳤어요 😢\n다시 도전하면 잡을 수 있어요!' : '아쉽다! 실수가 많아서\n포켓몬도 코인도 놓쳤어요 😢\n다시 도전하면 잡을 수 있어요!', {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#e0556b',
          fontStyle: 'bold',
          align: 'center',
          lineSpacing: 8,
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
    } else if (this.rdata.counted) {
      // 이미 잡은 포켓몬 재도전 성공 — 오늘 기록(1마리=1분)에는 포함
      const tn = gameState.dailyCatch[todayKey()] || 0;
      this.add
        .text(px, top + 262, `오늘 ${tn}마리째! · 🎮 로블록스 ${tn}분`, {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#2e9e4f',
          fontStyle: 'bold',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
    }

    const by = py + ph / 2 - 56;
    makeButton(this, px - 185, by, 160, 72, '↻ 다시', () => this.scene.start('Game', { index }), { bg: COLORS.btnGray, fontSize: 30 });
    makeButton(this, px, by, 160, 72, '🗺 맵', () => this.scene.start('StageMap'), { fontSize: 30 });
    if (index < TOTAL) {
      makeButton(this, px + 185, by, 160, 72, '다음 ▶', () => this.scene.start('Game', { index: index + 1 }), { bg: COLORS.btnGreen, fontSize: 30 });
    } else {
      // 마지막 스테이지(1025): 다음 스테이지가 없으니 도감으로 (2026-10-15)
      makeButton(this, px + 185, by, 160, 72, '📕 도감', () => this.scene.start('Dex'), { bg: COLORS.btnGreen, fontSize: 30 });
    }
  }

  /** 하드웨어 백버튼 → 스테이지 선택으로 */
  goBack() {
    this.scene.start('StageMap');
  }
}
