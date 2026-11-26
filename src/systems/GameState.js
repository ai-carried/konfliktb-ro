// Progress of one play-through, saved in localStorage (F10).
// Every access to localStorage is wrapped in try/catch: in private windows or with
// blocked storage the game still works, it just does not remember progress.

const SAVE_VERSION = 1;
const FIELDS = ['conflicts', 'checkpoints', 'chaptersSeen', 'doorsOpen', 'cards', 'quiz', 'player'];

export class GameState {
  constructor(saveKey) {
    this.saveKey = saveKey;
    this.reset();
  }

  reset() {
    this.conflicts = {};    // conflictId -> { done, firstChoiceCorrect }
    this.checkpoints = {};  // conflictId or chapterId -> { passed, firstTryCorrect, total }
    this.chaptersSeen = {}; // chapterId or 'final' -> true (intro shown)
    this.doorsOpen = {};    // chapterId -> true
    this.cards = {};        // glossaryId -> true
    this.quiz = null;       // { correct, total, byGoal: { goal: { correct, total } } }
    this.player = null;     // { x, y }
  }

  conflict(id) {
    if (!this.conflicts[id]) this.conflicts[id] = { done: false, firstChoiceCorrect: null };
    return this.conflicts[id];
  }

  checkpoint(id) {
    if (!this.checkpoints[id]) this.checkpoints[id] = { passed: false, firstTryCorrect: 0, total: 0 };
    return this.checkpoints[id];
  }

  hasProgress() {
    return Object.keys(this.chaptersSeen).length > 0 || Object.keys(this.conflicts).length > 0;
  }

  save() {
    try {
      const data = { version: SAVE_VERSION };
      for (const f of FIELDS) data[f] = this[f];
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch (e) {
      /* storage not available: keep playing without saving */
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION) return false;
      for (const f of FIELDS) if (data[f] !== undefined) this[f] = data[f];
      return true;
    } catch (e) {
      return false;
    }
  }

  clear() {
    this.reset();
    try {
      localStorage.removeItem(this.saveKey);
    } catch (e) {
      /* ignore */
    }
  }
}
