import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, TEXT_RES } from '../theme';
import { drawBackground } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState, persist } from '../systems/save';
import type { Line } from '../systems/story';

export default class DialogueScene extends Phaser.Scene {
  private lines: Line[] = [];
  private idx = 0;
  private nextScene = 'StageMap';
  private nextData: unknown = undefined;
  private seenKey?: string;
  private speakerTag!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;

  constructor() {
    super('Dialogue');
  }

  init(data: { lines: Line[]; next: string; nextData?: unknown; seenKey?: string }) {
    this.lines = data.lines || [];
    this.nextScene = data.next || 'StageMap';
    this.nextData = data.nextData;
    this.seenKey = data.seenKey;
    this.idx = 0;
  }

  create() {
    drawBackground(this, BIOME_COLORS['숲']);

    // 지우 아바타 (임시 — 실제 스프라이트는 APK 단계에서)
    const ax = 165;
    const ay = 345;
    const face = this.add.circle(ax, ay, 72, 0xffd2a6);
    face.setStrokeStyle(5, 0xffffff);
    this.add.circle(ax, ay - 48, 64, 0xee5544); // 빨간 모자 돔
    const brim = this.add.graphics();
    brim.fillStyle(0xee5544, 1);
    brim.fillRoundedRect(ax + 30, ay - 36, 76, 20, 10); // 모자 챙
    this.add.circle(ax - 24, ay + 18, 9, 0x222222); // 눈
    this.add.circle(ax + 24, ay + 18, 9, 0x222222);
    this.add.circle(ax - 40, ay + 34, 9, 0xff9aa2); // 볼
    this.add.circle(ax + 40, ay + 34, 9, 0xff9aa2);

    // 대사 상자
    const bx = 60;
    const bw = DESIGN.width - 120;
    const by = 468;
    const bh = 204;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(bx, by + 6, bw, bh, 24);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(bx, by, bw, bh, 24);
    g.lineStyle(5, COLORS.panel, 1);
    g.strokeRoundedRect(bx, by, bw, bh, 24);

    // 화자 이름표
    const tagW = 150;
    const tag = this.add.graphics();
    tag.fillStyle(COLORS.btnGreen, 1);
    tag.fillRoundedRect(bx + 30, by - 28, tagW, 56, 16);
    this.speakerTag = this.add
      .text(bx + 30 + tagW / 2, by, '지우', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    // 본문 (크게, 읽기 쉽게)
    this.body = this.add.text(bx + 44, by + 54, '', {
      fontFamily: FONT,
      fontSize: '38px',
      color: '#2b3a67',
      fontStyle: 'bold',
      lineSpacing: 16,
      wordWrap: { width: bw - 88 },
      resolution: TEXT_RES,
    });

    // 계속 힌트 (깜빡임)
    const hint = this.add
      .text(bx + bw - 28, by + bh - 16, '▶ 탭하여 계속', { fontFamily: FONT, fontSize: '22px', color: '#6c7a99', resolution: TEXT_RES })
      .setOrigin(1, 1);
    this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });

    this.input.on('pointerdown', () => this.advance());
    this.renderLine();
  }

  private renderLine() {
    const l = this.lines[this.idx];
    if (!l) {
      this.finish();
      return;
    }
    this.speakerTag.setText(l.speaker);
    this.body.setText(l.text);
  }

  private advance() {
    this.idx++;
    if (this.idx >= this.lines.length) this.finish();
    else this.renderLine();
  }

  private finish() {
    if (this.seenKey && !gameState.seenStory.includes(this.seenKey)) {
      gameState.seenStory.push(this.seenKey);
      persist();
    }
    this.scene.start(this.nextScene, this.nextData as object);
  }
}
