// Generates the placeholder pixel-art assets (tileset + character sheets) as PNG.
// Uses only Node built-ins (zlib). Run: node tools/build_assets.js
// All graphics produced here are original work and released under CC0 (see CREDITS.md).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets', 'sprites');
const T = 16; // tile size in pixels

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(img) {
  const { w, h, px } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- drawing helpers ----------
function image(w, h) {
  return { w, h, px: Buffer.alloc(w * h * 4) };
}
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}
function set(img, x, y, color) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const [r, g, b, a] = typeof color === 'string' ? hex(color) : color;
  const i = (y * img.w + x) * 4;
  img.px[i] = r; img.px[i + 1] = g; img.px[i + 2] = b; img.px[i + 3] = a;
}
function alphaAt(img, x, y) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
  return img.px[(y * img.w + x) * 4 + 3];
}
function rect(img, x, y, w, h, color) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(img, x + i, y + j, color);
}

// Each tile is drawn into its own slot (ox = tile index * 16) of the tileset strip.
const tiles = [];
function defineTile(name, draw, collides) {
  tiles.push({ name, draw, collides });
}

// Tile 0: wooden floor
defineTile('floor', (img, ox) => {
  rect(img, ox, 0, T, T, '#c9a26b');
  for (let y = 3; y < T; y += 4) rect(img, ox, y, T, 1, '#b08a55');
  set(img, ox + 5, 1, '#b08a55'); set(img, ox + 12, 5, '#b08a55');
  set(img, ox + 3, 9, '#b08a55'); set(img, ox + 10, 13, '#b08a55');
}, false);

// Tile 1: wall top (seen from above, dark)
defineTile('wall_top', (img, ox) => {
  rect(img, ox, 0, T, T, '#3b4252');
  rect(img, ox, 0, T, 1, '#4c566a');
}, true);

// Tile 2: wall front (light wall with baseboard)
function wallFront(img, ox) {
  rect(img, ox, 0, T, T, '#d8dee9');
  rect(img, ox, 0, T, 1, '#aeb6c6');
  rect(img, ox, 13, T, 3, '#8f9bb3');
}
defineTile('wall_front', wallFront, true);

// Tile 3: window
defineTile('window', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 2, 2, 12, 9, '#eceff4');
  rect(img, ox + 3, 3, 10, 7, '#8fd3ff');
  rect(img, ox + 8, 3, 1, 7, '#eceff4');
  set(img, ox + 4, 4, '#d4f1ff'); set(img, ox + 5, 4, '#d4f1ff');
}, true);

// Tile 4: whiteboard
defineTile('whiteboard', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 1, 2, 14, 10, '#7a869a');
  rect(img, ox + 2, 3, 12, 8, '#ffffff');
  rect(img, ox + 3, 5, 6, 1, '#d64545');
  rect(img, ox + 3, 7, 8, 1, '#3a6fd8');
  rect(img, ox + 3, 9, 4, 1, '#2e9e6b');
}, true);

// Tile 5: desk with monitor (transparent background, furniture layer)
defineTile('desk', (img, ox) => {
  rect(img, ox + 1, 3, 14, 11, '#6e4522');
  rect(img, ox + 1, 3, 14, 9, '#a0703a');
  rect(img, ox + 4, 4, 8, 5, '#2e3440');
  rect(img, ox + 5, 5, 6, 3, '#5e81ac');
  rect(img, ox + 7, 9, 2, 1, '#2e3440');
  rect(img, ox + 5, 10, 6, 1, '#d8dee9');
}, true);

// Tile 6: office chair
defineTile('chair', (img, ox) => {
  rect(img, ox + 4, 3, 8, 3, '#2e3440');
  rect(img, ox + 4, 6, 8, 6, '#4c566a');
  rect(img, ox + 5, 7, 6, 4, '#5f6b80');
  rect(img, ox + 7, 12, 2, 2, '#2e3440');
}, true);

// Tile 7: plant
defineTile('plant', (img, ox) => {
  rect(img, ox + 5, 10, 6, 5, '#b5651d');
  rect(img, ox + 4, 10, 8, 1, '#8a4a12');
  const leaves = [[7,2],[8,2],[6,3],[9,3],[5,4],[7,4],[8,4],[10,4],[4,5],[6,5],[9,5],[11,5],
    [5,6],[7,6],[8,6],[10,6],[6,7],[9,7],[4,7],[11,7],[5,8],[7,8],[8,8],[10,8],[6,9],[9,9]];
  for (const [x, y] of leaves) set(img, ox + x, y, '#3fa34d');
  for (const [x, y] of [[7,3],[8,5],[6,6],[9,8]]) set(img, ox + x, y, '#2b7a37');
}, true);

// Tile 8: bookshelf (wall-mounted, on the wall front row)
defineTile('shelf', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 1, 1, 14, 14, '#6e4522');
  rect(img, ox + 2, 2, 12, 5, '#3b2a1a');
  rect(img, ox + 2, 8, 12, 6, '#3b2a1a');
  const books = ['#d64545', '#3a6fd8', '#e0b23a', '#2e9e6b', '#9b59b6', '#eceff4'];
  for (let i = 0; i < 6; i++) {
    rect(img, ox + 2 + i * 2, 3, 2, 4, books[i]);
    rect(img, ox + 2 + i * 2, 9 + (i % 2), 2, 5 - (i % 2), books[(i + 3) % 6]);
  }
}, true);

// Tile 9: door closed (in a side wall, seen from above)
defineTile('door_closed', (img, ox) => {
  rect(img, ox, 0, T, T, '#3b4252');
  rect(img, ox + 3, 0, 10, T, '#7a4a24');
  rect(img, ox + 4, 1, 8, 14, '#9a6234');
  rect(img, ox + 4, 7, 8, 1, '#7a4a24');
  rect(img, ox + 5, 8, 2, 2, '#e0b23a');
  rect(img, ox + 3, 0, 10, 1, '#e0b23a'); // yellow frame marks the checkpoint door
  rect(img, ox + 3, 15, 10, 1, '#e0b23a');
}, true);

// Tile 10: door open (threshold)
defineTile('door_open', (img, ox) => {
  rect(img, ox, 0, T, T, '#3b4252');
  rect(img, ox + 3, 0, 10, T, '#a3adbd');
  rect(img, ox + 3, 0, 1, T, '#5c4a3a');
  rect(img, ox + 12, 0, 1, T, '#5c4a3a');
}, false);

// Tile 11: corridor floor (grey tiles)
defineTile('corridor', (img, ox) => {
  rect(img, ox, 0, T, T, '#a3adbd');
  rect(img, ox, 0, T, 1, '#94a0b2');
  rect(img, ox, 8, T, 1, '#94a0b2');
  rect(img, ox, 0, 1, T, '#94a0b2');
  rect(img, ox + 8, 0, 1, T, '#94a0b2');
}, false);

// Tile 12: blue carpet (meeting room)
defineTile('carpet', (img, ox) => {
  rect(img, ox, 0, T, T, '#5b7bb5');
  for (let y = 0; y < T; y += 2) for (let x = (y / 2) % 2; x < T; x += 4) set(img, ox + x, y, '#5272aa');
}, false);

// Tile 13: kitchen floor (checkerboard)
defineTile('kitchen', (img, ox) => {
  rect(img, ox, 0, T, T, '#e8e2d0');
  rect(img, ox, 0, 8, 8, '#c9c1aa');
  rect(img, ox + 8, 8, 8, 8, '#c9c1aa');
}, false);

// Tile 14: dark parquet (management offices)
defineTile('dark_floor', (img, ox) => {
  rect(img, ox, 0, T, T, '#8a5a3c');
  for (let y = 3; y < T; y += 4) rect(img, ox, y, T, 1, '#74482e');
  for (let y = 0; y < T; y += 4) set(img, ox + ((y * 5) % T), y + 1, '#74482e');
}, false);

// Tile 15: table top (meeting / kitchen), seamless in all directions so tables can be any size
defineTile('table', (img, ox) => {
  rect(img, ox, 0, T, T, '#b98a52');
  for (const y of [3, 8, 13]) rect(img, ox, y, T, 1, '#ad7f49');
  set(img, ox + 4, 5, '#c99a60'); set(img, ox + 11, 10, '#c99a60'); set(img, ox + 7, 1, '#c99a60');
}, true);

// Tile 16: kitchen counter
defineTile('counter', (img, ox) => {
  rect(img, ox, 0, T, T, '#9aa5b8');
  rect(img, ox, 0, T, 5, '#dfe4ec');
  rect(img, ox + 2, 7, 5, 7, '#8590a3');
  rect(img, ox + 9, 7, 5, 7, '#8590a3');
  set(img, ox + 6, 10, '#3b4252'); set(img, ox + 9, 10, '#3b4252');
}, true);

// Tile 17: coffee machine on a counter
defineTile('coffee_machine', (img, ox) => {
  rect(img, ox, 0, T, T, '#9aa5b8');
  rect(img, ox, 10, T, 6, '#8590a3');
  rect(img, ox + 3, 0, 10, 10, '#2e3440');
  rect(img, ox + 5, 2, 6, 2, '#d64545');
  rect(img, ox + 6, 6, 4, 3, '#eceff4');
  rect(img, ox + 7, 7, 2, 1, '#6e4522');
}, true);

// Tile 18: fridge
defineTile('fridge', (img, ox) => {
  rect(img, ox + 2, 0, 12, T, '#eceff4');
  rect(img, ox + 2, 6, 12, 1, '#aeb6c6');
  rect(img, ox + 11, 2, 1, 3, '#7a869a');
  rect(img, ox + 11, 8, 1, 5, '#7a869a');
  rect(img, ox + 2, 15, 12, 1, '#7a869a');
}, true);

// Tile 19: sofa
defineTile('sofa', (img, ox) => {
  rect(img, ox, 3, T, 11, '#8e3b46');
  rect(img, ox, 3, T, 4, '#a9505c');
  rect(img, ox + 1, 8, 6, 5, '#b8606b');
  rect(img, ox + 9, 8, 6, 5, '#b8606b');
}, true);

// Tile 20: flipchart (wall decoration)
defineTile('flipchart', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 3, 1, 10, 10, '#ffffff');
  rect(img, ox + 3, 1, 10, 1, '#7a869a');
  rect(img, ox + 5, 4, 6, 1, '#3a6fd8');
  rect(img, ox + 5, 6, 4, 1, '#d64545');
  rect(img, ox + 5, 8, 5, 1, '#3a6fd8');
  rect(img, ox + 4, 11, 1, 3, '#5c4a3a');
  rect(img, ox + 11, 11, 1, 3, '#5c4a3a');
}, true);

// Tile 21: wall clock (wall decoration)
defineTile('clock', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 4, 3, 8, 8, '#3b4252');
  rect(img, ox + 5, 4, 6, 6, '#ffffff');
  rect(img, ox + 8, 4, 1, 4, '#1a1a24'); // minute hand pointing to 12
  rect(img, ox + 5, 7, 4, 1, '#1a1a24'); // hour hand pointing to 9 -> "9 Uhr"
}, true);

// Tile 22: water cooler
defineTile('water_cooler', (img, ox) => {
  rect(img, ox + 4, 1, 8, 6, '#8fd3ff');
  rect(img, ox + 5, 2, 2, 3, '#d4f1ff');
  rect(img, ox + 3, 7, 10, 8, '#dfe4ec');
  rect(img, ox + 6, 9, 4, 2, '#3a6fd8');
  rect(img, ox + 3, 15, 10, 1, '#7a869a');
}, true);

// Tile 23: exit sign (wall decoration)
defineTile('exit_sign', (img, ox) => {
  wallFront(img, ox);
  rect(img, ox + 2, 3, 12, 7, '#2e9e6b');
  rect(img, ox + 4, 5, 3, 3, '#ffffff');
  rect(img, ox + 8, 6, 4, 1, '#ffffff');
  rect(img, ox + 10, 5, 1, 3, '#ffffff');
}, true);

function buildTileset() {
  // Draw all tiles into a plain strip first ...
  const strip = image(T * tiles.length, T);
  tiles.forEach((t, i) => t.draw(strip, i * T));

  // ... then copy them into an "extruded" tileset: every tile gets a 1px border made of its
  // own edge pixels (margin 1, spacing 2). This prevents thin seams between tiles when the
  // camera zoom is not a whole number (the game scales the map to the window height).
  const STEP = T + 2;
  const img = image(STEP * tiles.length, T + 2);
  const px = (src, x, y) => src.px.subarray((y * src.w + x) * 4, (y * src.w + x) * 4 + 4);
  tiles.forEach((_, i) => {
    for (let y = -1; y <= T; y++) {
      for (let x = -1; x <= T; x++) {
        const sx = i * T + Math.min(T - 1, Math.max(0, x));
        const sy = Math.min(T - 1, Math.max(0, y));
        const c = px(strip, sx, sy);
        set(img, i * STEP + 1 + x, 1 + y, [c[0], c[1], c[2], c[3]]);
      }
    }
  });
  fs.writeFileSync(path.join(OUT, 'office_tiles.png'), encodePng(img));
  // Tile metadata is reused by build_map.js
  fs.writeFileSync(
    path.join(__dirname, 'tiles_meta.json'),
    JSON.stringify(tiles.map((t, i) => ({ id: i, name: t.name, collides: t.collides })), null, 2)
  );
}

// ---------- characters ----------
// h = hair, s = skin, e = eyes, c = shirt, p = pants, b = shoes, . = transparent
const HEAD_DOWN = [
  '................',
  '......hhhh......',
  '.....hhhhhh.....',
  '.....hssssh.....',
  '.....sesses.....',
  '.....ssssss.....',
  '......ssss......',
];
const HEAD_UP = [
  '................',
  '......hhhh......',
  '.....hhhhhh.....',
  '.....hhhhhh.....',
  '.....hhhhhh.....',
  '.....shhhhs.....',
  '......ssss......',
];
const HEAD_LEFT = [
  '................',
  '......hhhh......',
  '.....hhhhhh.....',
  '.....sssshh.....',
  '.....essshh.....',
  '.....ssssh......',
  '......ssss......',
];
const BODY_FRONT = [
  '.....cccccc.....',
  '....cccccccc....',
  '....sccccccs....',
  '....sccccccs....',
  '.....cccccc.....',
  '.....pppppp.....',
];
const BODY_SIDE = [
  '......cccc......',
  '.....ccccc......',
  '.....ccscc......',
  '.....ccscc......',
  '......cccc......',
  '......pppp......',
];
const LEGS_FRONT = [
  ['.....pp..pp.....', '.....pp..pp.....', '.....bb..bb.....'], // stand
  ['.....pp..pp.....', '.....bb..pp.....', '.........bb.....'], // step 1
  ['.....pp..pp.....', '.....pp..bb.....', '.....bb.........'], // step 2
];
const LEGS_SIDE = [
  ['......pppp......', '......pppp......', '......bbbb......'],
  ['.....pp..pp.....', '....pp....pp....', '....bb....bb....'],
  ['......pppp......', '......pp.p......', '......bb.b......'],
];

function frame(head, body, legs) {
  return [...head, ...body, ...legs];
}
function mirror(rows) {
  return rows.map((r) => r.split('').reverse().join(''));
}

// Sheet layout: rows = down, left, right, up; columns = stand, step1, step2
// Long hair: adds hair pixels beside the face (rows 3..7) at the given columns.
function withLongHair(head, cols) {
  return head.map((row, y) => {
    if (y < 3) return row;
    const chars = row.split('');
    for (const x of cols) if (chars[x] === '.') chars[x] = 'h';
    return chars.join('');
  });
}

function characterFrames(longHair = false) {
  const down = longHair ? withLongHair(HEAD_DOWN, [4, 11]) : HEAD_DOWN;
  const up = longHair ? withLongHair(HEAD_UP, [4, 11]) : HEAD_UP;
  const side = longHair ? withLongHair(HEAD_LEFT, [10, 11]) : HEAD_LEFT;
  const rows = [];
  rows.push(LEGS_FRONT.map((l) => frame(down, BODY_FRONT, l)));
  const left = LEGS_SIDE.map((l) => frame(side, BODY_SIDE, l));
  rows.push(left);
  rows.push(left.map(mirror));
  rows.push(LEGS_FRONT.map((l) => frame(up, BODY_FRONT, l)));
  return rows;
}

function buildCharacter(file, palette, longHair = false) {
  const rows = characterFrames(longHair);
  const img = image(T * 3, T * 4);
  rows.forEach((row, ry) =>
    row.forEach((art, cx) => {
      art.forEach((line, y) => {
        if (line.length !== T) throw new Error(`Bad sprite row length (${line.length}): "${line}"`);
        [...line].forEach((ch, x) => {
          if (ch !== '.') set(img, cx * T + x, ry * T + y, palette[ch]);
        });
      });
    })
  );
  // 1px dark outline for readability on any floor
  const copy = Buffer.from(img.px);
  const src = { ...img, px: copy };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (alphaAt(src, x, y)) continue;
      const cellX = Math.floor(x / T), cellY = Math.floor(y / T);
      const inCell = (nx, ny) => Math.floor(nx / T) === cellX && Math.floor(ny / T) === cellY;
      const n = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) =>
        inCell(x + dx, y + dy) && alphaAt(src, x + dx, y + dy));
      if (n) set(img, x, y, '#1a1a24');
    }
  fs.writeFileSync(path.join(OUT, file), encodePng(img));
}

// Small collectible "conflict card" (16x16, transparent background)
function buildCard() {
  const img = image(T, T);
  rect(img, 3, 2, 10, 12, '#1a1a24');
  rect(img, 4, 3, 8, 10, '#ffd75e');
  rect(img, 5, 4, 6, 8, '#fff3c4');
  rect(img, 6, 6, 4, 1, '#d64545');
  rect(img, 6, 8, 4, 1, '#3a6fd8');
  rect(img, 6, 10, 3, 1, '#2e9e6b');
  fs.writeFileSync(path.join(OUT, 'card.png'), encodePng(img));
}

// NPC palettes: [hair, skin, shirt, pants, longHair]
const NPC_LOOKS = [
  ['#a33a1f', '#e8b48a', '#2e9e6b', '#3b3b55', true],
  ['#2b2b2b', '#c68642', '#d64545', '#2b2b3a', false],
  ['#e0c068', '#f2c9a0', '#9b59b6', '#3b3b55', true],
  ['#5a3a1e', '#8d5524', '#e0b23a', '#2b2b3a', false],
  ['#1a1a24', '#f2c9a0', '#3aa0c8', '#55463b', true],
  ['#7a7a7a', '#e8b48a', '#4c566a', '#2b2b3a', false],
  ['#c0602a', '#f2c9a0', '#ff8c42', '#3b3b55', false],
  ['#2b2b2b', '#a86b3c', '#eceff4', '#2b2b3a', true],
  ['#5a3a1e', '#f2c9a0', '#c0392b', '#1f3a5a', false],
  ['#e0c068', '#c68642', '#16a085', '#3b3b55', true],
  ['#1a1a24', '#8d5524', '#8e44ad', '#2b2b3a', false],
  ['#d9d9d9', '#f2c9a0', '#34495e', '#55463b', true],
];
const NPC_COUNT = NPC_LOOKS.length;

fs.mkdirSync(OUT, { recursive: true });
buildTileset();
buildCard();
buildCharacter('player.png', {
  h: '#5a3a1e', s: '#f2c9a0', e: '#1a1a24', c: '#3a6fd8', p: '#2b2b3a', b: '#111111',
});
NPC_LOOKS.forEach(([h, s, c, p, longHair], i) => {
  const key = 'npc_' + String(i + 1).padStart(2, '0');
  buildCharacter(key + '.png', { h, s, e: '#1a1a24', c, p, b: '#111111' }, longHair);
});
// Remove the old single NPC sheet from the MVP if it is still there
const old = path.join(OUT, 'npc_lena.png');
if (fs.existsSync(old)) fs.unlinkSync(old);
console.log(`Built ${tiles.length} tiles, card, player + ${NPC_COUNT} NPC sheets in ${OUT}`);
