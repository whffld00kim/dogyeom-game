import Phaser from 'phaser';
import { DESIGN } from './theme';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import SettingsScene from './scenes/SettingsScene';
import StageMapScene from './scenes/StageMapScene';
import GameScene from './scenes/GameScene';
import ResultScene from './scenes/ResultScene';
import DebugScene from './scenes/DebugScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fd3ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN.width,
    height: DESIGN.height,
  },
  render: { antialias: true },
  scene: [BootScene, TitleScene, SettingsScene, StageMapScene, GameScene, ResultScene, DebugScene],
};

const game = new Phaser.Game(config);
// 개발 편의: 콘솔/검증에서 접근 가능하도록 노출 (프로덕션 무해)
(window as any).game = game;
