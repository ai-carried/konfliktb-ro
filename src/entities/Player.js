// Player character: 4-direction movement with arrow keys and WASD.
import { DIRECTIONS } from '../scenes/BootScene.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, speed) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.speed = speed;
    this.facing = 'down';
    // Small hitbox at the feet so the player can pass between furniture.
    this.body.setSize(10, 6).setOffset(3, 10);
    this.setCollideWorldBounds(true);

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
    });
  }

  stop() {
    this.body.setVelocity(0, 0);
    this.anims.stop();
    this.setFrame(DIRECTIONS.indexOf(this.facing) * 3);
  }

  update(reducedMotion) {
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.left.isDown || k.a.isDown) vx -= 1;
    if (k.right.isDown || k.d.isDown) vx += 1;
    if (k.up.isDown || k.w.isDown) vy -= 1;
    if (k.down.isDown || k.s.isDown) vy += 1;

    if (vx === 0 && vy === 0) {
      this.stop();
      return;
    }
    const len = Math.hypot(vx, vy);
    this.body.setVelocity((vx / len) * this.speed, (vy / len) * this.speed);

    // Facing: horizontal wins when moving diagonally
    if (vx < 0) this.facing = 'left';
    else if (vx > 0) this.facing = 'right';
    else if (vy < 0) this.facing = 'up';
    else this.facing = 'down';

    if (reducedMotion) {
      this.anims.stop();
      this.setFrame(DIRECTIONS.indexOf(this.facing) * 3);
    } else {
      this.anims.play(`player-walk-${this.facing}`, true);
    }
    this.setDepth(10 + this.y / 1000);
  }
}
