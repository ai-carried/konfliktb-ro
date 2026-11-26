// Access to all player-facing UI strings from content/game.json.
// Usage: t('prompt_talk', { npc: 'Lena' }) -> "Enter: mit Lena sprechen"

let texts = {};

export function setTexts(newTexts) {
  texts = newTexts || {};
}

export function t(key, vars = {}) {
  const value = texts[key];
  if (value === undefined) return `[${key}]`; // visible marker for missing strings
  if (Array.isArray(value)) return value;
  return String(value).replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match
  );
}
