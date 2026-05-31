import Phaser from 'phaser';
import { DESIGN, FONT, COLORS } from '../theme';
import { TEXT_RES } from '../theme';
import { drawBackground, makeButton, ButtonContainer } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState, saveSettings } from '../systems/save';
import { OP_LABEL, presetLabel, presetCount } from '../systems/settings';
import type { Op } from '../types';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    drawBackground(this, BIOME_COLORS['초원']);
    const s = gameState.settings;

    this.add
      .text(DESIGN.width / 2, 50, '수학 설정', { fontFamily: FONT, fontSize: '46px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
      .setOrigin(0.5);

    // 연산별 켜기/끄기 + 범위
    const ops: Op[] = ['add', 'sub', 'mul', 'div'];
    ops.forEach((op, i) => {
      const y = 130 + i * 70;
      this.add
        .text(160, y, OP_LABEL[op], { fontFamily: FONT, fontSize: '32px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES })
        .setOrigin(0, 0.5);

      let onoff: ButtonContainer;
      let range: ButtonContainer;
      const refresh = () => {
        onoff.setLabel(s.ops[op].enabled ? '켜짐' : '꺼짐');
        onoff.setBg(s.ops[op].enabled ? COLORS.btnGreen : COLORS.btnGray);
        range.setLabel(presetLabel(op, s.ops[op].presetIndex));
        range.setAlpha(s.ops[op].enabled ? 1 : 0.35);
      };
      onoff = makeButton(this, 400, y, 140, 56, '', () => {
        s.ops[op].enabled = !s.ops[op].enabled;
        refresh();
        saveSettings();
      }, { fontSize: 26 });
      range = makeButton(this, 645, y, 210, 56, '', () => {
        if (!s.ops[op].enabled) return;
        s.ops[op].presetIndex = (s.ops[op].presetIndex + 1) % presetCount(op);
        refresh();
        saveSettings();
      }, { bg: COLORS.btn, fontSize: 26 });
      refresh();
    });

    // 모드 / 답하기 / 제한시간
    this.makeToggleGroup(160, 470, '모드', [
      { k: 'explore', l: '탐험(편하게)' },
      { k: 'challenge', l: '도전(시간)' },
    ], () => s.mode, (k) => (s.mode = k as any));

    this.makeToggleGroup(160, 545, '답하기', [
      { k: 'choice', l: '선택' },
      { k: 'input', l: '입력' },
    ], () => s.answerMode, (k) => (s.answerMode = k as any));

    this.makeToggleGroup(160, 620, '제한시간', [
      { k: 'easy', l: '느긋' },
      { k: 'normal', l: '보통' },
      { k: 'hard', l: '빠름' },
    ], () => s.timeLevel, (k) => (s.timeLevel = k as any));

    // 하단 안내 + 버튼
    this.add
      .text(940, 470, '곱셈·나눗셈은 탐험 모드로\n시간 압박 없이 연습해요!', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#2b3a67',
        align: 'center',
        lineSpacing: 8,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);

    makeButton(this, 120, 672, 160, 60, '◀ 뒤로', () => this.scene.start('Title'), { fontSize: 28 });
    makeButton(this, DESIGN.width - 140, 672, 220, 60, '시작하기 ▶', () => this.scene.start('StageMap'), {
      bg: COLORS.btnGreen,
      fontSize: 30,
    });
  }

  private makeToggleGroup(
    x: number,
    y: number,
    title: string,
    items: { k: string; l: string }[],
    get: () => string,
    set: (k: string) => void
  ) {
    this.add.text(x, y, title, { fontFamily: FONT, fontSize: '30px', color: '#2b3a67', fontStyle: 'bold', resolution: TEXT_RES }).setOrigin(0, 0.5);
    const btns: ButtonContainer[] = [];
    const refresh = () => btns.forEach((b, i) => b.setBg(get() === items[i].k ? COLORS.btnGreen : COLORS.btnGray));
    items.forEach((it, i) => {
      const b = makeButton(this, x + 240 + i * 185, y, 170, 58, it.l, () => {
        set(it.k);
        refresh();
        saveSettings();
      }, { fontSize: 26 });
      btns.push(b);
    });
    refresh();
  }
}
