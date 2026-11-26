// Automated end-to-end test, only loaded with ?autotest in the URL.
// Plays the whole game with synthetic keyboard events (the same path as real key presses):
// all chapters, all conflicts, all checkpoint doors, cards, glossary, menu, final quiz,
// saving, window resize and restart. The result is written into document.title and
// a <pre id="autotest"> element. Uses its own save slot (…_autotest).

const KEYS = {
  Enter: 13, Space: 32, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyG: 71,
  Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57,
};
const T = 16;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function keyEvent(type, code) {
  const key = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Key') ? code.slice(3).toLowerCase()
    : code === 'Space' ? ' ' : code;
  const ev = new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'keyCode', { get: () => KEYS[code] });
  Object.defineProperty(ev, 'which', { get: () => KEYS[code] });
  window.dispatchEvent(ev);
}

async function press(code, holdMs = 50) {
  keyEvent('keydown', code);
  await sleep(holdMs);
  keyEvent('keyup', code);
  await sleep(230); // longer than the UI input lock
}

async function waitFor(fn, timeout = 6000) {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    const v = fn();
    if (v) return v;
    await sleep(40);
  }
  return null;
}

export async function runAutoTest(game) {
  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); return !!ok; };
  const out = document.createElement('pre');
  out.id = 'autotest';
  document.body.appendChild(out);

  let office;
  let ui;
  const p = () => office.player;
  const teleport = (x, y) => p().body.reset(x, y);
  const teleportTile = (tx, ty) => teleport(tx * T + T / 2, ty * T + T / 2);
  const text = () => ui.panelText();
  const choiceIndex = (label) => (ui.panel ? ui.panel.choices.findIndex((c) => c.label === label) : -1);
  async function pick(label) {
    const i = choiceIndex(label);
    if (i < 0) throw new Error(`Choice not found: "${label}" in panel:\n${text()}`);
    await press(`Digit${i + 1}`);
  }
  // Teleport to a free tile next to an NPC
  function standNear(npc) {
    const tx = Math.floor(npc.x / T);
    const ty = Math.floor(npc.y / T);
    const occupied = new Set(office.npcs.map((n) => `${Math.floor(n.x / T)},${Math.floor(n.y / T)}`));
    for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
      const x = tx + dx;
      const y = ty + dy;
      const w = office.walls.getTileAt(x, y);
      const f = office.furniture.getTileAt(x, y);
      if ((w && w.collides) || (f && f.collides) || occupied.has(`${x},${y}`)) continue;
      teleportTile(x, y);
      return true;
    }
    throw new Error(`No free tile next to NPC ${npc.displayName}`);
  }
  async function dismissIntro(expected) {
    const shown = await waitFor(() => ui.isBusy() && text().includes(expected), 3000);
    check(`Intro shown: ${expected}`, shown, text());
    await sleep(250); // the UI ignores keys for 180 ms after a panel opens
    await press('Enter');
  }

  try {
    // --- Start screen ---
    const start = await waitFor(() => game.scene.isActive('StartScene'));
    check('Start screen visible after loading', start, (window.__contentErrors || []).join('; '));
    check('Canvas fills the whole window (no borders)',
      game.scale.width === window.innerWidth && game.scale.height === window.innerHeight,
      `${game.scale.width}x${game.scale.height} vs ${window.innerWidth}x${window.innerHeight}`);
    await press('Enter');
    office = await waitFor(() => {
      const s = game.scene.getScene('OfficeScene');
      const u = game.scene.getScene('UIScene');
      return s && s.ready && u && u.ready && s;
    });
    check('Enter starts the game', office);
    ui = game.scene.getScene('UIScene');
    // Debug log of panel activity, included in failure details
    const log = [];
    window.__panelLog = log;
    const origShow = ui.showPanel.bind(ui);
    ui.showPanel = (spec) => { log.push(`show@${Math.round(ui.time.now)}:${spec.heading || (spec.sections[0] || {}).text || ''}`.slice(0, 80)); origShow(spec); };
    const origInteract = office.interact.bind(office);
    office.interact = () => { log.push(`interact@${Math.round(office.time.now)} canAct=${office.canAct()}`); origInteract(); };
    const content = office.content;
    const chapters = content.chapters;

    await dismissIntro('Kapitel 1');
    await sleep(100);
    check('HUD shows chapter and progress', ui.hud.visible && ui.hud.text.includes('Kapitel 1 von 5') && ui.hud.text.includes('Fälle 0/4'), ui.hud.text);

    // --- F1 movement and collision (room 1) ---
    teleportTile(7, 7);
    let x0 = p().x;
    await press('ArrowRight', 350);
    check('F1 arrow key moves player', p().x > x0 + 5, `dx=${(p().x - x0).toFixed(1)}`);
    let y0 = p().y;
    await press('KeyW', 350);
    check('F1 W key moves player', p().y < y0 - 5, `dy=${(p().y - y0).toFixed(1)}`);
    teleportTile(1, 7);
    await press('ArrowLeft', 600);
    check('F1 wall blocks the player', p().x >= 16 + 4, `x=${p().x.toFixed(1)}`);
    teleport(56, 104);
    await press('ArrowUp', 600);
    check('F1 furniture blocks the player', p().y > 90, `y=${p().y.toFixed(1)}`);

    // --- Locked door, menu, card, glossary ---
    teleportTile(14, 6);
    await sleep(80);
    await press('Enter');
    check('F6 chapter door locked while cases are open', text().includes('verschlossen'), text());
    await press('Escape');
    check('Esc closes a panel', !ui.isBusy());
    await press('Escape');
    check('Esc opens the menu', text().includes('Menü') && text().includes('Glossar'), text());
    await press('Escape');
    const card = office.cards[0];
    teleport(card.x, card.y);
    const got = await waitFor(() => office.state.cards[card.entry.id], 2000);
    check('F9 walking over a card collects it', got && ui.toastText.visible && ui.toastText.text.includes(card.entry.term));
    await press('KeyG');
    check('F9 G opens glossary with collected term', text().includes('Glossar') && text().includes(card.entry.definition), text());
    await press('Escape');

    // --- All chapters ---
    let firstCase = true;
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      const x0Room = ci * 15;
      if (ci > 0 && !office.state.chaptersSeen[ch.id]) {
        teleportTile(x0Room + 1, 6);
        await dismissIntro(`Kapitel ${ci + 1}`);
      }
      for (const id of ch.conflicts) {
        const conflict = content.conflicts[id];
        const npc = office.npcs.find((n) => n.conflict && n.conflict.id === id);
        standNear(npc);
        await sleep(80);
        await press('Enter');
        if (!check(`[${id}] dialog opens with situation`, text().includes(conflict.situation), `${text()} pos=${p().x.toFixed(0)},${p().y.toFixed(0)} npc=${npc.x},${npc.y} target=${(office.findTarget() || {}).kind} busy=${ui.isBusy()} room=${(office.roomAt(p().x, p().y) || {}).number} log=${log.slice(-6).join(" | ")}`)) break;
        await press('Enter');
        check(`[${id}] all options listed`, conflict.options.every((o) => choiceIndex(o.text) >= 0));
        const right = conflict.options.find((o) => o.correct);
        if (firstCase) {
          const wrong = conflict.options.find((o) => !o.correct);
          await pick(wrong.text);
          check('F4 wrong option -> consequence + "Ungünstige Reaktion"', text().includes(wrong.consequence) && text().includes('Ungünstige Reaktion'));
          await press('ArrowDown');
          await press('Enter');
          check('F4 other options show the good consequence', text().includes(right.consequence));
          await press('Enter');
        } else {
          await pick(right.text);
          check(`[${id}] correct option -> "Gute Reaktion"`, text().includes('Gute Reaktion') && text().includes(right.consequence));
          await press('Digit1');
        }
        const th = conflict.theory;
        check(`[${id}] F5 theory shown`, text().includes(th.model) && text().includes(th.summary) && text().includes(th.example));
        await press('Enter');
        for (const q of conflict.checkpoints) {
          check(`[${id}] short question shown`, text().includes(q.question), text());
          await pick(q.answers[q.correct_index]);
          check(`[${id}] F7 correct -> "Richtig!" + explanation`, text().includes('Richtig!') && text().includes(q.explanation));
          await press('Enter');
        }
        check(`[${id}] case completed`, !ui.isBusy() && office.state.conflict(id).done && !npc.marker.visible);
        firstCase = false;
      }

      // Chapter checkpoint door
      const door = office.doors[ci];
      teleportTile(door.tileX - 1, door.tileY);
      await sleep(80);
      await press('Enter');
      for (let qi = 0; qi < ch.checkpoint.length; qi++) {
        const q = ch.checkpoint[qi];
        check(`[${ch.id}] checkpoint question ${qi + 1} shown`, text().includes(q.question), text());
        if (ci === 0 && qi === 0) {
          const wrongs = q.answers.filter((_, k) => k !== q.correct_index);
          await pick(wrongs[0]);
          check('F7 wrong -> "Leider falsch" + explanation', text().includes('Leider falsch') && text().includes(q.explanation));
          await press('Enter');
          check('F6 retry: wrong answer disabled', ui.panel.choices[choiceIndex(wrongs[0])].disabled);
          await pick(wrongs[1]);
          check('F6 after 2nd wrong answer the correct one is shown', text().includes(q.answers[q.correct_index]));
          await press('Enter');
        } else {
          await pick(q.answers[q.correct_index]);
          await press('Enter');
        }
      }
      check(`[${ch.id}] door-opens message`, text().includes('Tür zum nächsten Raum'), text());
      await press('Enter');
      const tile = office.walls.getTileAt(door.tileX, door.tileY);
      check(`[${ch.id}] door open and passable`, door.open && !tile.collides);

      if (ci === 0) {
        teleportTile(door.tileX - 1, door.tileY);
        await press('ArrowRight', 650);
        check('Walking through the door enters room 2', office.roomAt(p().x, p().y).number === 2, `x=${p().x.toFixed(1)}`);
        await dismissIntro('Kapitel 2');
      }
    }

    // --- Final hallway and quiz ---
    teleportTile(5 * 15 + 1, 6);
    await dismissIntro('Abschlussquiz');
    standNear(office.host);
    await sleep(80);
    await press('Enter');
    check('Quiz host offers the final quiz', text().includes(content.finalQuiz.intro), text());
    await pick('Quiz starten');
    const qs = content.finalQuiz.questions;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!check(`Final quiz question ${i + 1} shown`, text().includes(q.question), text())) break;
      const answer = i < qs.length - 2 ? q.answers[q.correct_index] : q.answers.find((_, k) => k !== q.correct_index);
      await pick(answer);
      check(`Final quiz feedback ${i + 1}`, text().includes(i < qs.length - 2 ? 'Richtig!' : 'Leider falsch') && text().includes(q.explanation));
      await press('Enter');
    }
    const total = qs.length;
    check('F8 result shows score and percent', text().includes(`${total - 2} von ${total} richtig`) && text().includes('%'), text());
    check('F8 result lists every learning goal', [1, 2, 3, 4, 5].every((g) => text().includes(`LZ ${g}`)), text());
    check('Result shows game statistics', text().includes('Gute erste Reaktionen: 19/20') && text().includes('Karten: 1/'), text());

    // --- Save (F10) ---
    const raw = localStorage.getItem(office.state.saveKey);
    const saved = raw && JSON.parse(raw);
    check('F10 progress saved in localStorage', saved && saved.quiz && saved.quiz.correct === total - 2 && Object.keys(saved.doorsOpen).length === 5);

    // --- Resize keeps the panel inside the window ---
    // Phaser's RESIZE mode follows the size of the #game element, like a window resize does.
    const host = document.getElementById('game');
    const setSize = async (w, h) => {
      host.style.width = w ? w + 'px' : '';
      host.style.height = h ? h + 'px' : '';
      window.dispatchEvent(new Event('resize'));
      await waitFor(() => (!w || game.scale.width === w) && (!h || game.scale.height === h), 3000);
      await sleep(200);
    };
    await setSize(800, 560);
    const b = ui.panelBounds;
    check('Resize: canvas follows the window size', game.scale.width === 800 && game.scale.height === 560, `${game.scale.width}x${game.scale.height}`);
    check('Resize: panel re-rendered inside the smaller window', ui.isBusy() && b.x >= 0 && b.x + b.width <= 800 && b.y >= 0 && b.y + b.height <= 560, JSON.stringify(b));
    await setSize(1600, 900);
    check('Resize: camera zoom fills the room height', Math.abs(office.cameras.main.zoom - 900 / 208) < 0.01, `zoom=${office.cameras.main.zoom}`);
    await setSize(null, null);

    // --- Restart ---
    await pick('Neues Spiel beginnen');
    check('Restart asks for confirmation', text().includes('wirklich'), text());
    await pick('Ja, neu beginnen');
    const restarted = await waitFor(() => office.ready && !office.state.quiz && office.doors && !office.doors[0].open && office);
    check('Restart resets progress (doors closed, quiz cleared)', restarted);
    await dismissIntro('Kapitel 1');
  } catch (err) {
    check('No exception during test', false, String((err && err.stack) || err));
  }

  const passed = results.filter((r) => r.ok).length;
  const summary = `AUTOTEST ${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`;
  out.textContent = [summary, ...results.filter((r) => !r.ok).map((r) => `FAIL ${r.name}  -> ${r.detail}`),
    ...results.filter((r) => r.ok).map((r) => `OK   ${r.name}`)].join('\n');
  document.title = summary;
  console.log(out.textContent);
}
