import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, GROUND_Y } from '../theme';
import { drawBackground, makeButton, addCoinHud, toast } from '../widgets';
import { makeStage, stageReward, BIOME_COLORS } from '../systems/stageGenerator';
import type { Stage } from '../systems/stageGenerator';
import { makeProblem } from '../systems/mathGenerator';
import { gameState, recordStageClear } from '../systems/save';
import { TIME_SECONDS } from '../systems/settings';
import type { Problem, Settings } from '../types';

export default class GameScene extends Phaser.Scene {
  private index = 1;
  private stage!: Stage;
  private settings!: Settings;
  private total = 0;
  private solved = 0;
  private mistakes = 0;
  private bonusLost = false;
  private current!: Problem;
  private accepting = false;
  private inputValue = '';

  private bannerText!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressW = 900;
  private player!: Phaser.GameObjects.Container;
  private enemy!: Phaser.GameObjects.Container;
  private answerLayer!: Phaser.GameObjects.Container;
  private timerBar?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  init(data: { index?: number }) {
    this.index = data.index ?? 1;
  }

  create() {
    this.settings = gameState.settings;
    this.stage = makeStage(this.index, this.settings);
    this.total = this.stage.problems;
    this.solved = 0;
    this.mistakes = 0;
    this.bonusLost = false;
    this.accepting = false;

    const colors = BIOME_COLORS[this.stage.biome] ?? BIOME_COLORS['숲'];
    drawBackground(this, colors);

    // 상단 UI
    makeButton(this, 70, 56, 110, 58, '⏸', () => this.scene.start('StageMap'), { fontSize: 30, bg: COLORS.panel });
    addCoinHud(this);
    this.add
      .text(DESIGN.width / 2, 22, `스테이지 ${this.index} · ${this.stage.biome}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#2b3a67',
      })
      .setOrigin(0.5, 0);

    // 문제 배너
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(DESIGN.width / 2 - 235, 56, 470, 86, 24);
    bg.lineStyle(4, COLORS.panel, 1);
    bg.strokeRoundedRect(DESIGN.width / 2 - 235, 56, 470, 86, 24);
    this.bannerText = this.add
      .text(DESIGN.width / 2, 99, '', { fontFamily: FONT, fontSize: '52px', color: '#2b3a67', fontStyle: 'bold' })
      .setOrigin(0.5);

    // 캐릭터 / 적
    this.player = this.makeCreature(260, GROUND_Y - 50, COLORS.player, false);
    this.tweens.add({ targets: this.player, y: this.player.y - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.enemy = this.makeCreature(1360, GROUND_Y - 50, COLORS.enemy, true);

    // 피드백
    this.feedback = this.add
      .text(DESIGN.width / 2, 210, '', { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#2b3a67' })
      .setOrigin(0.5)
      .setDepth(20);

    // 진행 바
    const py = 698;
    this.add.rectangle(DESIGN.width / 2, py, this.progressW, 18, 0x000000, 0.15);
    this.progressFill = this.add
      .rectangle(DESIGN.width / 2 - this.progressW / 2, py, this.progressW, 18, COLORS.good)
      .setOrigin(0, 0.5);
    this.progressFill.scaleX = 0;

    this.answerLayer = this.add.container(0, 0);
    this.nextProblem();
  }

  private makeCreature(x: number, y: number, color: number, flip: boolean) {
    const c = this.add.container(x, y);
    const body = this.add.circle(0, 0, 48, color);
    body.setStrokeStyle(5, 0xffffff);
    const eyeL = this.add.circle(-17, -8, 12, 0xffffff);
    const eyeR = this.add.circle(17, -8, 12, 0xffffff);
    const pupL = this.add.circle(-17 + (flip ? -3 : 3), -8, 6, 0x222222);
    const pupR = this.add.circle(17 + (flip ? -3 : 3), -8, 6, 0x222222);
    c.add([body, eyeL, eyeR, pupL, pupR]);
    return c;
  }

  private nextProblem() {
    if (this.solved >= this.total) {
      this.clearStage();
      return;
    }
    this.current = makeProblem(this.settings);
    this.bannerText.setText(`${this.current.text} = ?`);
    this.feedback.setText('');

    // 적 등장
    this.enemy.setPosition(1360, GROUND_Y - 50).setAlpha(1).setScale(1).setAngle(0);
    this.tweens.add({ targets: this.enemy, x: 900, duration: 460, ease: 'Sine.out' });

    this.clearAnswers();
    if (this.settings.answerMode === 'input') this.showInput();
    else this.showChoices();

    this.accepting = true;
    this.startTimer();
  }

  private clearAnswers() {
    this.stopTimer();
    this.answerLayer.removeAll(true);
    this.inputValue = '';
  }

  private showChoices() {
    const ys = 636;
    const centers = [340, 540, 740, 940];
    this.current.choices.forEach((val, i) => {
      const tile = this.add.container(centers[i], ys);
      const g = this.add.graphics();
      const paint = (fill: number) => {
        g.clear();
        g.fillStyle(0x000000, 0.15);
        g.fillRoundedRect(-85, -38, 170, 84, 18);
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-85, -42, 170, 84, 18);
      };
      paint(COLORS.tile);
      const t = this.add
        .text(0, 0, `${val}`, { fontFamily: FONT, fontSize: '46px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5);
      tile.add([g, t]);
      tile.setSize(170, 84);
      tile.setInteractive(new Phaser.Geom.Rectangle(-85, -42, 170, 84), Phaser.Geom.Rectangle.Contains);
      tile.on('pointerdown', () => tile.setScale(0.95));
      tile.on('pointerup', () => {
        tile.setScale(1);
        this.onAnswer(val, tile, paint);
      });
      tile.on('pointerout', () => tile.setScale(1));
      this.answerLayer.add(tile);
    });
  }

  private showInput() {
    // 입력값 표시창
    const disp = this.add.container(DESIGN.width / 2, 300);
    const dg = this.add.graphics();
    dg.fillStyle(0xffffff, 0.96);
    dg.fillRoundedRect(-120, -38, 240, 76, 16);
    dg.lineStyle(3, COLORS.panel, 1);
    dg.strokeRoundedRect(-120, -38, 240, 76, 16);
    const dt = this.add.text(0, 0, '?', { fontFamily: FONT, fontSize: '46px', color: '#2b3a67', fontStyle: 'bold' }).setOrigin(0.5);
    disp.add([dg, dt]);
    this.answerLayer.add(disp);
    const refresh = () => dt.setText(this.inputValue === '' ? '?' : this.inputValue);

    // 숫자 키패드 (3열 x 4행)
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = DESIGN.width / 2 + (col - 1) * 110;
      const y = 410 + row * 64;
      const bgColor = k === '✓' ? COLORS.btnGreen : k === '⌫' ? COLORS.bad : COLORS.panel;
      const b = makeButton(this, x, y, 96, 54, k, () => {
        if (k === '⌫') this.inputValue = this.inputValue.slice(0, -1);
        else if (k === '✓') {
          if (this.inputValue !== '') this.onAnswer(parseInt(this.inputValue, 10), null, null);
          return;
        } else if (this.inputValue.length < 4) this.inputValue += k;
        refresh();
      }, { bg: bgColor, fontSize: 30 });
      this.answerLayer.add(b);
    });
  }

  private onAnswer(value: number, tile: Phaser.GameObjects.Container | null, paint: ((f: number) => void) | null) {
    if (!this.accepting) return;

    if (value === this.current.answer) {
      this.accepting = false;
      this.stopTimer();
      this.feedback.setText('정답이야! 🎉').setColor('#2e9e4f');
      if (paint) paint(COLORS.good);
      // 공격 → 적 처치
      this.tweens.add({ targets: this.player, x: this.player.x + 40, duration: 120, yoyo: true });
      this.tweens.add({ targets: this.enemy, x: 1500, alpha: 0, angle: 40, duration: 420, ease: 'Back.easeIn', delay: 120 });
      this.solved++;
      this.progressFill.scaleX = this.solved / this.total;
      this.time.delayedCall(640, () => this.nextProblem());
    } else {
      this.mistakes++;
      this.feedback.setText('다시 해볼까? 🤔').setColor('#e0556b');
      if (tile) {
        const ox = tile.x;
        this.tweens.add({ targets: tile, x: { from: ox - 8, to: ox }, duration: 90, ease: 'Sine.inOut' });
        if (paint) paint(COLORS.bad);
        tile.disableInteractive();
      } else {
        // 입력 모드: 입력값만 비우고 다시 시도 (실패 없음)
        this.inputValue = '';
        this.clearAnswers();
        this.showInput();
        if (this.settings.mode === 'challenge') this.startTimer();
      }
      // 탐험/도전 모두 실패 없음 — 계속 시도 가능
    }
  }

  private startTimer() {
    if (this.settings.mode !== 'challenge') return;
    const secs = TIME_SECONDS[this.settings.timeLevel];
    const w = 520;
    this.timerBar = this.add.rectangle(DESIGN.width / 2 - w / 2, 160, w, 14, COLORS.coin).setOrigin(0, 0.5);
    this.answerLayer.add(this.timerBar);
    this.tweens.add({
      targets: this.timerBar,
      scaleX: { from: 1, to: 0 },
      duration: secs * 1000,
      ease: 'Linear',
      onComplete: () => {
        this.bonusLost = true;
        if (this.timerBar) {
          this.timerBar.destroy();
          this.timerBar = undefined;
        }
        toast(this, '시간 초과! 천천히 풀어도 괜찮아 😊');
      },
    });
  }

  private stopTimer() {
    if (this.timerBar) {
      this.tweens.killTweensOf(this.timerBar);
      this.timerBar.destroy();
      this.timerBar = undefined;
    }
  }

  private clearStage() {
    let stars = 3;
    if (this.mistakes >= 1) stars = 2;
    if (this.mistakes >= 3) stars = 1;
    if (this.settings.mode === 'challenge' && this.bonusLost) stars = Math.max(1, stars - 1);
    stars = Math.max(1, Math.min(3, stars));
    const reward = stageReward(this.settings);
    recordStageClear(this.index, stars, reward);
    this.scene.start('Result', { index: this.index, stars, reward });
  }
}
