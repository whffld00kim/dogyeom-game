import Phaser from 'phaser';

// 터치 좌표 진단용 오버레이 (모든 씬 위에 떠서 입력은 소비하지 않음)
export default class DebugScene extends Phaser.Scene {
  private marker!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private lastDown = { x: 0, y: 0 };

  constructor() {
    super({ key: 'Debug', active: false });
  }

  create() {
    this.info = this.add
      .text(12, 84, '', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ff0000',
        backgroundColor: 'rgba(255,255,255,0.92)',
      })
      .setDepth(99999);
    this.marker = this.add.graphics().setDepth(99999);
    // 상호작용 오브젝트를 두지 않으므로 아래 씬의 버튼 입력을 가로채지 않음
  }

  update() {
    const p = this.game.input.activePointer;
    if (p.isDown) this.lastDown = { x: Math.round(p.x), y: Math.round(p.y) };

    this.marker.clear();
    this.marker.lineStyle(4, 0xff0000, 1);
    this.marker.strokeCircle(p.x, p.y, 26);
    this.marker.lineBetween(p.x - 38, p.y, p.x + 38, p.y);
    this.marker.lineBetween(p.x, p.y - 38, p.x, p.y + 38);

    const r = this.game.canvas.getBoundingClientRect();
    const sm = this.scale;
    this.info.setText(
      [
        `dpr=${window.devicePixelRatio}`,
        `game=${sm.gameSize.width}x${sm.gameSize.height}`,
        `disp=${Math.round(sm.displaySize.width)}x${Math.round(sm.displaySize.height)}`,
        `rect=${Math.round(r.width)}x${Math.round(r.height)} @(${Math.round(r.left)},${Math.round(r.top)})`,
        `ptr=(${Math.round(p.x)},${Math.round(p.y)}) down=${p.isDown}`,
        `lastTap=(${this.lastDown.x},${this.lastDown.y})`,
      ].join('\n')
    );
  }
}
