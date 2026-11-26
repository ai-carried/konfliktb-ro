// Validates the JSON content files so that content editors get a readable
// error message instead of a broken game.

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

function validateQuestion(q, where, errors) {
  if (!q || !isText(q.question)) errors.push(`${where}: "question" fehlt`);
  if (!q || !Array.isArray(q.answers) || q.answers.length < 2 || !q.answers.every(isText)) {
    errors.push(`${where}: "answers" braucht mindestens 2 Texte`);
  } else if (q.answers.length > 9) {
    errors.push(`${where}: höchstens 9 Antworten möglich`);
  } else if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= q.answers.length) {
    errors.push(`${where}: "correct_index" zeigt auf keine Antwort`);
  }
  if (!q || !isText(q.explanation)) errors.push(`${where}: "explanation" fehlt`);
}

export function validateConflicts(data) {
  const errors = [];
  if (!data || !Array.isArray(data.conflicts) || data.conflicts.length === 0) {
    return ['conflicts.json: Liste "conflicts" fehlt oder ist leer'];
  }
  const ids = new Set();
  data.conflicts.forEach((c, i) => {
    const where = `conflicts.json, Fall ${c && c.id ? c.id : '#' + (i + 1)}`;
    if (!isText(c.id)) errors.push(`${where}: "id" fehlt`);
    else if (ids.has(c.id)) errors.push(`${where}: "id" ist doppelt`);
    ids.add(c.id);
    if (!c.npc || !isText(c.npc.id) || !isText(c.npc.name)) errors.push(`${where}: "npc" braucht "id" und "name"`);
    if (!isText(c.situation)) errors.push(`${where}: "situation" fehlt`);
    if (!Array.isArray(c.options) || c.options.length < 2 || c.options.length > 9) {
      errors.push(`${where}: 2 bis 9 "options" nötig`);
    } else {
      c.options.forEach((o, k) => {
        if (!isText(o.text) || !isText(o.consequence) || typeof o.correct !== 'boolean') {
          errors.push(`${where}, Option ${k + 1}: "text", "consequence" und "correct" nötig`);
        }
      });
    }
    const th = c.theory || {};
    if (!isText(th.model) || !isText(th.summary) || !isText(th.example)) {
      errors.push(`${where}: "theory" braucht "model", "summary" und "example"`);
    }
    if (!Array.isArray(c.checkpoints) || c.checkpoints.length === 0) {
      errors.push(`${where}: mindestens 1 Eintrag in "checkpoints" nötig`);
    } else {
      c.checkpoints.forEach((q, k) => validateQuestion(q, `${where}, Frage ${k + 1}`, errors));
    }
  });
  return errors;
}

export function validateChapters(data, conflictIds, maxConflictsPerChapter) {
  const errors = [];
  if (!data || !Array.isArray(data.chapters) || data.chapters.length === 0) {
    return ['chapters.json: Liste "chapters" fehlt oder ist leer'];
  }
  if (!data.learning_goals || typeof data.learning_goals !== 'object') errors.push('chapters.json: "learning_goals" fehlt');
  const used = new Set();
  data.chapters.forEach((ch, i) => {
    const where = `chapters.json, Kapitel ${ch && ch.id ? ch.id : '#' + (i + 1)}`;
    if (!isText(ch.id) || !isText(ch.title) || !isText(ch.intro)) errors.push(`${where}: "id", "title" und "intro" nötig`);
    if (!Array.isArray(ch.conflicts) || ch.conflicts.length === 0) {
      errors.push(`${where}: "conflicts" ist leer`);
    } else {
      if (ch.conflicts.length > maxConflictsPerChapter) {
        errors.push(`${where}: höchstens ${maxConflictsPerChapter} Fälle pro Kapitel (Plätze auf der Karte)`);
      }
      for (const id of ch.conflicts) {
        if (!conflictIds.has(id)) errors.push(`${where}: Fall "${id}" gibt es nicht in conflicts.json`);
        if (used.has(id)) errors.push(`${where}: Fall "${id}" ist mehrfach eingeplant`);
        used.add(id);
      }
    }
    if (!Array.isArray(ch.checkpoint) || ch.checkpoint.length === 0) {
      errors.push(`${where}: mindestens 1 Frage in "checkpoint" nötig`);
    } else {
      ch.checkpoint.forEach((q, k) => validateQuestion(q, `${where}, Checkpoint-Frage ${k + 1}`, errors));
    }
  });
  for (const id of conflictIds) if (!used.has(id)) errors.push(`conflicts.json: Fall "${id}" ist keinem Kapitel zugeordnet`);
  return errors;
}

export function validateGlossary(data, chapterCount, maxCardsPerChapter) {
  const errors = [];
  if (!data || !Array.isArray(data.entries)) return ['glossary.json: Liste "entries" fehlt'];
  const perChapter = {};
  const ids = new Set();
  data.entries.forEach((e, i) => {
    const where = `glossary.json, Eintrag ${e && e.id ? e.id : '#' + (i + 1)}`;
    if (!isText(e.id) || !isText(e.term) || !isText(e.definition)) errors.push(`${where}: "id", "term" und "definition" nötig`);
    if (ids.has(e.id)) errors.push(`${where}: "id" ist doppelt`);
    ids.add(e.id);
    if (!Number.isInteger(e.chapter) || e.chapter < 1 || e.chapter > chapterCount) {
      errors.push(`${where}: "chapter" muss zwischen 1 und ${chapterCount} liegen`);
    }
    perChapter[e.chapter] = (perChapter[e.chapter] || 0) + 1;
  });
  for (const [ch, n] of Object.entries(perChapter)) {
    if (n > maxCardsPerChapter) errors.push(`glossary.json: Kapitel ${ch} hat ${n} Karten, Platz ist für ${maxCardsPerChapter}`);
  }
  return errors;
}

export function validateFinalQuiz(data, learningGoals) {
  const errors = [];
  if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
    return ['final_quiz.json: Liste "questions" fehlt oder ist leer'];
  }
  if (!data.host || !isText(data.host.name)) errors.push('final_quiz.json: "host" braucht "name"');
  if (!isText(data.intro)) errors.push('final_quiz.json: "intro" fehlt');
  data.questions.forEach((q, i) => {
    const where = `final_quiz.json, Frage ${i + 1}`;
    validateQuestion(q, where, errors);
    if (!learningGoals || !learningGoals[String(q.learning_goal)]) errors.push(`${where}: "learning_goal" unbekannt`);
  });
  return errors;
}

export function validateGame(data) {
  const errors = [];
  if (!data || typeof data.texts !== 'object') errors.push('game.json: "texts" fehlt');
  if (!data || typeof data.settings !== 'object') errors.push('game.json: "settings" fehlt');
  return errors;
}
