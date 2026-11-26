// Non-player character: linked to a conflict case, or the host of the final quiz.
import { DIRECTIONS } from '../scenes/BootScene.js';
import { COLORS } from '../scenes/UIScene.js';

export class Npc extends Phaser.Physics.Arcade.Sprite {
  /**
   * info = { conflict?, name, isHost? }
   */
  constructor(scene, x, y, spriteKey, info, reducedMotion) {
    super(scene, x, y, spriteKey, 0);
    this.conflict = info.conflict || null;
    this.displayName = info.name;
    this.isHost = !!info.isHost;
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.body.setSize(12, 8).setOffset(2, 8);
    this.body.updateFromGameObject();
    this.setDepth(10 + y / 1000);

    // "!" marker above the head while the case is still open
    this.marker = scene.add.text(x, y - 15, '!', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: COLORS.accent, stroke: '#1a1a24', strokeThickness: 3, resolution: 6,
    }).setOrigin(0.5).setDepth(20);
    if (!reducedMotion) {
      scene.tweens.add({ targets: this.marker, y: y - 18, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  setOpen(open) {
    this.marker.setVisible(open);
  }

  faceTowards(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.setFrame(DIRECTIONS.indexOf(dir) * 3);
  }
}
