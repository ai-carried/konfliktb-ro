// Generates the office map as a Tiled JSON map (.tmj, Tiled 1.10 format).
// Five chapter rooms + a final hallway, connected by checkpoint doors (left to right).
// The map contains only *slots* (npc_slot, card_slot); which conflict or glossary card
// appears in a slot is decided at runtime from content/*.json. The map can be edited in Tiled.
// Run after build_assets.js: node tools/build_map.js

const fs = require('fs');
const path = require('path');

const meta = require('./tiles_meta.json');
const T = 16;
const ROOM_W = 15; // rooms share their side walls: room i spans columns i*15 .. i*15+15
const ROOMS = 6;
const W = ROOMS * ROOM_W + 1;
const H = 13;
const DOOR_Y = 6;
const NPC_SPRITES = 12;

const G = Object.fromEntries(meta.map((t) => [t.name, t.id + 1]));
const layer = () => new Array(W * H).fill(0);
const floor = layer();
const walls = layer();
const furniture = layer();
const put = (l, x, y, name) => {
  if (!G[name]) throw new Error(`Unknown tile ${name}`);
  l[y * W + x] = G[name];
};

// Room templates in local coordinates (interior x 1..14, y 2..11; wall decor on y = 1).
// Keep row DOOR_Y free next to the doors (x = 1 and x = 14).
const TEMPLATES = [
  { // 1 Teambüro
    floor: 'floor',
    decor: { 3: 'window', 7: 'whiteboard', 11: 'window', 13: 'shelf' },
    items: [
      ...[[3, 4], [4, 4], [3, 9], [4, 9], [10, 4], [11, 4], [10, 9], [11, 9]].flatMap(([x, y]) => [[x, y, 'desk'], [x, y + 1, 'chair']]),
      [1, 2, 'plant'], [14, 2, 'plant'], [1, 11, 'plant'], [14, 11, 'plant'],
    ],
    npcs: [[7, 3], [7, 10], [12, 7], [2, 8]],
    cards: [[5, 7], [9, 2], [13, 11], [1, 4], [8, 11], [12, 3]],
  },
  { // 2 Besprechungsraum
    floor: 'carpet',
    decor: { 3: 'flipchart', 7: 'whiteboard', 10: 'clock', 12: 'window' },
    items: [
      ...[5, 6, 7, 8, 9, 10].flatMap((x) => [5, 6, 7, 8].map((y) => [x, y, 'table'])),
      [5, 4, 'chair'], [7, 4, 'chair'], [9, 4, 'chair'], [6, 9, 'chair'], [8, 9, 'chair'], [10, 9, 'chair'],
      [1, 2, 'plant'], [14, 2, 'plant'], [1, 11, 'water_cooler'],
    ],
    npcs: [[3, 4], [12, 4], [3, 10], [12, 10]],
    cards: [[2, 7], [13, 8], [11, 2], [4, 11], [8, 2], [9, 11]],
  },
  { // 3 Kaffeeküche
    floor: 'kitchen',
    decor: { 4: 'window', 8: 'clock', 11: 'window' },
    items: [
      [2, 2, 'counter'], [3, 2, 'counter'], [4, 2, 'coffee_machine'], [5, 2, 'counter'], [6, 2, 'counter'], [7, 2, 'fridge'],
      [4, 7, 'table'], [10, 7, 'table'], [3, 7, 'chair'], [5, 7, 'chair'], [9, 7, 'chair'], [11, 7, 'chair'],
      [11, 10, 'sofa'], [12, 10, 'sofa'], [14, 2, 'plant'], [1, 11, 'plant'],
    ],
    npcs: [[7, 4], [12, 4], [7, 10], [2, 5]],
    cards: [[13, 6], [1, 8], [8, 8], [5, 11], [13, 11], [10, 3]],
  },
  { // 4 Projektleitungsbüro
    floor: 'dark_floor',
    decor: { 2: 'shelf', 3: 'shelf', 6: 'clock', 9: 'window', 12: 'whiteboard' },
    items: [
      [6, 4, 'desk'], [7, 4, 'desk'], [8, 4, 'desk'], [7, 3, 'chair'],
      [2, 10, 'sofa'], [3, 10, 'sofa'], [11, 9, 'table'], [10, 9, 'chair'], [12, 9, 'chair'],
      [1, 2, 'plant'], [14, 11, 'plant'],
    ],
    npcs: [[4, 6], [10, 5], [6, 10], [13, 4]],
    cards: [[2, 4], [12, 11], [9, 8], [5, 8], [13, 7], [8, 11]],
  },
  { // 5 Auftraggeber-Raum
    floor: 'dark_floor',
    decor: { 3: 'window', 6: 'window', 9: 'flipchart', 12: 'window' },
    items: [
      ...[5, 6, 7, 8, 9].flatMap((x) => [[x, 6, 'table'], [x, 7, 'table']]),
      [5, 5, 'chair'], [7, 5, 'chair'], [9, 5, 'chair'], [5, 8, 'chair'], [7, 8, 'chair'], [9, 8, 'chair'],
      [1, 2, 'plant'], [14, 2, 'plant'], [1, 11, 'plant'], [14, 11, 'plant'],
    ],
    npcs: [[3, 4], [12, 4], [3, 10], [12, 10]],
    cards: [[2, 7], [12, 7], [7, 3], [7, 10], [10, 11], [4, 2]],
  },
  { // 6 Flur (final quiz)
    floor: 'corridor',
    decor: { 4: 'window', 8: 'exit_sign', 12: 'window' },
    items: [[1, 2, 'plant'], [14, 2, 'plant'], [1, 11, 'plant'], [14, 11, 'plant'], [5, 2, 'water_cooler'], [10, 10, 'sofa'], [11, 10, 'sofa']],
    npcs: [],
    cards: [],
    quizHost: [8, 5],
  },
];

let nextId = 1;
const prop = (name, value) => ({
  name, value,
  type: typeof value === 'boolean' ? 'bool' : Number.isInteger(value) ? 'int' : 'string',
});
const point = (name, x, y, properties = []) => ({
  id: nextId++, name, type: '', point: true, rotation: 0, visible: true,
  x: x * T + T / 2, y: y * T + T / 2, width: 0, height: 0, properties,
});
const area = (name, x, y, w, h, properties = []) => ({
  id: nextId++, name, type: '', rotation: 0, visible: true,
  x: x * T, y: y * T, width: w * T, height: h * T, properties,
});

const objects = [];
let spriteCounter = 0;
const nextSprite = () => 'npc_' + String((spriteCounter++ % NPC_SPRITES) + 1).padStart(2, '0');

TEMPLATES.forEach((tpl, i) => {
  const x0 = i * ROOM_W;
  const chapter = i + 1;

  // Walls: top, bottom, sides (shared with neighbours)
  for (let x = x0; x <= x0 + ROOM_W; x++) { put(walls, x, 0, 'wall_top'); put(walls, x, H - 1, 'wall_top'); }
  for (let y = 1; y < H - 1; y++) { put(walls, x0, y, 'wall_top'); put(walls, x0 + ROOM_W, y, 'wall_top'); }
  for (let x = 1; x < ROOM_W; x++) put(walls, x0 + x, 1, tpl.decor[x] || 'wall_front');
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < ROOM_W; x++) put(floor, x0 + x, y, tpl.floor);
  for (const [x, y, name] of tpl.items) put(furniture, x0 + x, y, name);

  objects.push(area('room', x0, 0, ROOM_W + 1, H, [prop('chapter', chapter)]));
  tpl.npcs.forEach(([x, y], slot) =>
    objects.push(point('npc_slot', x0 + x, y, [prop('chapter', chapter), prop('slot', slot), prop('sprite', nextSprite())])));
  tpl.cards.forEach(([x, y], slot) =>
    objects.push(point('card_slot', x0 + x, y, [prop('chapter', chapter), prop('slot', slot)])));
  if (tpl.quizHost) objects.push(point('quiz_host', x0 + tpl.quizHost[0], tpl.quizHost[1], [prop('sprite', 'npc_06')]));
});

// Checkpoint doors in the shared walls (second pass, so the next room's wall does not overwrite them)
for (let i = 0; i < ROOMS - 1; i++) {
  const x = i * ROOM_W + ROOM_W;
  put(walls, x, DOOR_Y, 'door_closed');
  put(floor, x, DOOR_Y, 'corridor');
  objects.push(area('door', x, DOOR_Y, 1, 1, [prop('chapter', i + 1)]));
}

objects.unshift(point('player_spawn', 7, 7));

// Sanity check: no slot may sit on a colliding tile
const collides = new Set(meta.filter((m) => m.collides).map((m) => m.id + 1));
for (const o of objects.filter((o) => o.point)) {
  const tx = Math.floor(o.x / T), ty = Math.floor(o.y / T);
  const blocked = collides.has(walls[ty * W + tx]) || collides.has(furniture[ty * W + tx]);
  if (blocked) throw new Error(`Object ${o.name} at tile ${tx},${ty} is on a blocked tile`);
}

// Reachability check (doors counted as open, NPCs as obstacles): every NPC must have a
// reachable neighbour tile, every card and door must be reachable from the spawn.
{
  const tileOf = (o) => [Math.floor(o.x / T), Math.floor(o.y / T)];
  const npcTiles = new Set(objects.filter((o) => o.name === 'npc_slot' || o.name === 'quiz_host').map((o) => tileOf(o).join(',')));
  const doorGid = G.door_closed;
  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const w = walls[y * W + x];
    if (w === doorGid) return true;
    return !collides.has(w) && !collides.has(furniture[y * W + x]) && !npcTiles.has(`${x},${y}`) && floor[y * W + x] !== 0;
  };
  const spawn = tileOf(objects.find((o) => o.name === 'player_spawn'));
  const seen = new Set([spawn.join(',')]);
  const queue = [spawn];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && walkable(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); }
    }
  }
  for (const o of objects.filter((o) => o.point || o.name === 'door')) {
    const [x, y] = tileOf(o);
    const ok = o.name === 'npc_slot' || o.name === 'quiz_host'
      ? [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`))
      : seen.has(`${x},${y}`);
    if (!ok) throw new Error(`Object ${o.name} at tile ${x},${y} is not reachable`);
  }
}

const tileLayer = (id, name, data) => ({
  id, name, type: 'tilelayer', data, width: W, height: H, x: 0, y: 0, opacity: 1, visible: true,
});

const map = {
  type: 'map', version: '1.10', tiledversion: '1.10.2',
  orientation: 'orthogonal', renderorder: 'right-down', infinite: false, compressionlevel: -1,
  width: W, height: H, tilewidth: T, tileheight: T,
  nextlayerid: 5, nextobjectid: nextId,
  layers: [
    tileLayer(1, 'floor', floor),
    tileLayer(2, 'walls', walls),
    tileLayer(3, 'furniture', furniture),
    { id: 4, name: 'objects', type: 'objectgroup', draworder: 'topdown', objects, x: 0, y: 0, opacity: 1, visible: true },
  ],
  tilesets: [{
    firstgid: 1, name: 'office_tiles', image: '../sprites/office_tiles.png',
    // Extruded tileset (see build_assets.js): 1px margin around the image, 2px between tiles
    imagewidth: meta.length * (T + 2), imageheight: T + 2, tilewidth: T, tileheight: T,
    columns: meta.length, tilecount: meta.length, margin: 1, spacing: 2,
    tiles: meta.map((t) => ({ id: t.id, properties: [prop('collides', t.collides), prop('name', t.name)] })),
  }],
};

const out = path.join(__dirname, '..', 'assets', 'maps', 'office.tmj');
fs.writeFileSync(out, JSON.stringify(map));
console.log(`Wrote ${out} (${W}x${H} tiles, ${objects.length} objects)`);
