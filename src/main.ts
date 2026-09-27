import Phaser from 'phaser';
import { App } from '@capacitor/app';
import { DESIGN, HD } from './theme';
import { startMusic, pauseForBackground, resumeFromBackground } from './systems/music';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import SettingsScene from './scenes/SettingsScene';
import StageMapScene from './scenes/StageMapScene';
import GameScene from './scenes/GameScene';
import ResultScene from './scenes/ResultScene';
import DexScene from './scenes/DexScene';
import ShopScene from './scenes/ShopScene';
import DialogueScene from './scenes/DialogueScene';
import DailyScene from './scenes/DailyScene';
import DebugScene from './scenes/DebugScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fd3ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // 백버퍼를 고해상도로: DESIGN(1280x720)×HD. 각 씬은 applyHiRes()로 카메라 HD배 줌 → 좌표는 1280x720 유지.
    width: Math.round(DESIGN.width * HD), // 저사양이면 HD가 소수라 반올림
    height: Math.round(DESIGN.height * HD),
  },
  render: { antialias: true },
  scene: [BootScene, TitleScene, SettingsScene, StageMapScene, GameScene, ResultScene, DexScene, ShopScene, DialogueScene, DailyScene, DebugScene],
};

const game = new Phaser.Game(config);
// 개발 편의: 콘솔/검증에서 접근 가능하도록 노출 (프로덕션 무해)
(window as any).game = game;

// 폴더블/일부 WebView: 부팅 직후 뷰포트 크기가 늦게 확정되거나 접힘 전환 시 resize를
// Phaser 가 놓쳐 캔버스가 작게 굳는 문제 → FIT 재계산을 명시적으로 반복 보정.
const refit = () => {
  try {
    game.scale.refresh();
  } catch {
    /* boot 전 호출 무시 */
  }
};
window.addEventListener('resize', () => {
  refit();
  setTimeout(refit, 120);
  setTimeout(refit, 500);
});
window.addEventListener('orientationchange', () => setTimeout(refit, 150));
document.addEventListener('visibilitychange', () => setTimeout(refit, 100));
[300, 800, 1600, 3000].forEach((t) => setTimeout(refit, t)); // 부팅 직후 보정

// 첫 사용자 입력 후 배경음악 시작 (브라우저 자동재생 정책상 제스처 필요)
window.addEventListener('pointerdown', () => startMusic(), { once: true });

// 안드로이드 하드웨어 백버튼 → 앱 종료 대신 화면 내 '뒤로'. (Title/Boot 에서만 앱 종료)
App.addListener('backButton', () => {
  const active = game.scene.getScenes(true);
  const top = active[active.length - 1] as Phaser.Scene & { goBack?: () => void };
  const key = top?.scene?.key;
  if (!top || key === 'Title' || key === 'Boot') {
    pauseForBackground(); // 종료 직전에 소리부터 끈다 (웹뷰가 바로 안 죽으면 음악이 남는다)
    App.exitApp();
  } else if (typeof top.goBack === 'function') {
    top.goBack();
  } else {
    pauseForBackground();
    App.exitApp();
  }
}).catch(() => {});

// 홈 버튼·앱 전환·화면 꺼짐 → 소리 끔, 돌아오면 복원. 앱(appStateChange)과 브라우저/PWA(visibilitychange) 양쪽
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) resumeFromBackground();
  else pauseForBackground();
}).catch(() => {});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseForBackground();
  else resumeFromBackground();
});
