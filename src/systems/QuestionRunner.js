// Asks a list of questions (F6, F7) in one of two modes:
//  - 'checkpoint': wrong answer -> feedback + retry (wrong answer disabled). After the last
//    allowed attempt the correct answer is shown and the player continues (nobody gets stuck).
//  - 'quiz': one attempt per question, feedback with explanation after each answer (F8).
// Answer order is shuffled per question if settings.shuffle_answers is true.
import { t } from './Texts.js';
import { COLORS } from '../scenes/UIScene.js';

export class QuestionRunner {
  constructor(ui, settings) {
    this.ui = ui;
    this.maxAttempts = Math.max(1, settings.checkpoint_max_attempts || 2);
    this.shuffle = settings.shuffle_answers !== false;
  }

  /**
   * opts = { questions, mode, title(n, total), closable, onClose(), onDone(result) }
   * result = { firstTry, total, perQuestion: [bool] }  (bool = correct on first attempt)
   */
  run(opts) {
    this.opts = opts;
    this.result = { firstTry: 0, total: opts.questions.length, perQuestion: [] };
    this.ask(0, 1, new Set(), this.makeOrder(opts.questions[0]));
  }

  makeOrder(question) {
    const order = question.answers.map((_, i) => i);
    return this.shuffle ? Phaser.Utils.Array.Shuffle(order) : order;
  }

  ask(index, attempt, excluded, order) {
    const q = this.opts.questions[index];
    this.ui.showPanel({
      heading: this.opts.title(index + 1, this.opts.questions.length),
      sections: [{ text: q.question }],
      choices: order.map((k) => ({ label: q.answers[k], disabled: excluded.has(k) })),
      closable: !!this.opts.closable,
      onClose: this.opts.onClose,
      onChoose: (displayIndex) => this.evaluate(index, attempt, excluded, order, order[displayIndex]),
    });
  }

  evaluate(index, attempt, excluded, order, answer) {
    const q = this.opts.questions[index];
    const correct = answer === q.correct_index;
    if (attempt === 1) {
      this.result.perQuestion[index] = correct;
      if (correct) this.result.firstTry += 1;
    }

    if (correct) {
      this.ui.showPanel({
        heading: t('correct'),
        headingColor: COLORS.good,
        sections: [{ text: q.explanation }],
        choices: [{ label: t('continue') }],
        onChoose: () => this.next(index + 1),
      });
      return;
    }

    const canRetry = this.opts.mode === 'checkpoint' && attempt < this.maxAttempts;
    if (canRetry) {
      this.ui.showPanel({
        heading: t('wrong'),
        headingColor: COLORS.bad,
        sections: [{ text: q.explanation }],
        choices: [{ label: t('try_again') }],
        onChoose: () => this.ask(index, attempt + 1, new Set([...excluded, answer]), order),
      });
      return;
    }

    this.ui.showPanel({
      heading: t('wrong'),
      headingColor: COLORS.bad,
      sections: [
        { label: t('correct_answer_is'), text: q.answers[q.correct_index], color: COLORS.good },
        { text: q.explanation },
      ],
      choices: [{ label: t('continue') }],
      onChoose: () => this.next(index + 1),
    });
  }

  next(index) {
    if (index < this.opts.questions.length) {
      this.ask(index, 1, new Set(), this.makeOrder(this.opts.questions[index]));
    } else if (this.opts.onDone) {
      this.opts.onDone(this.result);
    }
  }
}
