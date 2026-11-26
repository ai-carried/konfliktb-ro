// Loads map, graphics and content files, validates the content and creates animations.
import {
  validateConflicts, validateChapters, validateGlossary, validateFinalQuiz, validateGame,
} from '../systems/ContentLoader.js';
import { setTexts } from '../systems/Texts.js';
import { GameState } from '../systems/GameState.js';
import { versioned, AUTOTEST } from '../systems/Version.js';

export const NPC_SPRITE_COUNT = 12;
export const CHARACTER_SHEETS = [
  'player',
  ...Array.from({ length: NPC_SPRITE_COUNT }, (_, i) => 'npc_' + String(i + 1).padStart(2, '0')),
];
export const DIRECTIONS = ['down', 'left', 'right', 'up']; // row order in the sprite sheets

const CONTENT_FILES = ['game', 'conflicts', 'chapters', 'glossary', 'final_quiz'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2, 'Lade …', {
      fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: '#ffffff', resolution: 2,
    }).setOrigin(0.5);
    this.load.on('progress', (p) => label.setText(`Lade … ${Math.round(p * 100)} %`));

    for (const key of CONTENT_FILES) this.load.json(key, versioned(`content/${key}.json`));
    this.load.tilemapTiledJSON('office', versioned('assets/maps/office.tmj'));
    this.load.image('tiles', versioned('assets/sprites/office_tiles.png'));
    this.load.image('card', versioned('assets/sprites/card.png'));
    for (const key of CHARACTER_SHEETS) {
      this.load.spritesheet(key, versioned(`assets/sprites/${key}.png`), { frameWidth: 16, frameHeight: 16 });
    }
    this.loadErrors = [];
    this.load.on('loaderror', (file) => this.loadErrors.push(`Datei konnte nicht geladen werden: ${file.src}`));
  }

  // Smallest number of slots of a given type per chapter room in the Tiled map.
  minSlots(objectName) {
    const map = this.cache.tilemap.get('office');
    const layer = map && map.data.layers.find((l) => l.name === 'objects');
    if (!layer) return 0;
    const counts = {};
    for (const o of layer.objects) {
      if (o.name !== objectName) continue;
      const ch = (o.properties || []).find((p) => p.name === 'chapter');
      if (ch) counts[ch.value] = (counts[ch.value] || 0) + 1;
    }
    const values = Object.values(counts);
    return values.length ? Math.min(...values) : 0;
  }

  create() {
    if (this.loadErrors.length) return this.showErrors(this.loadErrors);

    const c = Object.fromEntries(CONTENT_FILES.map((k) => [k, this.cache.json.get(k)]));
    let errors = [...validateGame(c.game), ...validateConflicts(c.conflicts)];
    if (!errors.length) {
      const ids = new Set(c.conflicts.conflicts.map((x) => x.id));
      errors = [
        ...validateChapters(c.chapters, ids, this.minSlots('npc_slot')),
        ...validateGlossary(c.glossary, (c.chapters.chapters || []).length, this.minSlots('card_slot')),
        ...validateFinalQuiz(c.final_quiz, c.chapters.learning_goals),
      ];
    }
    if (errors.length) return this.showErrors(errors);

    setTexts(c.game.texts);
    const settings = c.game.settings;
    this.registry.set('settings', settings);
    this.registry.set('content', {
      chapters: c.chapters.chapters,
      learningGoals: c.chapters.learning_goals,
      conflicts: Object.fromEntries(c.conflicts.conflicts.map((x) => [x.id, x])),
      glossary: c.glossary.entries,
      finalQuiz: c.final_quiz,
    });

    // The automated test uses its own save slot so it never touches a real save.
    const state = new GameState((settings.save_key || 'streit9uhr_save') + (AUTOTEST ? '_autotest' : ''));
    if (AUTOTEST) state.clear();
    else state.load();
    this.registry.set('state', state);

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.registry.set('reducedMotion', prefersReduced);

    // Crisp pixel art for map and characters (text stays smooth)
    for (const key of ['tiles', 'card', ...CHARACTER_SHEETS]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // Walk animations: frames per row are [stand, step1, step2]
    for (const key of CHARACTER_SHEETS) {
      DIRECTIONS.forEach((dir, row) => {
        this.anims.create({
          key: `${key}-walk-${dir}`,
          frames: this.anims.generateFrameNumbers(key, { frames: [row * 3 + 1, row * 3, row * 3 + 2, row * 3] }),
          frameRate: 8,
          repeat: -1,
        });
      });
    }

    this.scene.start('StartScene');
  }

  showErrors(errors) {
    this.children.removeAll();
    this.add.text(40, 40, ['Die Inhaltsdateien enthalten Fehler:', '', ...errors.map((e) => '• ' + e)], {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffb4b4',
      wordWrap: { width: this.scale.width - 80 }, resolution: 2,
    });
    console.error('Content errors:', errors);
    window.__contentErrors = errors;
  }
}
