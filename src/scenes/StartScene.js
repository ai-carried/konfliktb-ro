// Title screen: introduction, controls, reduced-motion toggle, continue / new game.
// Layout is rebuilt when the window size changes.
import { t } from '../systems/Texts.js';
import { COLORS, textStyle, uiScale } from './UIScene.js';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    this.starting = false;
    this.state = this.registry.get('state');
    this.layer = this.add.container(0, 0);
    this.layout();

    this.input.keyboard.on('keydown-ENTER', () => this.startGame(false));
    this.input.keyboard.on('keydown-SPACE', () => this.startGame(false));
    this.input.keyboard.on('keydown-N', () => { if (this.state.hasProgress()) this.startGame(true); });
    this.input.keyboard.on('keydown-B', () => {
      this.registry.set('reducedMotion', !this.registry.get('reducedMotion'));
      this.layout();
    });
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  layout() {
    this.layer.removeAll(true);
    const { width, height } = this.scale;
    const s = uiScale(width, height);
    const cx = width / 2;
    const maxW = Math.min(width - 48, 820 * s);
    const add = (obj) => { this.layer.add(obj); return obj; };
    const resume = this.state.hasProgress();

    let y = Math.max(24, height * 0.08);
    const title = add(this.add.text(cx, y, t('title'), textStyle(s, 46, { fontStyle: 'bold', color: COLORS.accent })).setOrigin(0.5, 0));
    y += title.height + 6 * s;
    const sub = add(this.add.text(cx, y, t('subtitle'), textStyle(s, 22)).setOrigin(0.5, 0));
    y += sub.height + 28 * s;
    const intro = add(this.add.text(cx, y, t('intro'), textStyle(s, 20, { align: 'center', wordWrap: { width: maxW }, lineSpacing: 6 * s })).setOrigin(0.5, 0));
    y += intro.height + 28 * s;
    const ctTitle = add(this.add.text(cx, y, t('controls_title'), textStyle(s, 22, { fontStyle: 'bold', color: COLORS.accent })).setOrigin(0.5, 0));
    y += ctTitle.height + 8 * s;
    const controls = add(this.add.text(cx, y, t('controls'), textStyle(s, 19, { align: 'center', lineSpacing: 8 * s })).setOrigin(0.5, 0));
    y += controls.height + 22 * s;

    const motion = this.registry.get('reducedMotion') ? t('on') : t('off');
    const extra = add(this.add.text(cx, y, `${t('reduced_motion_label')}: ${motion}\n${t('save_note')}`,
      textStyle(s, 16, { color: COLORS.muted, align: 'center', lineSpacing: 4 * s })).setOrigin(0.5, 0));
    y += extra.height + 26 * s;

    const start = add(this.add.text(cx, y, resume ? t('start_continue') : t('start_prompt'), textStyle(s, 24, {
      fontStyle: 'bold', color: COLORS.bgDark, backgroundColor: COLORS.accent, padding: { x: 18 * s, y: 10 * s },
    })).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }));
    start.on('pointerdown', () => this.startGame(false));
    y += start.height + 14 * s;

    if (resume) {
      const fresh = add(this.add.text(cx, y, t('start_new_hint'), textStyle(s, 18, { color: COLORS.text }))
        .setOrigin(0.5, 0).setInteractive({ useHandCursor: true }));
      fresh.on('pointerdown', () => this.startGame(true));
    }
  }

  startGame(fresh) {
    if (this.starting) return;
    this.starting = true;
    if (fresh) this.state.clear();
    this.scene.start('OfficeScene');
  }
}
