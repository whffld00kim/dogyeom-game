import Phaser from 'phaser';
import { DESIGN } from './theme';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import SettingsScene from './scenes/SettingsScene';
import StageMapScene from './scenes/StageMapScene';
import GameScene from './scenes/GameScene';
import ResultScene from './scenes/ResultScene';
import DexScene from './scenes/DexScene';
import DialogueScene from './scenes/DialogueScene';
import DebugScene from './scenes/DebugScene';

// HiDPI 선명도: 캔버스를 기기 배율 그대로(최대 3x) 렌더 → 선·테두리까지 또렷. 게임 좌표는 1280x720 유지.
const HD = Math.min(3, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fd3ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN.width,
    height: DESIGN.height,
    zoom: HD,
  },
  render: { antialias: true },
  scene: [BootScene, TitleScene, SettingsScene, StageMapScene, GameScene, ResultScene, DexScene, DialogueScene, DebugScene],
};

const game = new Phaser.Game(config);
// 개발 편의: 콘솔/검증에서 접근 가능하도록 노출 (프로덕션 무해)
(window as any).game = game;
