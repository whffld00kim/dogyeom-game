import Phaser from 'phaser';
import { DESIGN, FONT, COLORS } from '../theme';
import { TEXT_RES } from '../theme';
import { drawBackground, makeButton, ButtonContainer, applyHiRes, GLOSS3D } from '../widgets';
import { BIOME_COLORS } from '../systems/stageGenerator';
import { gameState, saveSettings, exportSave, importSave, isAdmin, enterAdmin, exitAdmin, getSettingsPw, setSettingsPw, resetSettingsPw, DEFAULT_SETTINGS_PW } from '../systems/save';
import { OP_LABEL, presetLabel, presetCount } from '../systems/settings';
import { setLevel, startMusic } from '../systems/music';
import type { Op, Subject } from '../types';

/** 설정 화면 — 2페이지: ①게임 모드(과목/연산/한글 단계/실수 허용) ②소리·모드·답하기·제한시간·보호자 비밀번호.
 *  좌우 화살표 + 스와이프로 전환(버튼 위에서 시작한 드래그는 스와이프로 안 침). */
export default class SettingsScene extends Phaser.Scene {
  private page = 0;
  private ui!: Phaser.GameObjects.Container;
  private btnRects: { x: number; y: number; w: number; h: number }[] = [];
  private swX = 0;
  private swY = 0;
  private swOnBtn = false;

  constructor() {
    super('Settings');
  }

  create() {
    applyHiRes(this);
    drawBackground(this, BIOME_COLORS['초원']); // 이미지 로드 실패 시 폴백
    // 설정 배경: 어두운 연구실 이미지(cover-fit, 맨 뒤)
    if (this.textures.exists('bg_settings')) {
      this.placeBg();
    } else {
      this.load.image('bg_settings', 'bg/settings.webp?v=1');
      this.load.once('complete', () => this.placeBg());
      this.load.once('loaderror', () => {});
      this.load.start();
    }
    this.page = 0;
    this.ui = this.add.container(0, 0);
    this.bindSwipe();
    this.render();
  }

  // ── 공통 빌더(페이지 전환 시 재생성 + 버튼 영역 기록) ──
  private btn(x: number, y: number, w: number, h: number, label: string, cb: () => void, opts: Parameters<typeof makeButton>[7]): ButtonContainer {
    const b = makeButton(this, x, y, w, h, label, cb, opts);
    this.ui.add(b);
    this.btnRects.push({ x, y, w, h });
    return b;
  }

  private text(x: number, y: number, t: string, fs: number, originX = 0): Phaser.GameObjects.Text {
    const o = this.add
      .text(x, y, t, { fontFamily: FONT, fontSize: `${fs}px`, color: '#ffffff', fontStyle: 'bold', stroke: '#16233f', strokeThickness: 5, resolution: TEXT_RES })
      .setOrigin(originX, 0.5);
    this.ui.add(o);
    return o;
  }

  private render() {
    this.ui.removeAll(true);
    this.btnRects = [];

    this.text(DESIGN.width / 2, 42, '게임 설정', 44, 0.5);
    this.text(DESIGN.width / 2, 88, `${this.page + 1} / 2  (좌우로 넘겨요)`, 20, 0.5);

    if (this.page === 0) this.renderPage1();
    else this.renderPage2();
    this.renderBottom();

    // 페이지 이동 화살표
    if (this.page === 0) this.btn(DESIGN.width - 44, 360, 52, 72, '▶', () => this.changePage(1), { ...GLOSS3D, fontSize: 24 });
    else this.btn(44, 360, 52, 72, '◀', () => this.changePage(-1), { ...GLOSS3D, fontSize: 24 });
  }

  private changePage(d: number) {
    const np = Phaser.Math.Clamp(this.page + d, 0, 1);
    if (np !== this.page) {
      this.page = np;
      this.render();
    }
  }

  private bindSwipe() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swX = p.worldX;
      this.swY = p.worldY;
      this.swOnBtn = this.btnRects.some((r) => Math.abs(p.worldX - r.x) <= r.w / 2 && Math.abs(p.worldY - r.y) <= r.h / 2);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.swOnBtn) return; // 버튼에서 시작한 드래그는 페이지 전환 안 함
      const dx = p.worldX - this.swX;
      const dy = p.worldY - this.swY;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) this.changePage(dx < 0 ? 1 : -1);
    });
  }

  // ── 1페이지: 게임 모드 ──
  private renderPage1() {
    const s = gameState.settings;

    this.group(160, 148, '과목', [
      { k: 'math', l: '수학' },
      { k: 'hangul', l: '한글' },
      { k: 'mix', l: '섞기' },
    ], () => s.subject, (k) => (s.subject = k as Subject));

    // 연산별 켜기/끄기 + 범위 (컴팩트 4행)
    const ops: Op[] = ['add', 'sub', 'mul', 'div'];
    ops.forEach((op, i) => {
      const y = 218 + i * 64;
      this.text(160, y, OP_LABEL[op], 28);
      let onoff: ButtonContainer;
      let range: ButtonContainer;
      const refresh = () => {
        onoff.setLabel(s.ops[op].enabled ? '켜짐' : '꺼짐');
        onoff.setBg(s.ops[op].enabled ? COLORS.btnGreen : COLORS.btnGray);
        range.setLabel(presetLabel(op, s.ops[op].presetIndex));
        range.setAlpha(s.ops[op].enabled ? 1 : 0.35);
      };
      onoff = this.btn(400, y, 140, 54, '', () => {
        s.ops[op].enabled = !s.ops[op].enabled;
        refresh();
        saveSettings();
      }, { ...GLOSS3D, fontSize: 24 });
      range = this.btn(645, y, 210, 54, '', () => {
        if (!s.ops[op].enabled) return;
        s.ops[op].presetIndex = (s.ops[op].presetIndex + 1) % presetCount(op);
        refresh();
        saveSettings();
      }, { ...GLOSS3D, bg: COLORS.btn, fontSize: 24 });
      refresh();
    });

    this.group(160, 486, '한글 단계', [
      { k: '1', l: '글자 고르기' },
      { k: '2', l: '맞는 글자' },
      { k: '3', l: '한 글자 쓰기' },
      { k: '4', l: '이름 쓰기' },
    ], () => String(s.hangulLevel), (k) => (s.hangulLevel = parseInt(k, 10)), { btnH: 54, fs: 20, labelFs: 28 });

    this.group(160, 552, '실수 허용', [
      { k: '1', l: '1번' },
      { k: '2', l: '2번' },
      { k: '3', l: '3번' },
      { k: '5', l: '5번' },
    ], () => String(s.maxMiss), (k) => (s.maxMiss = parseInt(k, 10)), { btnH: 54, fs: 24, labelFs: 28 });

    this.text(DESIGN.width / 2, 608, '한글 문제는 이름을 잠깐 보여준 뒤 가려요 · 틀리면 다시 한 번 보여줘요!', 20, 0.5);
  }

  // ── 2페이지: 소리 · 플레이 ──
  private renderPage2() {
    const s = gameState.settings;

    // 소리 (한 줄 4버튼 — 누르면 바로 반영)
    this.text(160, 180, '소리', 30);
    const sopts = [
      { l: 0, t: '끔' },
      { l: 1, t: '작게' },
      { l: 2, t: '보통' },
      { l: 3, t: '크게' },
    ];
    const sbtns: ButtonContainer[] = [];
    const srefresh = () => sbtns.forEach((b, i) => b.setBg(gameState.soundLevel === sopts[i].l ? COLORS.btnGreen : COLORS.btnGray));
    sopts.forEach((o, i) => {
      const b = this.btn(400 + i * 165, 180, 150, 58, o.t, () => {
        gameState.soundLevel = o.l;
        setLevel(o.l);
        startMusic();
        saveSettings();
        srefresh();
      }, { ...GLOSS3D, fontSize: 26 });
      sbtns.push(b);
    });
    srefresh();

    this.group(160, 262, '모드', [
      { k: 'explore', l: '탐험(편하게)' },
      { k: 'challenge', l: '도전(시간)' },
    ], () => s.mode, (k) => (s.mode = k as any));

    this.group(160, 344, '답하기', [
      { k: 'choice', l: '선택' },
      { k: 'input', l: '입력' },
    ], () => s.answerMode, (k) => (s.answerMode = k as any));

    this.group(160, 426, '제한시간', [
      { k: 'easy', l: '느긋' },
      { k: 'normal', l: '보통' },
      { k: 'hard', l: '빠름' },
    ], () => s.timeLevel, (k) => (s.timeLevel = k as any));

    // 보호자 비밀번호 — 설정 화면 잠금(기본 0000)
    this.text(160, 508, '보호자 비밀번호', 26);
    this.btn(530, 508, 250, 56, '🔒 변경', () => this.changePw(), { ...GLOSS3D, bg: COLORS.btn, fontSize: 24 });
    this.btn(810, 508, 250, 56, '↩ 0000으로', () => this.resetPw(), { ...GLOSS3D, bg: COLORS.btnGray, fontSize: 24 });

    const hint = this.add
      .text(DESIGN.width / 2, 596, '곱셈·나눗셈은 탐험 모드로\n시간 압박 없이 연습해요!', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#eaf1ff',
        stroke: '#16233f',
        strokeThickness: 4,
        align: 'center',
        lineSpacing: 8,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);
    this.ui.add(hint);
  }

  // ── 하단 공통 버튼 ──
  private renderBottom() {
    const by = DESIGN.height - 48;
    this.btn(120, by, 160, 60, '◀ 뒤로', () => this.scene.start('Title'), { ...GLOSS3D, fontSize: 28 });
    this.btn(DESIGN.width - 140, by, 220, 60, '시작하기 ▶', () => this.scene.start('StageMap'), {
      ...GLOSS3D,
      bg: COLORS.btnGreen,
      fontSize: 30,
    });
    this.btn(430, by, 210, 60, '💾 저장(백업)', () => this.doBackup(), { ...GLOSS3D, bg: COLORS.btn, fontSize: 26 });
    this.btn(668, by, 210, 60, '📂 불러오기', () => this.doRestore(), { ...GLOSS3D, bg: COLORS.btn, fontSize: 26 });

    // 🛠 관리자(검증) 모드 — 코인 99999 + 전 포켓몬 포획(끄면 원래 상태로 복구)
    let adminBtn: ButtonContainer;
    const refreshAdmin = () => {
      const on = isAdmin();
      adminBtn.setLabel(on ? '🛠 관리자 ON' : '🛠 관리자 OFF');
      adminBtn.setBg(on ? COLORS.bad : COLORS.btnGray);
    };
    adminBtn = this.btn(900, by, 200, 60, '', () => {
      if (isAdmin()) {
        exitAdmin().then(() => {
          refreshAdmin();
          window.alert('관리자모드 OFF — 원래 저장 상태로 돌아왔어요.');
        });
      } else {
        if (!window.confirm('관리자(검증) 모드를 켤까요?\n코인 99999 + 모든 포켓몬 포획 상태가 됩니다.\n끄면 지금 상태로 복구돼요(검증 중 변경사항은 사라짐).')) return;
        enterAdmin().then(() => {
          refreshAdmin();
          window.alert('관리자모드 ON — 코인 99999, 모든 포켓몬 포획!');
        });
      }
    }, { ...GLOSS3D, fontSize: 24 });
    refreshAdmin();
  }

  /** 토글 그룹 한 줄 (라벨 + 버튼들). opts로 버튼 높이/폰트 조절 */
  private group(
    x: number,
    y: number,
    title: string,
    items: { k: string; l: string }[],
    get: () => string,
    set: (k: string) => void,
    opts: { btnH?: number; fs?: number; labelFs?: number } = {}
  ) {
    this.text(x, y, title, opts.labelFs ?? 30);
    const btns: ButtonContainer[] = [];
    const refresh = () => btns.forEach((b, i) => b.setBg(get() === items[i].k ? COLORS.btnGreen : COLORS.btnGray));
    items.forEach((it, i) => {
      const b = this.btn(x + 240 + i * 185, y, 170, opts.btnH ?? 58, it.l, () => {
        set(it.k);
        refresh();
        saveSettings();
      }, { ...GLOSS3D, fontSize: opts.fs ?? 26 });
      btns.push(b);
    });
    refresh();
  }

  /** 보호자 비밀번호 변경 — 지금 비밀번호 확인 → 새 번호 2회 입력(숫자 4자리) */
  private changePw() {
    const cur = window.prompt('지금 비밀번호를 입력하세요');
    if (cur == null) return; // 취소
    if (cur.trim() !== getSettingsPw()) {
      window.alert('지금 비밀번호가 달라요. 🔒');
      return;
    }
    const next = window.prompt('새 비밀번호를 입력하세요 (숫자 4자리)');
    if (next == null) return;
    const again = window.prompt('한 번 더 입력하세요');
    if (again == null) return;
    if (next.trim() !== again.trim()) {
      window.alert('두 번 입력한 번호가 서로 달라요.');
      return;
    }
    setSettingsPw(next).then((ok) => {
      window.alert(ok ? '비밀번호를 바꿨어요! 🔒' : '숫자 4자리로만 정할 수 있어요. (예: 1234)');
    });
  }

  /** 보호자 비밀번호 초기화 — 기본값(0000)으로 되돌림 */
  private resetPw() {
    if (!window.confirm('비밀번호를 ' + DEFAULT_SETTINGS_PW + ' 으로 되돌릴까요?')) return;
    resetSettingsPw().then(() => window.alert('비밀번호를 ' + DEFAULT_SETTINGS_PW + ' 으로 되돌렸어요.'));
  }

  /** 현재 진행 상황 → 백업 코드. 클립보드 복사 + 입력창에 표시(직접 복사용) */
  private doBackup() {
    let code = '';
    try {
      code = exportSave();
    } catch {
      code = '';
    }
    if (!code) {
      window.alert('백업 코드를 만들지 못했어요.');
      return;
    }
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(
          () => {},
          () => {}
        );
        copied = true;
      }
    } catch {
      copied = false;
    }
    window.prompt(
      (copied ? '코드를 복사했어요! ' : '') + '카톡·메모에 붙여넣어 보관하세요. (전체 선택 → 복사)',
      code
    );
  }

  /** 백업 코드 붙여넣기 → 복원 후 게임 재시작 */
  private doRestore() {
    const code = window.prompt('백업 코드를 붙여넣고 확인을 누르세요:');
    if (code == null || !code.trim()) return;
    if (!window.confirm('지금 진행 상황을 백업 코드로 덮어쓸까요?')) return;
    importSave(code).then((r) => {
      if (r.ok) {
        window.alert('불러오기 완료! 게임을 다시 시작할게요.');
        window.location.reload();
      } else {
        window.alert('불러오기 실패: ' + r.msg);
      }
    });
  }

  private placeBg() {
    if (!this.textures.exists('bg_settings')) return;
    const img = this.add.image(DESIGN.width / 2, DESIGN.height / 2, 'bg_settings');
    img.setScale(Math.max(DESIGN.width / img.width, DESIGN.height / img.height)).setDepth(-9);
  }

  /** 하드웨어 백버튼 / 뒤로 */
  goBack() {
    this.scene.start('Title');
  }
}
