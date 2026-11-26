// Glossary of collected conflict cards (F9), shown page by page in a panel.
import { t } from './Texts.js';
import { COLORS } from '../scenes/UIScene.js';

export class GlossarySystem {
  constructor(ui, state, entries, pageSize) {
    this.ui = ui;
    this.state = state;
    this.entries = [...entries].sort((a, b) => a.chapter - b.chapter);
    this.pageSize = Math.max(1, pageSize || 3);
    this.page = 0;
  }

  foundCount() {
    return this.entries.filter((e) => this.state.cards[e.id]).length;
  }

  open(onClose) {
    const pages = Math.max(1, Math.ceil(this.entries.length / this.pageSize));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const slice = this.entries.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
    const sections = slice.map((e) => (this.state.cards[e.id]
      ? { label: e.term, text: e.definition }
      : { text: t('glossary_unknown', { n: e.chapter }), color: COLORS.disabled }));
    sections.push({ text: t('glossary_page', { page: this.page + 1, pages }), color: COLORS.muted });

    this.ui.showPanel({
      heading: t('glossary_title', { found: this.foundCount(), total: this.entries.length }),
      sections,
      choices: [
        { label: t('glossary_next'), disabled: this.page >= pages - 1 },
        { label: t('glossary_prev'), disabled: this.page === 0 },
        { label: t('close') },
      ],
      closable: true,
      onClose,
      onChoose: (i) => {
        if (i === 0) { this.page += 1; this.open(onClose); }
        else if (i === 1) { this.page -= 1; this.open(onClose); }
        else if (onClose) onClose();
      },
    });
  }
}
