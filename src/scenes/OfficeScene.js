// The office: five chapter rooms + final hallway (Tiled map).
// Handles movement, collisions, NPC conversations, chapter intros, checkpoint doors,
// conflict cards, glossary, menu, final quiz, HUD and saving.
import { Player } from '../entities/Player.js';
import { Npc } from '../entities/Npc.js';
import { DialogSystem } from '../systems/DialogSystem.js';
import { QuestionRunner } from '../systems/QuestionRunner.js';
import { GlossarySystem } from '../systems/GlossarySystem.js';
import { toggleFullscreen } from '../systems/Fullscreen.js';
import { t } from '../systems/Texts.js';
import { COLORS } from './UIScene.js';

const ROOM_HEIGHT_PX = 13 * 16; // the camera zoom fits one room height into the window
const SAVE_POSITION_MS = 2000;

function prop(obj, name, fallback = undefined) {
  const p = (obj.properties || []).find((q) => q.name === name);
  return p ? p.value : fallback;
}

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super('OfficeScene');
  }

  create() {
    this.ready = false;
    this.settings = this.registry.get('settings');
    this.state = this.registry.get('state');
    this.content = this.registry.get('content');
    this.reducedMotion = this.registry.get('reducedMotion');
    this.chapters = this.content.chapters;

    // UI overlay runs in parallel and stays on top
    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.scene.bringToTop('UIScene');
    this.ui = this.scene.get('UIScene');

    this.buildMap();
    this.buildObjects();

    // --- Physics ---
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.furniture);
    this.npcs.forEach((n) => this.physics.add.collider(this.player, n));

    // --- Camera: fills the whole window, follows the player ---
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0b1020').setRoundPixels(true);
    cam.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    cam.startFollow(this.player, true, this.reducedMotion ? 1 : 0.2, this.reducedMotion ? 1 : 0.2);
    this.updateZoom();
    this.scale.on('resize', this.updateZoom, this);

    // --- Systems ---
    this.dialogs = new DialogSystem(this.ui, this.state, this.settings);
    this.questions = new QuestionRunner(this.ui, this.settings);
    this.glossary = new GlossarySystem(this.ui, this.state, this.content.glossary, this.settings.glossary_page_size);

    // --- Keys (ignored while a panel is open; OfficeScene receives key events before UIScene) ---
    const kb = this.input.keyboard;
    const handlers = {
      'keydown-ENTER': () => this.interact(),
      'keydown-SPACE': () => this.interact(),
      'keydown-NUMPAD_ENTER': () => this.interact(),
      'keydown-G': () => { if (this.canAct()) this.glossary.open(); },
      'keydown-ESC': () => { if (this.canAct()) this.openMenu(); },
    };
    Object.entries(handlers).forEach(([k, fn]) => kb.on(k, fn));
    this.events.once('shutdown', () => {
      Object.entries(handlers).forEach(([k, fn]) => kb.off(k, fn));
      this.scale.off('resize', this.updateZoom, this);
    });

    this.lastSave = 0;
    this.ready = true;
  }

  // ---------- setup ----------

  buildMap() {
    const map = this.make.tilemap({ key: 'office' });
    const tileset = map.addTilesetImage('office_tiles', 'tiles');
    map.createLayer('floor', tileset, 0, 0);
    this.walls = map.createLayer('walls', tileset, 0, 0);
    this.furniture = map.createLayer('furniture', tileset, 0, 0);
    this.walls.setCollisionByProperty({ collides: true });
    this.furniture.setCollisionByProperty({ collides: true });
    this.map = map;
    this.doorOpenGid = tileset.firstgid + this.tileIdByName(tileset, 'door_open');
  }

  buildObjects() {
    const objects = this.map.getObjectLayer('objects').objects;
    const byChapter = (name) => {
      const groups = {};
      for (const o of objects.filter((x) => x.name === name)) (groups[prop(o, 'chapter')] ||= []).push(o);
      Object.values(groups).forEach((g) => g.sort((a, b) => prop(a, 'slot') - prop(b, 'slot')));
      return groups;
    };

    // Rooms: chapter 1..n, the room after the last chapter is the final hallway
    this.rooms = objects.filter((o) => o.name === 'room').map((o) => {
      const number = prop(o, 'chapter');
      const chapter = this.chapters[number - 1] || null;
      return { rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height), number, chapter, key: chapter ? chapter.id : 'final' };
    });

    // Player
    const spawn = objects.find((o) => o.name === 'player_spawn');
    const pos = this.state.player || { x: spawn.x, y: spawn.y };
    this.player = new Player(this, pos.x, pos.y, this.settings.player_speed || 80);
    this.lastSavedPos = { ...pos };

    // NPCs: slot k of chapter room n shows conflict k of chapters[n-1]
    this.npcs = [];
    const npcSlots = byChapter('npc_slot');
    this.chapters.forEach((ch, i) => {
      const slots = npcSlots[i + 1] || [];
      ch.conflicts.forEach((id, k) => {
        const slot = slots[k];
        const conflict = this.content.conflicts[id];
        this.npcs.push(new Npc(this, slot.x, slot.y, prop(slot, 'sprite', 'npc_01'),
          { conflict, name: conflict.npc.name }, this.reducedMotion));
      });
    });
    const hostObj = objects.find((o) => o.name === 'quiz_host');
    if (hostObj) {
      this.host = new Npc(this, hostObj.x, hostObj.y, prop(hostObj, 'sprite', 'npc_06'),
        { isHost: true, name: this.content.finalQuiz.host.name }, this.reducedMotion);
      this.npcs.push(this.host);
    }

    // Conflict cards: card slot k of room n shows the k-th glossary entry of chapter n
    this.cards = [];
    const cardSlots = byChapter('card_slot');
    this.chapters.forEach((ch, i) => {
      const entries = this.content.glossary.filter((e) => e.chapter === i + 1);
      entries.forEach((entry, k) => {
        const slot = (cardSlots[i + 1] || [])[k];
        if (!slot || this.state.cards[entry.id]) return;
        const img = this.add.image(slot.x, slot.y, 'card').setDepth(5);
        if (!this.reducedMotion) {
          this.tweens.add({ targets: img, y: slot.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        this.cards.push({ entry, img, x: slot.x, y: slot.y });
      });
    });

    // Checkpoint doors between the rooms
    this.doors = objects.filter((o) => o.name === 'door').map((o) => ({
      x: o.x + o.width / 2,
      y: o.y + o.height / 2,
      tileX: Math.floor(o.x / this.map.tileWidth),
      tileY: Math.floor(o.y / this.map.tileHeight),
      chapter: this.chapters[prop(o, 'chapter') - 1],
      open: false,
    })).filter((d) => d.chapter);
    this.doors.forEach((d) => { if (this.state.doorsOpen[d.chapter.id]) this.openDoor(d); });
  }

  tileIdByName(tileset, name) {
    for (const [id, props] of Object.entries(tileset.tileProperties || {})) {
      if (props.name === name) return Number(id);
    }
    throw new Error(`Tile "${name}" not found in tileset`);
  }

  updateZoom() {
    const { height } = this.scale;
    // Fit one room height into the window; at least 2x so the pixel art stays readable.
    this.cameras.main.setZoom(Math.max(2, height / ROOM_HEIGHT_PX));
  }

  // ---------- helpers ----------

  canAct() {
    return this.ready && this.ui.ready && !this.ui.isBusy();
  }

  roomAt(x, y) {
    return this.rooms.find((r) => r.rect.contains(x, y)) || null;
  }

  openConflicts(chapter) {
    return chapter.conflicts.filter((id) => !this.state.conflict(id).done);
  }

  // Closest NPC or closed door within range, or null.
  findTarget() {
    const range = this.settings.interaction_range || 22;
    const candidates = [
      ...this.npcs.map((n) => ({ kind: 'npc', ref: n, x: n.x, y: n.y })),
      ...this.doors.filter((d) => !d.open).map((d) => ({ kind: 'door', ref: d, x: d.x, y: d.y })),
    ];
    let best = null;
    let bestDist = range;
    for (const c of candidates) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist <= bestDist) { best = c; bestDist = dist; }
    }
    return best;
  }

  // ---------- interaction ----------

  interact() {
    if (!this.canAct()) return;
    const target = this.findTarget();
    if (!target) return;
    this.player.stop();

    if (target.kind === 'npc') {
      const npc = target.ref;
      npc.faceTowards(this.player.x, this.player.y);
      if (npc.isHost) this.talkToHost();
      else this.dialogs.start(npc.conflict, () => this.onConflictDone(npc));
      return;
    }
    this.useDoor(target.ref);
  }

  onConflictDone(npc) {
    npc.setOpen(false);
    const chapter = this.chapters.find((c) => c.conflicts.includes(npc.conflict.id));
    const done = chapter.conflicts.length - this.openConflicts(chapter).length;
    this.ui.toast(t('case_done', { done, total: chapter.conflicts.length }));
  }

  useDoor(door) {
    const chapter = door.chapter;
    const open = this.openConflicts(chapter).length;
    if (open > 0) {
      this.ui.showPanel({
        sections: [{ text: t('door_locked', { open }) }],
        choices: [{ label: t('close') }],
        closable: true,
      });
      return;
    }
    this.questions.run({
      questions: chapter.checkpoint,
      mode: 'checkpoint',
      title: (n, total) => t('checkpoint_title', { n, total }),
      closable: true,
      onDone: (result) => {
        Object.assign(this.state.checkpoint(chapter.id), { passed: true, firstTryCorrect: result.firstTry, total: result.total });
        this.state.doorsOpen[chapter.id] = true;
        this.state.save();
        this.ui.showPanel({
          heading: t('correct'),
          headingColor: COLORS.good,
          sections: [{ text: t('door_opens') }],
          choices: [{ label: t('continue') }],
          onChoose: () => this.openDoor(door),
        });
      },
    });
  }

  openDoor(door) {
    if (door.open) return;
    door.open = true;
    const tile = this.walls.putTileAt(this.doorOpenGid, door.tileX, door.tileY);
    tile.setCollision(false, false, false, false);
  }

  showRoomIntro(room) {
    this.state.chaptersSeen[room.key] = true;
    this.state.save();
    if (room.chapter) {
      const ch = room.chapter;
      this.ui.showPanel({
        heading: t('chapter_heading', { n: ch.number || room.number, title: ch.title }),
        sections: [
          { text: t('chapter_room', { room: ch.room }), color: COLORS.muted },
          { label: t('chapter_goal'), text: this.content.learningGoals[String(ch.learning_goal)] || '' },
          { text: ch.intro },
        ],
        choices: [{ label: t('continue') }],
        closable: true,
      });
    } else {
      this.ui.showPanel({
        heading: t('final_heading'),
        sections: [{ text: t('final_intro', { host: this.content.finalQuiz.host.name }) }],
        choices: [{ label: t('continue') }],
        closable: true,
      });
    }
  }

  collectCard(card) {
    this.state.cards[card.entry.id] = true;
    this.state.save();
    card.img.destroy();
    this.cards = this.cards.filter((c) => c !== card);
    this.ui.toast(t('card_found', { term: card.entry.term }));
  }

  // ---------- final quiz ----------

  talkToHost() {
    const fq = this.content.finalQuiz;
    if (this.state.quiz) {
      this.showResults();
      return;
    }
    this.ui.showPanel({
      heading: `${fq.host.name}${fq.host.role ? ', ' + fq.host.role : ''}`,
      sections: [{ text: fq.intro }],
      choices: [{ label: t('quiz_start') }, { label: t('quiz_later') }],
      closable: true,
      onChoose: (i) => { if (i === 0) this.runQuiz(); },
    });
  }

  runQuiz() {
    const questions = this.content.finalQuiz.questions;
    this.questions.run({
      questions,
      mode: 'quiz',
      title: (n, total) => t('quiz_title', { n, total }),
      closable: false,
      onDone: (result) => {
        const byGoal = {};
        questions.forEach((q, i) => {
          const g = (byGoal[q.learning_goal] ||= { correct: 0, total: 0 });
          g.total += 1;
          if (result.perQuestion[i]) g.correct += 1;
        });
        this.state.quiz = { correct: result.firstTry, total: result.total, byGoal };
        this.state.save();
        this.showResults();
      },
    });
  }

  gameStats() {
    const ids = this.chapters.flatMap((c) => c.conflicts);
    const good = ids.filter((id) => this.state.conflict(id).firstChoiceCorrect === true).length;
    const cps = Object.values(this.state.checkpoints);
    return {
      good,
      cases: ids.length,
      first: cps.reduce((sum, c) => sum + (c.firstTryCorrect || 0), 0),
      questions: cps.reduce((sum, c) => sum + (c.total || 0), 0),
      cards: Object.keys(this.state.cards).length,
      cardsTotal: this.content.glossary.length,
    };
  }

  showResults() {
    const q = this.state.quiz;
    const percent = Math.round((q.correct / q.total) * 100);
    const feedback = percent >= 80 ? t('result_feedback_high') : percent >= 50 ? t('result_feedback_mid') : t('result_feedback_low');
    const goals = Object.keys(this.content.learningGoals).sort();
    const goalLines = goals.filter((g) => q.byGoal[g]).map((g) => t('result_goal_line', {
      n: g, label: this.content.learningGoals[g], correct: q.byGoal[g].correct, total: q.byGoal[g].total,
    }));
    this.ui.showPanel({
      heading: t('result_title'),
      sections: [
        { text: t('result_score', { correct: q.correct, total: q.total, percent }), color: percent >= 50 ? COLORS.good : COLORS.bad },
        { text: feedback },
        { label: t('result_by_goal'), text: goalLines.join('\n') },
        { label: t('result_game'), text: t('result_game_line', this.gameStats()) },
      ],
      choices: [{ label: t('quiz_repeat') }, { label: t('show_glossary') }, { label: t('menu_restart') }, { label: t('close') }],
      closable: true,
      onChoose: (i) => {
        if (i === 0) this.runQuiz();
        else if (i === 1) this.glossary.open();
        else if (i === 2) this.confirmRestart();
      },
    });
  }

  // ---------- menu ----------

  openMenu() {
    const motion = this.reducedMotion ? t('on') : t('off');
    this.ui.showPanel({
      heading: t('menu_title'),
      sections: [],
      choices: [
        { label: t('menu_resume') },
        { label: t('menu_glossary') },
        { label: t('menu_controls') },
        { label: t('menu_fullscreen') },
        { label: t('menu_motion', { state: motion }) },
        { label: t('menu_restart') },
      ],
      closable: true,
      onChoose: (i) => {
        if (i === 1) this.glossary.open();
        else if (i === 2) this.ui.showPanel({
          heading: t('controls_title'),
          sections: [{ text: t('controls').join('\n') }],
          choices: [{ label: t('close') }],
          closable: true,
          onChoose: () => this.openMenu(),
        });
        else if (i === 3) toggleFullscreen(this.game);
        else if (i === 4) {
          this.reducedMotion = !this.reducedMotion;
          this.registry.set('reducedMotion', this.reducedMotion);
          this.openMenu();
        } else if (i === 5) this.confirmRestart();
      },
    });
  }

  confirmRestart() {
    this.ui.showPanel({
      heading: t('menu_restart'),
      sections: [{ text: t('confirm_restart') }],
      choices: [{ label: t('cancel') }, { label: t('yes_restart'), color: COLORS.bad }],
      closable: true,
      onChoose: (i) => {
        if (i !== 1) return;
        this.state.clear();
        this.ui.clearHud();
        this.ui.setPrompt(null);
        this.scene.restart();
      },
    });
  }

  // ---------- per frame ----------

  hudData(room) {
    const cardsFound = Object.keys(this.state.cards).length;
    const cardsTotal = this.content.glossary.length;
    if (!room) return { chapter: null, progress: null, objective: null };
    const host = this.content.finalQuiz.host.name;
    if (!room.chapter) {
      return {
        chapter: t('hud_final'),
        progress: t('hud_progress', {
          done: this.chapters.flatMap((c) => c.conflicts).filter((id) => this.state.conflict(id).done).length,
          total: this.chapters.flatMap((c) => c.conflicts).length,
          cards: cardsFound, cardsTotal,
        }),
        objective: this.state.quiz ? t('objective_done', { host }) : t('objective_quiz', { host }),
      };
    }
    const ch = room.chapter;
    const open = this.openConflicts(ch).length;
    let objective;
    if (open > 0) objective = t('objective_talk_room', { open });
    else if (!this.state.doorsOpen[ch.id]) objective = t('objective_checkpoint');
    else objective = t('objective_next');
    return {
      chapter: t('hud_chapter', { n: ch.number || room.number, total: this.chapters.length, title: ch.title }),
      progress: t('hud_progress', { done: ch.conflicts.length - open, total: ch.conflicts.length, cards: cardsFound, cardsTotal }),
      objective,
    };
  }

  promptText() {
    const target = this.findTarget();
    if (!target) return null;
    if (target.kind === 'npc') return t('prompt_talk', { npc: target.ref.displayName });
    return t('prompt_door');
  }

  update(time) {
    if (!this.ready || !this.ui.ready) return;
    this.npcs.forEach((n) => n.setOpen(n.isHost ? !this.state.quiz : !this.state.conflict(n.conflict.id).done));

    const room = this.roomAt(this.player.x, this.player.y);
    this.ui.setHud(this.hudData(room));

    if (this.ui.isBusy()) {
      this.player.stop();
      this.ui.setPrompt(null);
      return;
    }
    if (room && !this.state.chaptersSeen[room.key]) {
      this.player.stop();
      this.showRoomIntro(room);
      return;
    }

    this.player.update(this.reducedMotion);
    this.ui.setPrompt(this.promptText());

    for (const card of this.cards) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, card.x, card.y) < 10) {
        this.collectCard(card);
        break;
      }
    }

    if (time - this.lastSave > SAVE_POSITION_MS) {
      this.lastSave = time;
      const p = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      if (Math.abs(p.x - this.lastSavedPos.x) + Math.abs(p.y - this.lastSavedPos.y) > 4) {
        this.state.player = p;
        this.lastSavedPos = p;
        this.state.save();
      }
    }
  }
}
