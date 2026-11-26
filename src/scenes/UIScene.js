// Overlay scene: dialog/theory/quiz panels, HUD (chapter, progress, objective),
// interaction prompt and short notifications. Runs in parallel to OfficeScene.
// Adapts to any window size (RESIZE mode). Fully keyboard-operable, mouse as an addition.
import { t } from '../systems/Texts.js';

export const FONT = 'system-ui, "Segoe UI", Arial, sans-serif';
// All text colours reach at least WCAG AA (4.5:1) on the panel background #14213d.
export const COLORS = {
  text: '#ffffff',
  muted: '#c8d2e6',
  accent: '#ffd75e',
  good: '#7ee08a',
  bad: '#ff9b9b',
  disabled: '#8f9ab0',
  bgDark: '#0b1020',
  panel: 0x14213d,
  panelBorder: 0xe0b23a,
  selection: 0x2a3d66,
};

// Scale factor for fonts and spacing, based on a 960x640 reference layout.
export function uiScale(width, height) {
  return Phaser.Math.Clamp(Math.min(width / 960, height / 640), 0.75, 1.6);
}

export function textStyle(scale, size, extra = {}) {
  return { fontFamily: FONT, fontSize: `${Math.round(size * scale)}px`, color: COLORS.text, resolution: 2, ...extra };
}

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.panel = null;        // current panel spec
    this.panelObjects = null; // container with the rendered panel
    this.choiceItems = [];
    this.selected = 0;
    this.inputLockedUntil = 0;
    this.hudData = { chapter: null, progress: null, objective: null };
    this.promptValue = null;

    // HUD background drawn separately (with a safety margin) so long lines never touch the edge
    this.hudBg = this.add.rectangle(0, 0, 10, 10, COLORS.panel, 0.93).setOrigin(0, 0).setDepth(9).setVisible(false);
    this.hud = this.add.text(0, 0, '', {}).setDepth(10).setVisible(false);
    this.keysHint = this.add.text(0, 0, t('hud_keys'), {}).setDepth(10).setOrigin(1, 0).setVisible(false);
    this.prompt = this.add.text(0, 0, '', {}).setOrigin(0.5).setDepth(10).setVisible(false);
    this.toastText = this.add.text(0, 0, '', {}).setOrigin(0.5).setDepth(15).setVisible(false);
    this.layoutStatic();

    this.input.keyboard.on('keydown', (event) => this.onKey(event));
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    this.ready = true;
  }

  get s() {
    return uiScale(this.scale.width, this.scale.height);
  }

  // ---------- layout ----------

  layoutStatic() {
    const { width, height } = this.scale;
    const s = this.s;
    const pad = Math.round(12 * s);
    this.hudPad = { x: Math.round(14 * s), y: Math.round(8 * s), margin: pad };
    this.hud.setStyle(textStyle(s, 17, { lineSpacing: Math.round(4 * s) }));
    this.hud.setPosition(pad + this.hudPad.x, pad + this.hudPad.y);
    this.keysHint.setStyle(textStyle(s, 14, { color: COLORS.muted, backgroundColor: '#14213dcc', padding: { x: Math.round(10 * s), y: Math.round(6 * s) } }));
    this.keysHint.setPosition(width - pad, pad);
    this.prompt.setStyle(textStyle(s, 20, { fontStyle: 'bold', color: COLORS.bgDark, backgroundColor: COLORS.accent, padding: { x: 12 * s, y: 6 * s } }));
    this.prompt.setPosition(width / 2, height - Math.round(40 * s));
    this.toastText.setStyle(textStyle(s, 18, { fontStyle: 'bold', color: COLORS.text, backgroundColor: '#1f6f46', padding: { x: 14 * s, y: 8 * s } }));
    this.toastText.setPosition(width / 2, height - Math.round(95 * s));
  }

  onResize() {
    this.layoutStatic();
    this.refreshHud();
    if (this.panel) {
      const keep = this.selected;
      this.renderPanel(this.panel);
      this.select(keep);
    }
  }

  // ---------- HUD, prompt, toast ----------

  isBusy() {
    return !!this.panel;
  }

  setHud(data) {
    if (!this.ready) return;
    const changed = ['chapter', 'progress', 'objective'].some((k) => this.hudData[k] !== data[k]);
    if (!changed) return;
    this.hudData = { ...data };
    this.refreshHud();
  }

  refreshHud() {
    const { chapter, progress, objective } = this.hudData;
    const lines = [chapter, progress, objective ? `${t('objective_label')}: ${objective}` : null].filter(Boolean);
    this.hud.setText(lines.join('\n'));
    this.hud.setVisible(lines.length > 0);
    const { x, y, margin } = this.hudPad;
    this.hudBg.setPosition(margin, margin)
      .setSize(this.hud.width + x * 2 + Math.round(6 * this.s), this.hud.height + y * 2)
      .setVisible(lines.length > 0);
    this.keysHint.setVisible(lines.length > 0);
  }

  clearHud() {
    this.setHud({ chapter: null, progress: null, objective: null });
  }

  setPrompt(text) {
    if (!this.ready) return;
    if (this.promptValue !== text) {
      this.promptValue = text;
      this.prompt.setText(text || '');
    }
    this.prompt.setVisible(!!text && !this.panel);
  }

  toast(text, ms = 2600) {
    if (!this.ready) return;
    this.toastText.setText(text).setVisible(true);
    if (this.toastTimer) this.toastTimer.remove();
    this.toastTimer = this.time.delayedCall(ms, () => this.toastText.setVisible(false));
  }

  // ---------- panels ----------

  /**
   * Shows a panel.
   * spec = {
   *   heading, headingColor,
   *   sections: [{ label?, text, color? }],
   *   choices: [{ label, disabled?, color? }],   // at least one
   *   onChoose(index), closable (Esc), onClose()
   * }
   */
  showPanel(spec) {
    this.clearPanel();
    this.panel = spec;
    this.inputLockedUntil = this.time.now + 180; // swallow the key press that opened the panel
    this.prompt.setVisible(false);
    this.toastText.setVisible(false); // a notification must never shine through a panel
    this.renderPanel(spec);
    const first = this.choiceItems.findIndex((c) => !c.disabled);
    this.select(first < 0 ? 0 : first);
  }

  renderPanel(spec) {
    if (this.panelObjects) this.panelObjects.destroy(true);
    const { width, height } = this.scale;
    const s = this.s;
    const panelW = Math.min(width - Math.round(32 * s), Math.round(1000 * s));
    const panelX = Math.round((width - panelW) / 2);
    const pad = Math.round(24 * s);
    const textW = panelW - pad * 2;
    const x = panelX + pad;

    const container = this.add.container(0, 0).setDepth(20);
    const parts = [];
    let y = pad;

    if (spec.heading) {
      const h = this.add.text(x, y, spec.heading, textStyle(s, 24, {
        fontStyle: 'bold', color: spec.headingColor || COLORS.accent, wordWrap: { width: textW },
      }));
      parts.push(h);
      y += h.height + Math.round(12 * s);
    }

    for (const sec of spec.sections || []) {
      if (sec.label) {
        const l = this.add.text(x, y, sec.label, textStyle(s, 16, { fontStyle: 'bold', color: COLORS.muted, wordWrap: { width: textW } }));
        parts.push(l);
        y += l.height + Math.round(2 * s);
      }
      if (sec.text) {
        const tx = this.add.text(x, y, sec.text, textStyle(s, 20, { color: sec.color || COLORS.text, wordWrap: { width: textW }, lineSpacing: 4 * s }));
        parts.push(tx);
        y += tx.height;
      }
      y += Math.round(12 * s);
    }

    y += Math.round(4 * s);
    const indent = Math.round(28 * s);
    this.choiceItems = (spec.choices || []).map((c, i) => {
      const label = this.add.text(x + indent, y, `${i + 1}  ${c.label}`, textStyle(s, 20, {
        color: c.disabled ? COLORS.disabled : c.color || COLORS.text, wordWrap: { width: textW - indent - 8 }, lineSpacing: 4 * s,
      }));
      const bg = this.add.rectangle(x - 8 * s, y - 4 * s, textW + 16 * s, label.height + 8 * s, COLORS.selection).setOrigin(0, 0);
      const marker = this.add.text(x, y, '▶', textStyle(s, 20, { color: COLORS.accent }));
      if (!c.disabled) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => this.select(i));
        bg.on('pointerdown', () => this.choose(i));
      }
      parts.push(bg, label, marker);
      y += label.height + Math.round(12 * s);
      return { bg, label, marker, disabled: !!c.disabled };
    });

    const hint = this.add.text(x, y + 2 * s, this.hintText(spec), textStyle(s, 16, { color: COLORS.muted, wordWrap: { width: textW } }));
    parts.push(hint);
    y += hint.height + pad;

    const panelH = y;
    const panelY = Math.max(Math.round(10 * s), height - Math.round(16 * s) - panelH);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel, 0.97).fillRoundedRect(panelX, 0, panelW, panelH, 10 * s);
    bg.lineStyle(3, COLORS.panelBorder, 1).strokeRoundedRect(panelX, 0, panelW, panelH, 10 * s);
    container.add(bg);
    container.add(parts);
    container.y = panelY;
    this.panelObjects = container;
    this.panelBounds = { x: panelX, y: panelY, width: panelW, height: panelH };
  }

  closePanel() {
    const spec = this.panel;
    this.clearPanel();
    if (spec && spec.onClose) spec.onClose();
  }

  // Plain-text dump of the visible panel (used by the automated test).
  panelText() {
    if (!this.panelObjects) return '';
    return this.panelObjects.list.filter((o) => o.type === 'Text').map((o) => o.text).join('\n');
  }

  hintText(spec) {
    const parts = [];
    if ((spec.choices || []).length > 1) parts.push(t('hint_select'));
    parts.push(t('hint_confirm'));
    if (spec.closable) parts.push(t('hint_close'));
    return parts.join('   ·   ');
  }

  clearPanel() {
    if (this.panelObjects) this.panelObjects.destroy(true);
    this.panelObjects = null;
    this.panel = null;
    this.choiceItems = [];
  }

  select(i) {
    if (!this.choiceItems[i] || this.choiceItems[i].disabled) return;
    this.selected = i;
    this.choiceItems.forEach((c, k) => {
      const active = k === i;
      c.bg.setAlpha(active ? 1 : 0);
      c.marker.setVisible(active);
      if (!c.disabled) c.label.setColor(active ? COLORS.accent : (this.panel.choices[k].color || COLORS.text));
    });
  }

  moveSelection(step) {
    const n = this.choiceItems.length;
    for (let k = 1; k <= n; k++) {
      const i = (((this.selected + step * k) % n) + n) % n;
      if (!this.choiceItems[i].disabled) return this.select(i);
    }
  }

  choose(i) {
    if (!this.panel || !this.choiceItems[i] || this.choiceItems[i].disabled) return;
    const spec = this.panel;
    this.clearPanel();
    if (spec.onChoose) spec.onChoose(i);
  }

  onKey(event) {
    if (!this.panel || event.repeat || this.time.now < this.inputLockedUntil) return;
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveSelection(-1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveSelection(1);
        break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space':
        this.choose(this.selected);
        break;
      case 'Escape':
        if (this.panel.closable) this.closePanel();
        break;
      default: {
        const m = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
        if (m) this.choose(Number(m[1]) - 1);
      }
    }
  }
}
