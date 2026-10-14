import Phaser from 'phaser';
import { DESIGN, FONT, COLORS, GROUND_Y, TEXT_RES, regionBgPath } from '../theme';
import { drawBackground, makeButton, addCoinHud, toast, applyHiRes } from '../widgets';
import { makeStage, stageReward, BIOME_COLORS } from '../systems/stageGenerator';
import type { Stage } from '../systems/stageGenerator';
import { makeProblem } from '../systems/mathGenerator';
import { gameState, recordStageClear, persist, bumpDailyCatch } from '../systems/save';
import { catchSpecific, isCaught, isShiny, catchShiny, addSparkles, SHINY_GOLD_CSS, addAsh, addPokeIcon, loadPokeSprites, getName, TOTAL, REGIONS } from '../systems/dex';
import { playCorrect, playWrong, startBattleMusic, stopBattleMusic } from '../systems/music';
import { TIME_SECONDS, catchSettingsOf } from '../systems/settings';
import { isSyllable, syllableJamo, composeJamo, makeBlankProblem, makeNameOptions, keypadFor, isCho, isJung, isJongJamo, pickRandom } from '../systems/hangul';
import type { Problem, Settings, Op } from '../types';

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
  private player!: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  private enemy!: Phaser.GameObjects.Container;
  private targetId = 1; // 이 스테이지의 목표 포켓몬 (번호 = 스테이지 번호)
  private shinyRun = false; // 반짝이 도전: 보통은 이미 잡았고 반짝이는 아직 → 문제를 한 단계 올려 낸다 (2026-10-06)
  private readonly enemySize = 150;
  private readonly enemyY = GROUND_Y - 70;
  private answerLayer!: Phaser.GameObjects.Container;
  private choiceTiles: { val: number; paint: (f: number) => void }[] = [];
  private timerFill?: Phaser.GameObjects.Rectangle;
  private timerText?: Phaser.GameObjects.Text;
  private timerTween?: Phaser.Tweens.Tween;

  // ── 한글 모드 상태 ──
  private qtype: 'math' | 'hangul' = 'math';
  private hWord = '';
  private hLevel = 1;
  private hBlankIdx = -1; // ① 빈칸 위치
  private hAnswer = ''; // ① 정답 글자 / ② 정답 이름
  private hOptions: string[] = []; // ①② 보기
  private hSlots: { ch: string; editable: boolean; jamo: string[]; target: string[] }[] = []; // ③④ 쓰기 슬롯
  private hCur = -1; // 현재 입력 슬롯
  private hSlotLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('Game');
  }

  init(data: { index?: number }) {
    this.index = data.index ?? 1;
  }

  create() {
    applyHiRes(this);
    startBattleMusic(); // 배틀 음악 무한 재생
    this.events.once('shutdown', stopBattleMusic); // 배틀 나가면 정지 + 합성 BGM 복원
    this.settings = gameState.settings;
    this.targetId = Phaser.Math.Clamp(this.index, 1, TOTAL);
    // 반짝이 도전이면 설정 화면 「반짝이 몬스터 잡기」 페이지의 설정(연산·범위·과목·한글 단계·실수 허용·섞기)으로 문제를 낸다.
    // 2026-10-10까지는 일반 설정을 즉석에서 한 칸 올려 썼다 — 이제 사용자가 따로 정한다. 소리·모드·답하기·제한시간은 공통
    this.shinyRun = isCaught(this.targetId) && !isShiny(this.targetId);
    if (this.shinyRun) this.settings = { ...this.settings, ...catchSettingsOf(this.settings, true) };
    this.stage = makeStage(this.index, this.settings);
    this.total = this.stage.problems;
    this.solved = 0;
    this.mistakes = 0;
    this.bonusLost = false;
    this.accepting = false;

    const colors = BIOME_COLORS[this.stage.biome] ?? BIOME_COLORS['숲'];
    drawBackground(this, colors);

    // 상단 UI
    makeButton(this, 70, 56, 110, 58, '⏸', () => this.scene.start('StageMap'), { fontSize: 30, bg: 0x10151f, alpha: 0.42, color: '#ffffff' });
    addCoinHud(this);
    this.add
      .text(DESIGN.width / 2, 22, this.shinyRun ? `✨ 반짝이 도전! · 스테이지 ${this.index}` : `스테이지 ${this.index} · ${this.stage.biome}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: this.shinyRun ? '#ffe28a' : '#ffffff',
        fontStyle: 'bold',
        stroke: this.shinyRun ? '#6b4a00' : '#2b2018',
        strokeThickness: 4,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5, 0);

    // 문제 배너
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(DESIGN.width / 2 - 235, 56, 470, 86, 24);
    bg.lineStyle(4, COLORS.panel, 1);
    bg.strokeRoundedRect(DESIGN.width / 2 - 235, 56, 470, 86, 24);
    this.bannerText = this.add
      .text(DESIGN.width / 2, 99, '', { fontFamily: FONT, fontSize: '52px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    // 캐릭터 / 적
    this.player = addAsh(this, 260, GROUND_Y - 48, 118) as Phaser.GameObjects.Image | Phaser.GameObjects.Container;
    this.tweens.add({ targets: this.player, y: GROUND_Y - 60, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 적 = 이 스테이지의 목표 포켓몬(번호 = 스테이지). 매 문제 같은 포켓몬과 대결 → 클리어 시 포획.
    this.enemy = this.add.container(DESIGN.width + 80, this.enemyY);

    // 피드백
    this.feedback = this.add
      .text(DESIGN.width / 2, 210, '', { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#2b3a67', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(20);

    // 진행 바 (하단 앵커)
    const py = DESIGN.height - 22;
    this.add.rectangle(DESIGN.width / 2, py, this.progressW, 18, 0x000000, 0.15);
    this.progressFill = this.add
      .rectangle(DESIGN.width / 2 - this.progressW / 2, py, this.progressW, 18, COLORS.good)
      .setOrigin(0, 0.5);
    this.progressFill.scaleX = 0;

    this.answerLayer = this.add.container(0, 0);

    // 메모리: 이전 배틀의 랜덤 포켓몬 텍스처 해제(연속 배틀 누적 방지 — 필요 시 자동 재로드)
    const keep = `poke_${this.targetId}`;
    this.textures.getTextureKeys().forEach((k) => {
      if (k.startsWith('poke_') && k !== keep) this.textures.remove(k);
    });

    // 지역 배경 이미지 로드 → 적 스프라이트 로드 → 첫 문제 시작
    this.loadRegionBgThenStart();
  }

  /** 이 스테이지가 속한 지역의 배틀 배경(있으면)을 로드 후, 적 스프라이트 로드 → 시작 */
  private loadRegionBgThenStart() {
    const ri = REGIONS.findIndex((r) => this.targetId >= r.start && this.targetId <= r.end);
    // 지역 선택 화면에서 이미 받아둔 이미지(rbg{ri}) 재사용 → 없으면 새로 로드(쿼리 없이)
    const reuse = `rbg${ri}`;
    const bgKey = this.textures.exists(reuse) ? reuse : `bg_r${ri}`;
    const proceed = () => {
      this.placeRegionBg(bgKey);
      loadPokeSprites(this, [this.targetId], () => this.nextProblem());
    };
    if (ri < 0 || this.textures.exists(bgKey)) {
      proceed();
      return;
    }
    this.load.image(bgKey, regionBgPath(ri));
    this.load.once('complete', proceed);
    this.load.once('loaderror', () => proceed()); // 실패해도 진행(그라데이션 폴백)
    this.load.start();
  }

  /** 배경 이미지를 화면 가득 덮도록(cover) 배치. 텍스처 없으면 그라데이션 유지. */
  private placeRegionBg(bgKey: string) {
    if (!this.textures.exists(bgKey)) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, bgKey);
    const s = Math.max(DESIGN.width / img.width, DESIGN.height / img.height);
    img.setScale(s).setDepth(-9); // 그라데이션(-10) 위, 캐릭터/UI(0) 아래
  }

  /** 적 컨테이너 내용을 지정 포켓몬으로 교체. 이름 라벨은 수학 과목에서만(한글 문제 정답 노출 방지) */
  private setEnemyPokemon(id: number) {
    this.enemy.removeAll(true);
    const shiny = this.shinyRun && id === this.targetId; // 반짝이 도전의 목표 포켓몬은 반짝이 색 + 별 가루
    this.enemy.add(addPokeIcon(this, 0, 0, id, this.enemySize, shiny));
    if (shiny) this.enemy.add(addSparkles(this, 0, 0, this.enemySize));
    if (this.settings.subject === 'math') {
      this.enemy.add(
        this.add
          .text(0, -this.enemySize * 0.62, (shiny ? '✨ ' : '') + getName(id), {
            fontFamily: FONT,
            fontSize: '28px',
            color: shiny ? SHINY_GOLD_CSS : '#2b3a67',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 6,
            resolution: TEXT_RES,
          })
          .setOrigin(0.5),
      );
    }
  }

  private nextProblem() {
    if (this.solved >= this.total) {
      this.clearStage();
      return;
    }
    this.feedback.setText('');
    this.clearAnswers();

    // 과목 결정: 섞기 = 번갈아(짝수번째 수학) → 10문제면 정확히 5:5
    const subj = this.settings.subject;
    this.qtype = subj === 'hangul' ? 'hangul' : subj === 'mix' && this.solved % 2 === 1 ? 'hangul' : 'math';

    if (this.qtype === 'hangul') {
      // 한글 문제는 문제마다 랜덤 포켓몬 출제(포획 대상은 그대로 이 스테이지 포켓몬)
      const id = Phaser.Math.Between(1, TOTAL);
      loadPokeSprites(this, [id], () => {
        if (!this.enemy.active) return; // 로드 중 화면 이탈 방지
        this.enterEnemy(id);
        this.startHangulProblem(id);
      });
      return;
    }
    this.enterEnemy(this.targetId);
    this.showMathProblem();
  }

  /** 적 등장 연출(오른쪽에서 걸어 들어옴) */
  private enterEnemy(id: number) {
    this.setEnemyPokemon(id);
    this.enemy.setPosition(DESIGN.width + 80, this.enemyY).setAlpha(1).setScale(1).setAngle(0);
    this.tweens.add({ targets: this.enemy, x: DESIGN.width - 380, duration: 460, ease: 'Sine.out' });
  }

  /** 수학 문제 출제(기존 경로) */
  private showMathProblem() {
    this.current = makeProblem(this.settings);
    this.bannerText.setFontSize(52).setText(`${this.current.text} = ?`);
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
    const ys = DESIGN.height - 84; // 하단 앵커(=636 at 16:9)
    const centers = [-300, -100, 100, 300].map((o) => DESIGN.width / 2 + o);
    this.choiceTiles = [];
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
      this.choiceTiles.push({ val, paint });
      const t = this.add
        .text(0, 0, `${val}`, { fontFamily: FONT, fontSize: '46px', color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES })
        .setOrigin(0.5);
      tile.add([g, t]);
      tile.setSize(170, 84);
      // 좌표 기반(씬 레벨) 입력
      const cx = centers[i];
      const cy = ys;
      const hit = (p: Phaser.Input.Pointer) => Math.abs(p.worldX - cx) <= 85 && Math.abs(p.worldY - cy) <= 42;
      const onDown = (p: Phaser.Input.Pointer) => {
        if (this.accepting && hit(p)) {
          tile.setScale(0.95);
          this.onAnswer(val, tile, paint);
        }
      };
      const onUp = () => tile.setScale(1);
      this.input.on('pointerdown', onDown);
      this.input.on('pointerup', onUp);
      tile.once('destroy', () => {
        this.input.off('pointerdown', onDown);
        this.input.off('pointerup', onUp);
      });
      this.answerLayer.add(tile);
    });
  }

  private showInput() {
    // 입력값 표시창
    const disp = this.add.container(DESIGN.width / 2, DESIGN.height - 420); // 키패드 위(=300 at 16:9)
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
      const y = DESIGN.height - 310 + row * 64; // 하단 앵커(=410 at 16:9)
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

  // ════════════════ 한글 모드 ════════════════

  /** 한글 문제 시작: 레벨별 데이터 생성 → 이름 플래시(보고-가리고-쓰기) → UI. id = 이번 문제의 포켓몬 */
  private startHangulProblem(id: number) {
    this.hWord = getName(id);
    this.hLevel = Math.max(1, Math.min(5, this.settings.hangulLevel));
    this.hBlankIdx = -1;

    if (this.hLevel === 1) {
      const p = makeBlankProblem(this.hWord);
      if (!p) {
        this.qtype = 'math';
        this.showMathProblem(); // 한글 음절이 없는 이름(사실상 없음) → 수학 폴백
        return;
      }
      this.hBlankIdx = p.idx;
      this.hAnswer = p.answer;
      this.hOptions = p.options;
    } else if (this.hLevel === 2) {
      const opts = makeNameOptions(this.hWord);
      if (!opts) {
        this.qtype = 'math';
        this.showMathProblem();
        return;
      }
      this.hAnswer = this.hWord;
      this.hOptions = opts;
    } else {
      // ③④⑤ 쓰기: 슬롯 구성(한글 음절만 편집, 특수문자는 고정)
      const chars = [...this.hWord];
      const sylIdx = chars.map((c, i) => (isSyllable(c) ? i : -1)).filter((i) => i >= 0);
      if (!sylIdx.length) {
        this.qtype = 'math';
        this.showMathProblem();
        return;
      }
      // ③ 한 글자: 음절 자리 하나 / ④ 두 글자: 서로 다른 음절 자리 둘을 랜덤으로(이름이 2음절이면 둘 다) / ⑤ 이름: 전부
      const blankCount = this.hLevel === 3 ? 1 : this.hLevel === 4 ? 2 : sylIdx.length;
      const blanks = pickRandom(sylIdx, blankCount);
      this.hSlots = chars.map((c, i) => ({
        ch: c,
        editable: blanks.includes(i),
        jamo: [],
        target: isSyllable(c) ? syllableJamo(c) : [],
      }));
      this.hCur = this.hSlots.findIndex((s) => s.editable);
    }

    this.bannerText.setText('');
    this.showFlash(this.hWord, 2200, () => this.buildHangulUI());
  }

  /** 이름 플래시 오버레이(보여주고 가리기). 힌트 버튼도 이걸 1초로 재사용 */
  private showFlash(text: string, ms: number, done: () => void) {
    this.accepting = false;
    const layer = this.add.container(0, 0).setDepth(40);
    layer.add(this.add.rectangle(DESIGN.width / 2, DESIGN.height / 2, DESIGN.width, DESIGN.height, 0x10151f, 0.62));
    const t = this.add
      .text(DESIGN.width / 2, DESIGN.height / 2 - 20, text, {
        fontFamily: FONT,
        fontSize: '84px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#16233f',
        strokeThickness: 8,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);
    t.setScale(Math.min(1, (DESIGN.width - 200) / Math.max(1, t.width)));
    layer.add(t);
    layer.add(
      this.add
        .text(DESIGN.width / 2, DESIGN.height / 2 + 64, '잘 봐 두자! 👀', { fontFamily: FONT, fontSize: '28px', color: '#ffe9a8', fontStyle: 'bold', resolution: TEXT_RES })
        .setOrigin(0.5),
    );
    this.time.delayedCall(ms, () => {
      layer.destroy(true);
      done();
    });
  }

  /** 플래시 후 레벨별 한글 문제 UI 구성(재도전 시에도 호출) */
  private buildHangulUI() {
    if (this.hLevel === 1) {
      this.buildBlankBanner();
      this.showHangulChoices(this.hOptions);
    } else if (this.hLevel === 2) {
      this.bannerText.setFontSize(40).setText('바르게 쓴 이름은?');
      this.showHangulChoices(this.hOptions);
    } else {
      this.bannerText.setFontSize(40).setText(this.hLevel === 3 ? '빈칸 글자를 써 보자!' : this.hLevel === 4 ? '빈칸 두 글자를 써 보자!' : '이름을 써 보자!');
      // 넓은 자모 키패드(최대 8열)와 안 겹치게 적은 오른쪽 구석으로 살짝 물러남
      this.tweens.add({ targets: this.enemy, x: DESIGN.width - 170, scaleX: 0.78, scaleY: 0.78, duration: 300, ease: 'Sine.out' });
      this.buildSlotUI();
      this.buildJamoKeypad();
    }
    this.accepting = true;
    this.startTimer(); // 한글도 숫자와 같은 제한시간 (2026-10-08: 쓰기 단계 2배 배율 제거)
  }

  /** ① 배너: 이름에서 빈칸 자리만 주황 물음표 박스로 */
  private buildBlankBanner() {
    const chars = [...this.hWord];
    const pre = chars.slice(0, this.hBlankIdx).join('');
    const post = chars.slice(this.hBlankIdx + 1).join('');
    const c = this.add.container(DESIGN.width / 2, 99);
    const st = { fontFamily: FONT, fontSize: '46px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES };
    const a = this.add.text(0, 0, pre, st).setOrigin(0, 0.5);
    const b = this.add.text(0, 0, post, st).setOrigin(0, 0.5);
    const boxW = 54;
    const gap = 10;
    const total = a.width + boxW + b.width + (pre ? gap : 0) + (post ? gap : 0);
    let x = -total / 2;
    a.setX(x);
    x += a.width + (pre ? gap : 0);
    const g = this.add.graphics();
    g.fillStyle(0xfff4d6, 1);
    g.fillRoundedRect(x, -27, boxW, 54, 10);
    g.lineStyle(3, COLORS.tile, 1);
    g.strokeRoundedRect(x, -27, boxW, 54, 10);
    const q = this.add
      .text(x + boxW / 2, 1, '?', { fontFamily: FONT, fontSize: '30px', color: '#ffa726', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    x += boxW + (post ? gap : 0);
    b.setX(x);
    c.add([a, g, q, b]);
    this.answerLayer.add(c);
  }

  /** ①② 글자/이름 4지선다 타일 (수학 타일과 동일 조작감) */
  private showHangulChoices(options: string[]) {
    const ys = DESIGN.height - 84;
    const wide = this.hLevel === 2;
    const tileW = wide ? 200 : 170;
    const offs = wide ? [-315, -105, 105, 315] : [-300, -100, 100, 300];
    const centers = offs.map((o) => DESIGN.width / 2 + o);
    const maxLen = Math.max(...options.map((o) => o.length));
    const fs = wide ? (maxLen >= 6 ? 22 : 27) : 46;
    options.forEach((val, i) => {
      if (i >= centers.length) return;
      const tile = this.add.container(centers[i], ys);
      const g = this.add.graphics();
      const paint = (fill: number) => {
        g.clear();
        g.fillStyle(0x000000, 0.15);
        g.fillRoundedRect(-tileW / 2, -38, tileW, 84, 18);
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-tileW / 2, -42, tileW, 84, 18);
      };
      paint(COLORS.tile);
      const t = this.add
        .text(0, 0, val, { fontFamily: FONT, fontSize: `${fs}px`, color: '#ffffff', fontStyle: 'bold', resolution: TEXT_RES })
        .setOrigin(0.5);
      tile.add([g, t]);
      tile.setSize(tileW, 84);
      const cx = centers[i];
      const hit = (p: Phaser.Input.Pointer) => Math.abs(p.worldX - cx) <= tileW / 2 && Math.abs(p.worldY - ys) <= 42;
      const onDown = (p: Phaser.Input.Pointer) => {
        if (this.accepting && hit(p)) {
          tile.setScale(0.95);
          this.onHangulAnswer(val, tile, paint);
        }
      };
      const onUp = () => tile.setScale(1);
      this.input.on('pointerdown', onDown);
      this.input.on('pointerup', onUp);
      tile.once('destroy', () => {
        this.input.off('pointerdown', onDown);
        this.input.off('pointerup', onUp);
      });
      this.answerLayer.add(tile);
    });
  }

  private onHangulAnswer(value: string, tile: Phaser.GameObjects.Container | null, paint: ((f: number) => void) | null) {
    if (!this.accepting) return;
    const correct = value === this.hAnswer; // ①=빈칸 글자, ②=전체 이름
    if (correct) {
      if (paint) paint(COLORS.good);
      this.handleCorrect();
    } else {
      if (tile) {
        const ox = tile.x;
        this.tweens.add({ targets: tile, x: { from: ox - 8, to: ox }, duration: 90, ease: 'Sine.inOut' });
        if (paint) paint(COLORS.bad);
      }
      this.handleWrongHangul(() => {
        this.clearAnswers();
        this.buildHangulUI(); // 같은 문제(같은 보기) 다시
      });
    }
  }

  /** ③④⑤ 이름 슬롯(글자 칸) 표시 */
  private buildSlotUI() {
    const layer = this.add.container(0, 0);
    this.hSlotLayer = layer;
    this.answerLayer.add(layer);
    this.refreshSlots();
  }

  private refreshSlots() {
    const layer = this.hSlotLayer;
    if (!layer || !layer.active) return;
    layer.removeAll(true);
    const n = this.hSlots.length;
    const pitch = 76;
    const boxW = 68;
    const boxH = 78;
    const x0 = DESIGN.width / 2 - ((n - 1) * pitch) / 2;
    const cy = DESIGN.height - 420;
    this.hSlots.forEach((s, i) => {
      const x = x0 + i * pitch;
      const g = this.add.graphics();
      if (s.editable) {
        g.fillStyle(0xffffff, 0.96);
        g.fillRoundedRect(x - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
        g.lineStyle(i === this.hCur ? 5 : 3, i === this.hCur ? COLORS.tile : COLORS.panel, 1);
        g.strokeRoundedRect(x - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
      } else {
        g.fillStyle(0xe8edf6, 0.9);
        g.fillRoundedRect(x - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
        g.lineStyle(2, 0x9aa6b8, 1);
        g.strokeRoundedRect(x - boxW / 2, cy - boxH / 2, boxW, boxH, 14);
      }
      layer.add(g);
      const txt = s.editable ? composeJamo(s.jamo) : s.ch;
      if (txt) {
        layer.add(
          this.add
            .text(x, cy + 1, txt, { fontFamily: FONT, fontSize: '42px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
            .setOrigin(0.5),
        );
      }
    });
  }

  /** ③④⑤ 자모 키패드(필요 자모 + 혼동 미끼, ⌫/✓ 포함 2행) */
  private buildJamoKeypad() {
    const targets = this.hSlots.filter((s) => s.editable).map((s) => s.target);
    const jamo = keypadFor(targets);
    const r0n = Math.ceil(jamo.length / 2);
    const rows = [
      [...jamo.slice(0, r0n), '⌫'],
      [...jamo.slice(r0n), '✓'],
    ];
    rows.forEach((row, r) => {
      const pitch = 106;
      const rx0 = DESIGN.width / 2 - ((row.length - 1) * pitch) / 2;
      row.forEach((k, i) => {
        const bgColor = k === '✓' ? COLORS.btnGreen : k === '⌫' ? COLORS.bad : COLORS.panel;
        const b = makeButton(this, rx0 + i * pitch, DESIGN.height - 310 + r * 64, 96, 54, k, () => this.onJamoKey(k), { bg: bgColor, fontSize: 30 });
        this.answerLayer.add(b);
      });
    });
  }

  private onJamoKey(k: string) {
    if (!this.accepting) return;
    if (k === '✓') {
      const complete = this.hSlots.every((s) => !s.editable || s.jamo.length === s.target.length);
      if (!complete) return; // 다 쓰기 전엔 제출 안 됨
      const assembled = this.hSlots.map((s) => (s.editable ? composeJamo(s.jamo) : s.ch)).join('');
      if (assembled === this.hWord) {
        this.handleCorrect();
      } else {
        this.handleWrongHangul(() => {
          this.hSlots.forEach((s) => {
            if (s.editable) s.jamo = [];
          });
          this.hCur = this.hSlots.findIndex((s) => s.editable);
          this.clearAnswers();
          this.buildHangulUI();
        });
      }
      return;
    }
    if (k === '⌫') {
      let i = this.hCur;
      if (i < 0 || this.hSlots[i].jamo.length === 0) {
        const prev = this.prevEditable(i < 0 ? this.hSlots.length : i);
        if (prev < 0) return;
        this.hCur = prev;
        i = prev;
      }
      this.hSlots[i].jamo.pop();
      this.refreshSlots();
      return;
    }
    // 자모 입력 (자리 종류에 맞는 자모만: 초성=자음, 중성=모음, 종성=받침 가능 자음)
    const i = this.hCur;
    if (i < 0) return;
    const slot = this.hSlots[i];
    const pos = slot.jamo.length;
    if (pos >= slot.target.length) return;
    if (pos === 0 && !isCho(k)) return;
    if (pos === 1 && !isJung(k)) return;
    if (pos === 2 && !isJongJamo(k)) return;
    slot.jamo.push(k);
    if (slot.jamo.length >= slot.target.length) this.hCur = this.nextEditable(i);
    this.refreshSlots();
  }

  private nextEditable(from: number): number {
    for (let i = from + 1; i < this.hSlots.length; i++) {
      if (this.hSlots[i].editable && this.hSlots[i].jamo.length < this.hSlots[i].target.length) return i;
    }
    return -1;
  }

  private prevEditable(from: number): number {
    for (let i = from - 1; i >= 0; i--) {
      if (this.hSlots[i].editable && this.hSlots[i].jamo.length > 0) return i;
    }
    return -1;
  }

  /** 정답 공통 처리(수학 onAnswer의 성공 분기와 동일 연출) */
  private handleCorrect() {
    this.accepting = false;
    this.stopTimer();
    playCorrect();
    this.feedback.setText('정답이야! 🎉').setColor('#2e9e4f');
    this.tweens.add({ targets: this.player, x: this.player.x + 40, duration: 120, yoyo: true });
    this.tweens.add({ targets: this.enemy, x: DESIGN.width + 220, alpha: 0, angle: 40, duration: 420, ease: 'Back.easeIn', delay: 120 });
    this.solved++;
    this.progressFill.scaleX = this.solved / this.total;
    this.time.delayedCall(640, () => this.nextProblem());
  }

  /** 오답 공통 처리 — 정답 대신 이름을 1.2초 다시 보여준 뒤 같은 문제 재도전(힌트 버튼 대체) */
  private handleWrongHangul(retry: () => void) {
    this.mistakes++;
    playWrong();
    this.accepting = false;
    this.stopTimer();
    this.feedback.setText('다시 한 번 생각해보자! 😊').setColor('#e0556b');
    this.time.delayedCall(1500, () => {
      this.feedback.setText('');
      this.showFlash(this.hWord, 1200, () => retry());
    });
  }

  // ════════════════ 수학 모드 ════════════════

  private onAnswer(value: number, tile: Phaser.GameObjects.Container | null, paint: ((f: number) => void) | null) {
    if (!this.accepting) return;

    if (value === this.current.answer) {
      this.accepting = false;
      this.stopTimer();
      playCorrect();
      this.feedback.setText('정답이야! 🎉').setColor('#2e9e4f');
      if (paint) paint(COLORS.good);
      // 공격 → 적 처치
      this.tweens.add({ targets: this.player, x: this.player.x + 40, duration: 120, yoyo: true });
      this.tweens.add({ targets: this.enemy, x: DESIGN.width + 220, alpha: 0, angle: 40, duration: 420, ease: 'Back.easeIn', delay: 120 });
      this.solved++;
      this.progressFill.scaleX = this.solved / this.total;
      this.time.delayedCall(640, () => this.nextProblem());
    } else {
      this.mistakes++;
      playWrong();
      this.accepting = false; // 정답 공개 동안 입력 잠금
      this.stopTimer();
      if (tile) {
        const ox = tile.x;
        this.tweens.add({ targets: tile, x: { from: ox - 8, to: ox }, duration: 90, ease: 'Sine.inOut' });
        if (paint) paint(COLORS.bad); // 누른(틀린) 타일은 빨강 (정답은 공개하지 않음)
      }
      // 정답은 알려주지 않고, 잠시 후 같은 문제를 다시 풀게 함 (스스로 생각)
      this.feedback.setText('다시 한 번 생각해보자! 😊').setColor('#e0556b');
      this.time.delayedCall(1500, () => {
        this.feedback.setText('');
        this.clearAnswers();
        if (this.settings.answerMode === 'input') this.showInput();
        else this.showChoices();
        this.accepting = true;
        this.startTimer();
      });
    }
  }

  private startTimer(scale = 1) {
    if (this.settings.mode !== 'challenge') return;
    const secs = TIME_SECONDS[this.settings.timeLevel] * scale;
    const w = 440;
    const x = DESIGN.width / 2;
    const y = 174;
    // 트랙(배경)
    const track = this.add.graphics();
    track.fillStyle(0x000000, 0.18);
    track.fillRoundedRect(x - w / 2, y - 14, w, 28, 14);
    this.answerLayer.add(track);
    // 시계 아이콘
    const clock = this.add.text(x - w / 2 - 36, y, '⏱', { fontSize: '34px' }).setOrigin(0.5);
    this.answerLayer.add(clock);
    // 채워진 막대 (줄어듦)
    this.timerFill = this.add.rectangle(x - w / 2 + 3, y, w - 6, 20, COLORS.good).setOrigin(0, 0.5);
    this.answerLayer.add(this.timerFill);
    // 남은 초
    this.timerText = this.add
      .text(x + w / 2 + 34, y, `${secs}`, { fontFamily: FONT, fontSize: '32px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);
    this.answerLayer.add(this.timerText);

    this.timerTween = this.tweens.add({
      targets: this.timerFill,
      scaleX: { from: 1, to: 0 },
      duration: secs * 1000,
      ease: 'Linear',
      onUpdate: (tw) => {
        const p = tw.progress;
        if (this.timerText) this.timerText.setText(`${Math.ceil(secs * (1 - p))}`);
        if (this.timerFill) this.timerFill.setFillStyle(p < 0.55 ? COLORS.good : p < 0.8 ? COLORS.coin : COLORS.bad);
      },
      onComplete: () => {
        this.bonusLost = true;
        if (this.timerText) this.timerText.setText('0');
        toast(this, '시간 초과! 천천히 풀어도 괜찮아 😊');
      },
    });
  }

  private stopTimer() {
    if (this.timerTween) {
      this.timerTween.stop();
      this.timerTween = undefined;
    }
    this.timerFill = undefined;
    this.timerText = undefined;
  }

  private clearStage() {
    let stars = 3;
    if (this.mistakes >= 1) stars = 2;
    if (this.mistakes >= 3) stars = 1;
    if (this.settings.mode === 'challenge' && this.bonusLost) stars = Math.max(1, stars - 1);
    stars = Math.max(1, Math.min(3, stars));
    // 실수가 허용 횟수(설정 maxMiss)를 넘으면 포켓몬을 놓치고 코인도 받지 못함
    const reward = this.mistakes > this.settings.maxMiss ? 0 : stageReward(this.settings);
    recordStageClear(this.index, stars, reward);

    // 포획: 이 스테이지의 포켓몬(번호=스테이지)을 잡음. 실수 maxMiss번까지 OK, 넘으면 실패(재도전 시 기회).
    let caught: number | null = null;
    let shiny: number | null = null; // 이번에 잡은 반짝이
    let missedCatch = false;
    let counted = false; // 오늘 기록(1마리=1분)에 포함됐는지
    if (!isCaught(this.targetId)) {
      if (this.mistakes <= this.settings.maxMiss) {
        caught = catchSpecific(this.targetId);
        if (caught != null) {
          bumpDailyCatch(); // 오늘 잡은 수 기록(날짜별)
          counted = true;
        }
        if (!gameState.caughtStages.includes(this.index)) gameState.caughtStages.push(this.index);
        persist();
      } else {
        missedCatch = true;
      }
    } else if (this.mistakes <= this.settings.maxMiss) {
      // 이미 잡은 포켓몬이라도 오늘 다시 도전해서 잡았으면 오늘 기록에 추가. 반짝이 도전이었으면 반짝이도 잡힘
      if (this.shinyRun) shiny = catchShiny(this.targetId);
      bumpDailyCatch();
      counted = true;
      persist();
    } else if (this.shinyRun) {
      missedCatch = true; // 반짝이를 놓침 — 다시 도전하면 됨
    }
    this.scene.start('Result', { index: this.index, stars, reward, caught, shiny, shinyTry: this.shinyRun, missedCatch, counted });
  }

  /** 하드웨어 백버튼 / 일시정지 → 스테이지 선택으로 */
  goBack() {
    this.scene.start('StageMap');
  }
}
