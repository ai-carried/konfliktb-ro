// Runs one conflict case:
// situation -> choice -> consequence -> (other options) -> theory -> short question(s).
// All texts come from content/conflicts.json and content/game.json.
import { t } from './Texts.js';
import { COLORS } from '../scenes/UIScene.js';
import { QuestionRunner } from './QuestionRunner.js';

export class DialogSystem {
  constructor(ui, state, settings) {
    this.ui = ui;
    this.state = state;
    this.settings = settings;
    this.questions = new QuestionRunner(ui, settings);
  }

  npcHeading(conflict) {
    const { name, role } = conflict.npc;
    return role ? `${name}, ${role}` : name;
  }

  start(conflict, onDone) {
    if (this.state.conflict(conflict.id).done) {
      this.ui.showPanel({
        heading: this.npcHeading(conflict),
        sections: [{ text: t('npc_done') }],
        choices: [{ label: t('close') }],
        closable: true,
      });
      return;
    }
    this.ui.showPanel({
      heading: this.npcHeading(conflict),
      sections: [{ text: conflict.situation }],
      choices: [{ label: t('continue') }],
      closable: true,
      onChoose: () => this.showChoice(conflict, onDone),
    });
  }

  showChoice(conflict, onDone) {
    const order = conflict.options.map((_, i) => i);
    if (this.settings.shuffle_answers !== false) Phaser.Utils.Array.Shuffle(order);
    this.ui.showPanel({
      heading: t('choice_prompt'),
      sections: [{ label: this.npcHeading(conflict), text: conflict.situation, color: COLORS.muted }],
      choices: order.map((i) => ({ label: conflict.options[i].text })),
      closable: true,
      onChoose: (displayIndex) => {
        const index = order[displayIndex];
        const progress = this.state.conflict(conflict.id);
        // Only the first reaction counts for the evaluation.
        if (progress.firstChoiceCorrect === null) {
          progress.firstChoiceCorrect = conflict.options[index].correct;
          this.state.save();
        }
        this.showConsequence(conflict, index, onDone);
      },
    });
  }

  showConsequence(conflict, index, onDone) {
    const option = conflict.options[index];
    this.ui.showPanel({
      heading: option.correct ? t('consequence_good') : t('consequence_bad'),
      headingColor: option.correct ? COLORS.good : COLORS.bad,
      sections: [
        { label: t('your_choice'), text: option.text, color: COLORS.muted },
        { text: option.consequence },
      ],
      choices: [{ label: t('to_theory') }, { label: t('show_other') }],
      onChoose: (i) => (i === 0 ? this.showTheory(conflict, onDone) : this.showOthers(conflict, index, onDone)),
    });
  }

  showOthers(conflict, chosenIndex, onDone) {
    const sections = conflict.options
      .filter((_, i) => i !== chosenIndex)
      .map((o) => ({
        label: `${o.correct ? t('consequence_good') : t('consequence_bad')}: „${o.text}“`,
        text: o.consequence,
        color: o.correct ? COLORS.good : COLORS.text,
      }));
    this.ui.showPanel({
      heading: t('other_title'),
      sections,
      choices: [{ label: t('to_theory') }],
      onChoose: () => this.showTheory(conflict, onDone),
    });
  }

  showTheory(conflict, onDone) {
    const th = conflict.theory;
    this.ui.showPanel({
      heading: t('theory_title', { model: th.model }),
      sections: [
        { label: t('theory_summary'), text: th.summary },
        { label: t('theory_example'), text: th.example },
      ],
      choices: [{ label: t('continue') }],
      onChoose: () => this.askQuestions(conflict, onDone),
    });
  }

  askQuestions(conflict, onDone) {
    this.questions.run({
      questions: conflict.checkpoints,
      mode: 'checkpoint',
      title: (n, total) => (total > 1 ? `${t('quick_title')} ${n}/${total}` : t('quick_title')),
      closable: false,
      onDone: (result) => {
        const cp = this.state.checkpoint(conflict.id);
        Object.assign(cp, { passed: true, firstTryCorrect: result.firstTry, total: result.total });
        this.state.conflict(conflict.id).done = true;
        this.state.save();
        if (onDone) onDone();
      },
    });
  }
}
