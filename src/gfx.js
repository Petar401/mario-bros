// All graphics are original pixel art defined in code: palette-indexed string
// rows are rasterised once into offscreen canvases at boot.
import { T } from './tiles.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

// rows: array of strings; map: char -> '#rrggbb'. Rows are bottom-aligned when
// opts.h is larger than rows.length (opts.top aligns to the top instead).
export function art(rows, map, opts = {}) {
  const w = opts.w || Math.max(...rows.map(r => r.length));
  const h = opts.h || rows.length;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const off = opts.top ? 0 : h - rows.length;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length && x < w; x++) {
      const col = map[row[x]];
      if (!col) continue;
      const [r, gg, b] = rgb(col);
      const i = ((y + off) * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}
export function flipV(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(0, src.height); g.scale(1, -1); g.drawImage(src, 0, 0);
  return c;
}
function rot90(src) {
  const c = makeCanvas(src.height, src.width);
  const g = c.getContext('2d');
  g.translate(src.height, 0); g.rotate(Math.PI / 2); g.drawImage(src, 0, 0);
  return c;
}
function slice(src, x, y, w, h) {
  const c = makeCanvas(w, h);
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
  return c;
}

// Sprite with lazily built mirrored variants.
export class Spr {
  constructor(c) { this.c = c; this.w = c.width; this.h = c.height; this._fh = null; this._fv = null; this._fhv = null; }
  get fh() { return this._fh || (this._fh = flipH(this.c)); }
  get fv() { return this._fv || (this._fv = flipV(this.c)); }
  get fhv() { return this._fhv || (this._fhv = flipV(this.fh)); }
  pick(flipX, flipY) { return flipY ? (flipX ? this.fhv : this.fv) : (flipX ? this.fh : this.c); }
}
const S = (rows, map, opts) => new Spr(art(rows, map, opts));

// ---------------------------------------------------------------- font
const GLYPHS = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '*': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '>': ['#....', '##...', '###..', '####.', '###..', '##...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '#': ['.###.', '#...#', '#.#.#', '#.###', '#.#..', '#...#', '.###.'],
};
const fontCache = new Map();
function glyph(ch, color) {
  const key = ch + color;
  let c = fontCache.get(key);
  if (!c) {
    const rows = GLYPHS[ch];
    c = rows ? art(rows, { '#': color }, { w: 8, h: 8, top: true }) : null;
    fontCache.set(key, c);
  }
  return c;
}
export function drawText(ctx, text, x, y, color = '#fcfcfc', shadow = false) {
  text = String(text).toUpperCase();
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') continue;
    if (shadow) {
      const s = glyph(ch, '#000000');
      if (s) ctx.drawImage(s, x + i * 8 + 2, y + 1);
    }
    const g = glyph(ch, color);
    if (g) ctx.drawImage(g, x + i * 8 + 1, y);
  }
}
export function drawTextCentered(ctx, text, y, color, shadow) {
  drawText(ctx, text, Math.round(128 - String(text).length * 4), y, color, shadow);
}

// ---------------------------------------------------------------- hero
const HERO_PAL = {
  normal: { R: '#d82800', B: '#2038ec', S: '#fca044', H: '#7c3c00', K: '#000000', Y: '#fce0a8', W: '#fcfcfc' },
  fire: { R: '#fcfcfc', B: '#d82800', S: '#fca044', H: '#7c3c00', K: '#000000', Y: '#fce0a8', W: '#fcfcfc' },
  star1: { R: '#00a800', B: '#000000', S: '#fca044', H: '#c84c0c', K: '#000000', Y: '#fcfcfc', W: '#fcfcfc' },
  star2: { R: '#fcbc3c', B: '#c84c0c', S: '#fcfcfc', H: '#000000', K: '#000000', Y: '#fcfcfc', W: '#fcfcfc' },
  star3: { R: '#000000', B: '#fc7460', S: '#fca044', H: '#00a800', K: '#000000', Y: '#fcfcfc', W: '#fcfcfc' },
};

const SM_UP = [
  '......RRRRR.....',
  '....RRRRRRRRR...',
  '....RRRRRRRRRRR.',
  '....HHSSSSKS....',
  '...HSSSSSSKSS...',
  '...HSSSSSSSSSS..',
  '....SSSSSHHHH...',
  '.....SSSSSSS....',
  '....BRRRRRB.....',
  '...SBRRRRRBS....',
];
const SM_UP_JUMP = [
  ...SM_UP.slice(0, 6),
  '....SSSSSHHHHSS.',
  '.....SSSSSSSRSS.',
  '....BRRRRRBRR...',
  '...SBRRRRRBR....',
];
const SM_LO = {
  stand: ['..SSBBBBBBBSS...', '..SSBBYBYBBSS...', '....BBBBBBB.....', '....BBB.BBB.....', '...HHHH.HHHH....', '...HHHH.HHHHH...'],
  w1: ['..SSBBBBBBBSS...', '...SBBYBYBBS....', '...BBBBBBBBB....', '..BBB....BBB....', '.HHHH.....HHHH..', '.HHH......HHHHH.'],
  w2: ['...SBBBBBBBS....', '....BBYBYBBS....', '....BBBBBBB.....', '.....BBBBB......', '.....HHHHH......', '....HHHHHH......'],
  w3: ['..SSBBBBBBBSS...', '..SSBBYBYBB.....', '...BBBBBBBB.....', '...BBB..BBBB....', '..HHHH...HHHH...', '..HHH.....HHHH..'],
  jump: ['..SSBBBBBBB.....', '...SBBYBYBB.....', '...BBBBBBBBB....', '..BBBB...BBBH...', '.HHHH.....HHH...', '.HHH............'],
};
const SM_DIE = [
  '................',
  '......RRRR......',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '...HSKSSSSKSH...',
  '.SSHSKSSSSKSHSS.',
  '.SSSSSSSSSSSSSS.',
  '.SS.SHHHHHHS.SS.',
  '.SS..SSSSSS..SS.',
  '.BB.BRRRRRRB.BB.',
  '..BBBRRRRRRBBB..',
  '...BBBYBBYBBB...',
  '....BBBBBBBB....',
  '....BBB..BBB....',
  '...HHHH..HHHH...',
  '...HHHH..HHHH...',
];
const BG_UP = [
  '......RRRRR.....',
  '....RRRRRRRRR...',
  '...RRRRRRRRRRRR.',
  '...RRRRRRRRRRRRR',
  '....HHHSSSKS....',
  '...HHSSSSSKSS...',
  '...HSSSSSSKSSS..',
  '...HSSSSSSSSSSS.',
  '...HHSSSSSSSSSS.',
  '....SSSSSSHHHHH.',
  '.....SSSSSSHHH..',
  '......SSSSSS....',
  '.....RRBRRRRB...',
  '....RRRBRRRRBR..',
  '...RRRRBRRRRBRR.',
  '..RRRRRBRRRRBRRR',
  '..RRRRRBBBBBBRRR',
  '..SSRRBBYBBYBBSS',
  '..SSSSBBBBBBBSSS',
  '..SSS.BBBBBBB.SS',
];
const BG_LO = {
  stand: ['.....BBBBBBBB...', '....BBBBBBBBBB..', '....BBBBBBBBBB..', '....BBBBB.BBBB..', '....BBBB...BBB..', '....BBBB...BBB..', '....BBB....BBB..', '....BBB....BBB..', '....BBB....BBB..', '...HHHH....HHHH.', '..HHHHH....HHHHH', '..HHHHH....HHHHH'],
  w1: ['.....BBBBBBBB...', '....BBBBBBBBBB..', '...BBBBBBBBBBB..', '...BBBB..BBBBB..', '..BBBB....BBBB..', '..BBB......BBB..', '.BBB.......BBB..', '.BBB........BBB.', 'HHH.........BBB.', 'HHHH.......HHHH.', 'HHH........HHHHH', '...........HHHHH'],
  w2: ['.....BBBBBBBB...', '.....BBBBBBBBB..', '.....BBBBBBBB...', '......BBBBBBB...', '......BBBBBB....', '.......BBBBB....', '.......BBBB.....', '.......BBBB.....', '.......BBBB.....', '......HHHHH.....', '.....HHHHHHH....', '.....HHHHHHH....'],
  w3: ['.....BBBBBBBB...', '....BBBBBBBBBB..', '....BBBBBBBBBB..', '....BBBB.BBBBB..', '...BBBB...BBBB..', '...BBB.....BBB..', '..BBB......BBB..', '..BBB.....BBB...', '.HHHH.....BBB...', '.HHHH....HHHH...', '.HHH.....HHHHH..', '.........HHHHH..'],
  jump: ['.....BBBBBBBBH..', '....BBBBBBBBBHH.', '...BBBBBBBBBBHH.', '..BBBBB..BBBBH..', '.BBBB.....BBB...', '.BBB......BBB...', 'HHH.......BBB...', 'HHHH.....HHH....', 'HHH......HHHH...', '.........HHHH...', '................', '................'],
};
const BG_CROUCH = [
  ...BG_UP.slice(0, 12),
  '..SSRRBBBBBBRRSS',
  '..SSRRBBYBBYBBSS',
  '...RBBBBBBBBBB..',
  '..HHHBBBBBBBBHHH',
  '.HHHHH.....HHHHH',
  '.HHHHH.....HHHHH',
];

// ---------------------------------------------------------------- enemies & items
const WALKER_PAL = { N: '#c84c0c', T: '#fcbcb0', K: '#000000', W: '#fcfcfc' };
const WALKER = [
  '......NNNN......',
  '.....NNNNNN.....',
  '....NNNNNNNN....',
  '...NNNNNNNNNN...',
  '..NKKNNNNNNKKN..',
  '.NNNWKNNNNKWNNN.',
  '.NNNWKKNNKKWNNN.',
  'NNNNWWKNNKWWNNNN',
  'NNNNNNNNNNNNNNNN',
  '.NNNNTTTTTTNNNN.',
  '.....TTTTTT.....',
  '....TTTTTTTT....',
  '...KKTTTTTTT....',
  '..KKKKTTTTKKK...',
  '..KKKKK.KKKKKK..',
  '...KKK...KKKK...',
];
const WALKER_FLAT = [
  '....NNNNNNNN....',
  '..NNKWNNNNWKNN..',
  '.NNNNNNNNNNNNNN.',
  'NNNNNNNNNNNNNNNN',
  '...TTTTTTTTTT...',
  '..KKKKK..KKKKK..',
];
const TURTLE_A = [
  '.....YY.........',
  '....YYYY........',
  '...YKWYY........',
  '...YKWYY........',
  '..YYYYYY........',
  '..YYYYYY........',
  '...YYYYY........',
  '....YYYY.GGGG...',
  '....YYY.GGLLGG..',
  '....YY.GGLGGLGG.',
  '....YYGGLGGGGLG.',
  '....YGLLLLLLLLGG',
  '...YYGLGGLGGLGLG',
  '...YWWGLGGLGGLGG',
  '....WWWLLLLLLLGG',
  '.....WWWWWWWWWW.',
  '......WWWWWWWW..',
  '.....YYY...YYY..',
  '....YYYY..YYYY..',
  '....YYY...YYY...',
];
const TURTLE_B = [
  ...TURTLE_A.slice(0, 17),
  '......YYY.YYY...',
  '.....YYYY.YYYY..',
  '......YY...YY...',
];
const SHELL = [
  '.....GGGGGG.....',
  '...GGLGGGGLGG...',
  '..GLLGLLLLGLLG..',
  '.GLGGLGGGGLGGLG.',
  '.GLGGLGGGGLGGLG.',
  'GLLLLLLLLLLLLLLG',
  'GGLGGGLGGLGGGLGG',
  'GGLGGGLGGLGGGLGG',
  '.GLLLLLLLLLLLLG.',
  '.WWWWWWWWWWWWWW.',
  '..WWWWWWWWWWWW..',
  '...WWWWWWWWWW...',
];
const SHELL_PEEK = [
  ...SHELL.slice(0, 10),
  '..WWWWWWWWWWWW..',
  '..YYWWWWWWWWYY..',
];
const WING = ['..WW....', '.WWWW...', 'WWWWWW..', '.WWWWWW.', '..WWWWW.', '...WWW..'];
const WING2 = ['........', '........', 'WWW.....', 'WWWWWW..', '.WWWWWWW', '..WWWW..'];
const TURTLE_PAL = { Y: '#fca044', K: '#000000', W: '#fcfcfc', G: '#00a800', L: '#b8f818' };
const TURTLE_RED = { Y: '#fca044', K: '#000000', W: '#fcfcfc', G: '#d82800', L: '#fc9838' };

const PLANT_HEAD_OPEN = [
  '....RR....RR....',
  '...RRWR..RWRR...',
  '..RRRRR..RRRRR..',
  '..RWRRR..RRRWR..',
  '..RRRRRWWRRRRR..',
  '...RRRRWWRRRR...',
  '....RRRRRRRR....',
  '......RRRR......',
];
const PLANT_HEAD_SHUT = [
  '.....RRRRRR.....',
  '....RRWRRRRR....',
  '...RRRRRRWRRR...',
  '...RWRRRRRRRR...',
  '...RRRRRRRRWR...',
  '....RRRRRRRR....',
  '.....WWWWWW.....',
  '......RRRR......',
];
const PLANT_STEM = [
  '.......GG.......',
  '..LL...GG...LL..',
  '.LLGL..GG..LGLL.',
  'LLGGGL.GG.LGGGLL',
  'LGGGGGLGGLGGGGGL',
  '.LGGGGGGGGGGGGL.',
  '..LLGGGGGGGGLL..',
  '....LLLGGLLL....',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
];
const PLANT_PAL = { R: '#d82800', W: '#fcfcfc', G: '#00a800', L: '#b8f818' };

const FISH_A = [
  '.........RR.....',
  '.......RRRR.....',
  '..WWRRRRRRRR....',
  '.WWKWRRRRRRRR..R',
  '.WKKWRRRRRRRR.RR',
  'WWWWRRRWWRRRRRRR',
  'WWWRRRRRWWRRRRR.',
  '.WWRRRRRRRRRRRR.',
  '..RRRRRRRRRRR.RR',
  '...RRRRRRRRR...R',
  '.....RRRR.......',
  '......RR........',
];
const FISH_B = [
  '.........RR.....',
  '.......RRRR.....',
  '..WWRRRRRRRR....',
  '.WWKWRRRRRRRR...',
  '.WKKWRRRRRRRRRR.',
  'WWWWRRRWWRRRRRRR',
  'WWWRRRRRWWRRRRRR',
  '.WWRRRRRRRRRRRR.',
  '..RRRRRRRRRRRR..',
  '...RRRRRRRRR....',
  '.....RRRR.......',
  '......RR........',
];
const FISH_PAL = { R: '#d82800', W: '#fcfcfc', K: '#000000' };
const FISH_GREY = { R: '#9c9c9c', W: '#fcfcfc', K: '#000000' };

const SQUID_A = [
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WKKWWWWKKW...',
  '...WKKWWWWKKW...',
  '...WWWWWWWWWW...',
  '...WWWWWWWWWW...',
  '....WWWWWWWW....',
  '....W.W..W.W....',
  '...WW.W..W.WW...',
  '...W..W..W..W...',
  '..WW..W..W..WW..',
  '..W...W..W...W..',
  '......W..W......',
  '......W..W......',
];
const SQUID_B = [
  '......WWWW......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WKKWWWWKKW...',
  '...WKKWWWWKKW...',
  '...WWWWWWWWWW...',
  '....WWWWWWWW....',
  '..WWWW.WW.WWWW..',
  '.WW..W.WW.W..WW.',
  'WW...W.WW.W...WW',
  'W....W....W....W',
];
const SQUID_PAL = { W: '#fcfcfc', K: '#000000' };

const HAMMER_BRO = [
  '.....KKKK.......',
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '...YKWYYKK......',
  '...YKWYYYK......',
  '..YYYYYYY.......',
  '..YYYYYYY.GGG...',
  '...YYYYY.GGLGG..',
  '....YYY.GGLGLGG.',
  '..YYYYYGGLGGGLG.',
  '.YY.YYGLLLLLLGG.',
  '.YY.YWGLGGLGLGG.',
  '....WWGLGGLGGLG.',
  '....WWWLLLLLLGG.',
  '.....WWWWWWWWW..',
  '......WWWWWWW...',
  '.....YYY..YYY...',
  '....YYYY.YYYY...',
  '....YYY...YYY...',
];
const HAMMER_BRO_B = [
  ...HAMMER_BRO.slice(0, 16),
  '......YYY.YYY...',
  '.....YYYY.YYYY..',
  '......YY...YY...',
];
const HAMMER = ['..KKKK..', '.KGGGGK.', '.KGWGGK.', '.KGGGGK.', '..KBBK..', '...BB...', '...BB...', '...BB...'];
const HAMMER_PAL = { K: '#000000', G: '#9c9c9c', W: '#fcfcfc', B: '#c84c0c' };

const RIDER = [
  '......YYY.......',
  '.....YYYYY......',
  '....YKWYKWY.....',
  '....YKWYKWY.....',
  '....YYYYYYY.....',
  '.....YYYYY......',
  '...GGGGGGGGG....',
  '..GLGGLGGLGGG...',
  '.WWWWWWWWWWWWW..',
  'WWWKWWWWWWKWWWW.',
  'WWWKWWWWWWKWWWW.',
  'WWWWWWKKKWWWWWWW',
  '.WWWWWWWWWWWWWW.',
  '..WWWW..WWWWWW..',
  '....W.....WW....',
];
const SPINY_A = [
  '....W...W.......',
  '...WRW.WRW..W...',
  '..WRRRWRRRWWRW..',
  '.WRRRRRRRRRRRRW.',
  '.RRRRRRRRRRRRRR.',
  'WRRRRRRRRRRRRRRW',
  '.RRRWWRRRRRRRRR.',
  '.RRWKWRRRRRRRRR.',
  'YRRWKWRRRRRRRRR.',
  'YYRRRRRRRRRRRRRR',
  '.YYYRRRRRRRRRRR.',
  '..YYYYYYYYYYYY..',
  '...YYY....YYY...',
  '..YYYY...YYYY...',
];
const SPINY_B = [
  ...SPINY_A.slice(0, 12),
  '....YYY..YYY....',
  '...YYYY.YYYY....',
];
const SPINY_EGG = [
  '.......W........',
  '..W..RRRRR..W...',
  '...WRRRRRRRW....',
  '..RRRRRRRRRRR...',
  '.RRRRRRRRRRRRR..',
  'WRRRRRRRRRRRRRW.',
  '.RRRRRRRRRRRRR..',
  '.RRRRRRRRRRRRR..',
  '..RRRRRRRRRRR...',
  '...WRRRRRRRW....',
  '..W..RRRRR..W...',
  '.......W........',
];
const SPINY_PAL = { R: '#d82800', W: '#fcfcfc', Y: '#fca044', K: '#000000' };
const RIDER_PAL = { Y: '#fca044', K: '#000000', W: '#fcfcfc', G: '#00a800', L: '#b8f818' };

const BULLET = [
  '.....KKKKKKKK.W.',
  '...KKKKKKKKKKWW.',
  '..KKKKKKKKKKKWWW',
  '.KKKWWKKKKKKKWWW',
  '.KKWKWWKKKKKKWWW',
  'KKKWKKWKKKKKKWWW',
  'KKKWWWWKKKKKKWWW',
  'KKKKWWKKKKKKKWWW',
  'KKKKKKKKKKKKKWWW',
  '.KKKKKKKKKKKKWWW',
  '.KKKKKKKKKKKKWWW',
  '..KKKKKKKKKKKWW.',
  '...KKKKKKKKKKW..',
  '.....KKKKKKKK...',
];
const BULLET_PAL = { K: '#181818', W: '#fcfcfc' };

const PODOBOO = [
  '.......RR.......',
  '......RRRR......',
  '....RROOOORR....',
  '...ROOYYYYOOR...',
  '..ROYYYYYYYYOR..',
  '..ROYKYYYYKYOR..',
  '.ROYYKYYYYKYYOR.',
  '.ROYYYYYYYYYYOR.',
  '.ROYYYYYYYYYYOR.',
  '.ROOYYYYYYYYOOR.',
  '..ROOYYYYYYOOR..',
  '...RROOOOOORR...',
  '.....RRRRRR.....',
];
const FIRE_PAL = { R: '#d82800', O: '#fc7400', Y: '#fcd800', W: '#fcfcfc', K: '#000000' };

const BOSS_A = [
  '..........W.......W.............',
  '.........WW......WW......RR.....',
  '........WWGGGGGGGWW....RRRR.....',
  '.......GGGGGGGGGGGGG.RRRRRR.....',
  '......GGKKGGGGGGGGGGRRRRRR......',
  '.....GGKWKGGGGGGGGGGGRRRR.WW....',
  '....GGGKKGGGGGGGGGGGGGGG.WWWW...',
  '...OOGGGGGGGGGGGGGGGGGGGWWLLWW..',
  '..OOOOGGGGGGGGGGGGGGGGGWLLLLLLW.',
  '.OOOOOOGGGGGGGGGGGGGGGWLLWWLLWLW',
  '.WOWOWOOGGGGGGGGGGGGGGWLWLLWLLLW',
  '..OOOOOOGGGGGGGGGGGGGWLLWLLWWLLW',
  '..WOWOWOOGGGGGGGGGGGGWLLLWWLLLLW',
  '...OOOOOOGGGGGGGGGGGGWWLLLLWLLW.',
  '.....OOOOGGGOOOOOGGGGGWWLLLLLWW.',
  '.......GGGGOOOOOOOGGGGGWWWWWWW..',
  '......GGGGOOOOOOOOOGGGGGGGGG....',
  '.....GGGGGOOOOOOOOOGGGGGGGG.....',
  '....GGW.GGOOOOOOOOOOGGGGGG......',
  '...GGWW.GGOOOOOOOOOOOGGGG.......',
  '...GWW..GGOOOOOOOOOOOGGG........',
  '........GGOOOOOOOOOOOGGG........',
  '.........GOOOOOOOOOOGGGG........',
  '.........GGOOOOOOOOGGGGG........',
  '..........GGOOOOOOGGGGGG........',
  '..........GGGGGGGGGGGGGG........',
  '.........GGGGGG...GGGGGG........',
  '........GGGGGG.....GGGGGG.......',
  '.......GGGGGG......GGGGGG.......',
  '......WWGWGWG.....WWGWGWG.......',
  '......WWWWWWW.....WWWWWWW.......',
];
const BOSS_B = [
  ...BOSS_A.slice(0, 9),
  '..OOOOOGGGGGGGGGGGGGGGWLLWWLLWLW',
  '..OOOOOOGGGGGGGGGGGGGGWLWLLWLLLW',
  '..OOOOOOGGGGGGGGGGGGGWLLWLLWWLLW',
  '...OOOOOOGGGGGGGGGGGGWLLLWWLLLLW',
  ...BOSS_A.slice(13),
];
const BOSS_PAL = { G: '#00a800', L: '#b8f818', O: '#fca044', W: '#fcfcfc', R: '#d82800', K: '#000000' };
const FLAME = [
  '......RRRRRRRR....RR....',
  '...RRROOOOOOOORRRROORR..',
  '.RROOOYYYYYYYYOOOOYYOOR.',
  'ROOYYYYYYYYYYYYYYYYYYYOR',
  'ROOYYYYYYYYYYYYYYYYYYYOR',
  '.RROOOYYYYYYYYOOOOYYOOR.',
  '...RRROOOOOOOORRRROORR..',
  '......RRRRRRRR....RR....',
];

const CAPTIVE = [
  '.....GGGGGG.....',
  '...GGLGGGGLGG...',
  '..GLLGGGGGGLLG..',
  '..GGGGGGGGGGGG..',
  '...SSSSSSSSSS...',
  '...SKSSSSSSKS...',
  '...SKSSSSSSKS...',
  '....SSSSSSSS....',
  '.....SSRRSS.....',
  '....WWWWWWWW....',
  '...WWBBBBBBWW...',
  '..SSWBBBBBBWSS..',
  '..SSWBBBBBBWSS..',
  '....BBBBBBBB....',
  '....HHH..HHH....',
  '...HHHH..HHHH...',
];
const CAPTIVE_PAL = { G: '#00a800', L: '#b8f818', S: '#fcbcb0', K: '#000000', R: '#d82800', W: '#fcfcfc', B: '#2038ec', H: '#7c3c00' };
const QUEEN = [
  '.....Y.Y.Y......',
  '.....YYYYY......',
  '....RRRRRRR.....',
  '...RRRRRRRRR....',
  '...RRSSSSSRR....',
  '..RRSKSSKSSRR...',
  '..RRSKSSKSSRR...',
  '..RRSSSSSSSRR...',
  '..RRRSSPSSRRR...',
  '..RRRRSSSRRRR...',
  '..RRRPPPPPRRR...',
  '...RPPWPWPPR....',
  '...SPPPPPPPS....',
  '..SSPPPPPPPSS...',
  '..SS.PPPPP.SS...',
  '.....PPPPP......',
  '....PPPPPPP.....',
  '....PPPPPPP.....',
  '...PPPPPPPPP....',
  '...PPPPPPPPP....',
  '..PPPPPPPPPPP...',
  '..PPPPPPPPPPP...',
  '.PPPPPPPPPPPPP..',
  '.PPPPPPPPPPPPP..',
  'PPPPPPPPPPPPPPP.',
  'PPPPPPPPPPPPPPP.',
];
const QUEEN_PAL = { Y: '#fcd800', R: '#c84c0c', S: '#fcbcb0', K: '#000000', P: '#fc74b4', W: '#fcfcfc' };

const MUSHROOM = [
  '......RRRR......',
  '....RRWWWWRR....',
  '...RRWWWWWWRR...',
  '..RRRWWWWWWRRR..',
  '.RRRRRWWWWRRRRR.',
  '.RWWRRRRRRRRWWR.',
  'RWWWWRRRRRRWWWWR',
  'RWWWWRRRRRRWWWWR',
  'RRWWRRRRRRRRWWRR',
  '.RRRTTTTTTTTRRR.',
  '..TTTTKTTKTTTT..',
  '..TTTTKTTKTTTT..',
  '..TTTTTTTTTTTT..',
  '...TTTTTTTTTT...',
  '....TTTTTTTT....',
];
const MUSH_PAL = { R: '#d82800', W: '#fcfcfc', T: '#fcbcb0', K: '#000000' };
const ONEUP_PAL = { R: '#00a800', W: '#fcfcfc', T: '#fcbcb0', K: '#000000' };
const FLOWER = [
  '....PPPPPPPP....',
  '..PPQQQQQQQQPP..',
  '.PQQCCCCCCCCQQP.',
  '.PQQCCCCCCCCQQP.',
  '..PPQQQQQQQQPP..',
  '....PPPPPPPP....',
  '.......GG.......',
  '.GG....GG....GG.',
  '.GGGG..GG..GGGG.',
  '..GGGG.GG.GGGG..',
  '...GGGGGGGGGG...',
  '....GGGGGGGG....',
  '.......GG.......',
  '.......GG.......',
];
const STAR = [
  '.......OO.......',
  '......OYYO......',
  '......OYYO......',
  '.....OYYYYO.....',
  'OOOOOOYYYYOOOOOO',
  '.OYYYYYYYYYYYYO.',
  '..OYYYKYYKYYYO..',
  '...OYYKYYKYYO...',
  '....OYYYYYYO....',
  '...OYYYYYYYYO...',
  '...OYYYYYYYYO...',
  '..OYYYYOOYYYYO..',
  '..OYYOO..OOYYO..',
  '.OYOO......OOYO.',
  '.OO..........OO.',
];
const FIREBALL = ['...RR...', '..ROOR..', '.ROYYOR.', 'ROYWWYOR', 'ROYWWYOR', '.ROYYOR.', '..ROOR..', '...RR...'];
const FIREBALL2 = ['...RR...', '..RYYR..', '.RYOOYR.', 'RYOWWOYR', 'RYOWWOYR', '.RYOOYR.', '..RYYR..', '...RR...'];
const FLAG = [
  'WWWWWWWWWWWWWWWW',
  '.WWWWWGGGGWWWWWW',
  '..WWWGGLLGGWWWWW',
  '...WWGLGGLGWWWWW',
  '....WGGGGGGWWWWW',
  '.....WGGGGWWWWWW',
  '......WWWWWWWWWW',
  '.......WWWWWWWWW',
  '........WWWWWWWW',
  '.........WWWWWWW',
  '..........WWWWWW',
  '...........WWWWW',
  '............WWWW',
  '.............WWW',
  '..............WW',
  '...............W',
];
const FLAG_PAL = { W: '#fcfcfc', G: '#00a800', L: '#b8f818' };
const AXE = [
  '....KKKK........',
  '..KKWWWWKK......',
  '.KWWWWWWWWK.....',
  'KWWWWWWWWWKKKK..',
  'KWWWWWWWWWKBBK..',
  'KWWWWWWWWWKBBK..',
  '.KWWWWWWWWKBBK..',
  '..KKWWWWKKKBBK..',
  '....KKKK..KBBK..',
  '..........KBBK..',
  '..........KBBK..',
  '..........KBBK..',
  '..........KBBK..',
  '..........KBBK..',
  '..........KBBK..',
  '..........KKKK..',
];
const AXE_PAL = { K: '#3c3c3c', W: '#bcbcbc', B: '#fca044' };
const DEBRIS = ['.aabb...', 'abbbbb..', 'abbbbbc.', 'bbbbbbc.', '.bbbbcc.', '..bccc..'];
const LIFT_SEG = ['WWWWWWWW', 'WOOOOOOR', 'WOOWOOOR', 'WOOOOOOR', 'WOOOOWOR', 'WOOOOOOR', 'RRRRRRRR', '.R....R.'];
const LIFT_PAL = { W: '#fcbcb0', O: '#fc9838', R: '#c84c0c' };

// ---------------------------------------------------------------- tiles
const TILE_PAL = {
  over: { a: '#fcbcb0', b: '#c84c0c', c: '#000000' },
  under: { a: '#9cfcf0', b: '#00788c', c: '#00303c' },
  castle: { a: '#fcfcfc', b: '#9c9c9c', c: '#3c3c3c' },
  water: { a: '#fce0a8', b: '#00a844', c: '#005c1c' },
};

const GROUND = [
  'aaaaaaaaaaaaaaac',
  'abbbbbbbbbbbbbbc',
  'abbbbbbbbbbbbbbc',
  'abbbbbcbbbbbbbbc',
  'abbbbbcbbbbbbbbc',
  'abbbbcbbbbbbbbbc',
  'abbbbbbbbbbbbbbc',
  'accbbbbbbbbbbbbc',
  'abbccbbbbbbbbbbc',
  'abbbbbbbbbbbcbbc',
  'abbbbbbbbbbbbcbc',
  'abbbbbbbbbbbbbbc',
  'abbbbbbbcbbbbbbc',
  'abbbbbbbbccbbbbc',
  'abbbbbbbbbbbbbbc',
  'cccccccccccccccc',
];
const BRICK = [
  'aaaaaaacaaaaaaac',
  'bbbbbbbcbbbbbbbc',
  'bbbbbbbcbbbbbbbc',
  'cccccccccccccccc',
  'aaacaaaaaaacaaaa',
  'bbbcbbbbbbbcbbbb',
  'bbbcbbbbbbbcbbbb',
  'cccccccccccccccc',
  'aaaaaaacaaaaaaac',
  'bbbbbbbcbbbbbbbc',
  'bbbbbbbcbbbbbbbc',
  'cccccccccccccccc',
  'aaacaaaaaaacaaaa',
  'bbbcbbbbbbbcbbbb',
  'bbbcbbbbbbbcbbbb',
  'cccccccccccccccc',
];
const BLOCK = [
  'aaaaaaaaaaaaaaac',
  'aaaaaaaaaaaaaacc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'aabbbbbbbbbbbbcc',
  'accccccccccccccc',
  'cccccccccccccccc',
];
const USED = [
  'cccccccccccccccc',
  'cbbbbbbbbbbbbbbc',
  'cbcbbbbbbbbbbcbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbbbbbbbbbbbbbbc',
  'cbcbbbbbbbbbbcbc',
  'cbbbbbbbbbbbbbbc',
  'cccccccccccccccc',
];
const QBLOCK = [
  'oooooooooooooooo',
  'oyyyyyyyyyyyyyyk',
  'oykyyyyyyyyyykyk',
  'oyyyyoooooyyyyyk',
  'oyyyoookkoooyyyk',
  'oyyyookyyyookyyk',
  'oyyyykkyyoookyyk',
  'oyyyyyyyooookyyk',
  'oyyyyyyoookkyyyk',
  'oyyyyyyookyyyyyk',
  'oyyyyyyykkyyyyyk',
  'oyyyyyyooyyyyyyk',
  'oyyyyyyookyyyyyk',
  'oykyyyyykkyyykyk',
  'oyyyyyyyyyyyyyyk',
  'kkkkkkkkkkkkkkkk',
];
const CORAL = [
  '.LLLL..LLLL..LL.',
  'LGGGGLLGGGGLLGGL',
  'LGKGGGLGGKGGLGGL',
  'LGGGGGGGGGGGGGKL',
  '.LGGKGGGGGLGGGL.',
  'LGGGGGLGGGGGKGGL',
  'LGGLGGGGGKGGGGGL',
  'LGKGGGGGGGGGLGGL',
  '.LGGGGKGGGLGGGL.',
  'LGGGLGGGGGGGGKGL',
  'LGGGGGGGKGGGGGGL',
  'LGKGGGLGGGGLGGGL',
  '.LGGGGGGGGGGGGL.',
  'LGGGKGGGLGGKGGGL',
  'LGGGGGGGGGGGGGGL',
  '.LLLLLLLLLLLLLL.',
];
const CORAL_PAL = { L: '#80d010', G: '#00a844', K: '#005c1c' };
const TT_M = [
  'KKKKKKKKKKKKKKKK',
  'LLLLLLLLLLLLLLLL',
  'LLLGLLLLLLLGLLLL',
  'GLLLLLGLLLLLLLGL',
  'GGGGGGGGGGGGGGGG',
  'GGGLGGGGGGGLGGGG',
  'GGGGGGGLGGGGGGGG',
  'GLGGGGGGGGGGGLGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGLGGGGGLGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGLGGGGGLGGGGGGL',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGLGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'KKKKKKKKKKKKKKKK',
];
const TT_L = [
  '....KKKKKKKKKKKK',
  '..KKLLLLLLLLLLLL',
  '.KLLLGLLLLLLLGLL',
  '.KLLLLLLGLLLLLLL',
  'KGGGGGGGGGGGGGGG',
  'KGGLGGGGGGGLGGGG',
  'KGGGGGGGLGGGGGGG',
  'KGGGGGGGGGGGGLGG',
  'KGGGGGGGGGGGGGGG',
  'KGGGGLGGGGGLGGGG',
  'KGGGGGGGGGGGGGGG',
  '.KGGGGGGLGGGGGGL',
  '.KGGGGGGGGGGGGGG',
  '..KKGGLGGGGGGGGG',
  '....KGGGGGGGGGGG',
  '.....KKKKKKKKKKK',
];
const TREE_PAL = { K: '#000000', L: '#b8f818', G: '#00a800' };
const TRUNK = [
  'TTtTTTTTtTTTTtTT',
  'TTtTTTTTtTTTTtTT',
  'TTTtTTTTtTTTtTTT',
  'TTTtTTTtTTTTtTTT',
  'TTtTTTTtTTTTTtTT',
  'TTtTTTTTtTTTTtTT',
  'TTtTTTTTtTTTtTTT',
  'TTTtTTTTtTTTtTTT',
  'TTTtTTTtTTTTtTTT',
  'TTtTTTTtTTTTTtTT',
  'TTtTTTTTtTTTTtTT',
  'TTtTTTTTtTTTtTTT',
  'TTTtTTTTtTTTtTTT',
  'TTTtTTTtTTTTtTTT',
  'TTtTTTTtTTTTTtTT',
  'TTtTTTTTtTTTTtTT',
];
const TRUNK_PAL = { T: '#c84c0c', t: '#7c2c00' };
const MP_M = [
  'KKKKKKKKKKKKKKKK',
  'OOOOOOOOOOOOOOOO',
  'OOWWOOOOOOOWWOOO',
  'OWWWWOOOOOWWWWOO',
  'OOWWOOOOOOOWWOOO',
  'OOOOOOOOOOOOOOOO',
  'OOOOOOWWOOOOOOOO',
  'KKKKKKKKKKKKKKKK',
];
const MP_L = [
  '...KKKKKKKKKKKKK',
  '.KKOOOOOOOOOOOOO',
  'KOOWWOOOOOOOWWOO',
  'KOWWWWOOOOOWWWWO',
  'KOOWWOOOOOOOWWOO',
  '.KOOOOOOOOOOOOOO',
  '..KKOOOOWWOOOOOO',
  '....KKKKKKKKKKKK',
];
const MP_PAL = { K: '#000000', O: '#d82800', W: '#fcbcb0' };
const STEM = Array.from({ length: 16 }, (_, i) => (i % 4 === 1 ? '....KTTtTTTK....' : '....KTTTTtTK....'));
const STEM_PAL = { K: '#000000', T: '#fcbcb0', t: '#c84c0c' };
const BRIDGE = [
  'KKKKKKKKKKKKKKKK',
  'tttttttttttttttt',
  'TTTTTTTTTTTTTTTT',
  'TKTTTTTKTTTTTTKT',
  'TTTTTTTTTTTTTTTT',
  'KKKKKKKKKKKKKKKK',
  '..K..........K..',
  '.K............K.',
];
const BRIDGE_PAL = { K: '#000000', T: '#c84c0c', t: '#fca044' };
const RAIL = [
  'tttttttttttttttt',
  'KKKKKKKKKKKKKKKK',
  '..tt......tt....',
  '..tt......tt....',
  '..tt......tt....',
  '..tt......tt....',
  '..tt......tt....',
  '..tt......tt....',
];
const CBRIDGE = [
  'KKKKKKKKKKKKKKKK',
  'OOOYOOOOOOOYOOOO',
  'OYYYYOOOOOYYYYOO',
  'OOOYOOOOOOOYOOOO',
  'KOOOOKKKKOOOOKKK',
  '.KOOK....KOOK...',
  '..KK......KK....',
];
const CBRIDGE_PAL = { K: '#000000', O: '#c84c0c', Y: '#fca044' };
const LAVA_TOP = [
  '................',
  '................',
  '................',
  '..RR......RR....',
  '.ROOR....ROOR...',
  'ROOOOR..ROOOOR..',
  'OOYOOORROOOYOORR',
  'OOOOOOOOOOOOOOOO',
  'OOOYOOOOOOOOYOOO',
  'OOOOOOOYOOOOOOOO',
  'OOOOOOOOOOOOOOOO',
  'OYOOOOOOOOOYOOOO',
  'OOOOOOYOOOOOOOOO',
  'OOOOOOOOOOOOOOYO',
  'OOOYOOOOOOOOOOOO',
  'OOOOOOOOOYOOOOOO',
];
const LAVA_PAL = { R: '#d82800', O: '#fc7400', Y: '#fcbc3c' };
const CANNON_TOP = [
  '..KKKKKKKKKKKK..',
  '.KDDDDDDDDDDDDK.',
  'KDDWWDDDDDDDDDDK',
  'KDWWDDDDDDDDDDDK',
  'KDDDDDDDDDDDDDDK',
  'KDDDDDKKKKDDDDDK',
  'KDDDDKGGGGKDDDDK',
  'KDDDDKGGGGKDDDDK',
  'KDDDDDKKKKDDDDDK',
  'KDDDDDDDDDDDDDDK',
  'KDDDDDDDDDDDDDDK',
  'KKKKKKKKKKKKKKKK',
  'KGGGGGGGGGGGGGGK',
  'KGWGGGGGGGGGGWGK',
  'KGGGGGGGGGGGGGGK',
  'KKKKKKKKKKKKKKKK',
];
const CANNON_MID = Array.from({ length: 16 }, (_, i) => (i === 0 || i === 15 ? '..KKKKKKKKKKKK..' : (i % 5 === 2 ? '..KGWGGGGGGGGK..' : '..KGGGGGGGGGGK..')));
const CANNON_PAL = { K: '#000000', D: '#3c3c3c', G: '#7c7c7c', W: '#fcfcfc' };
const WAVE = [
  '..WW......WW....',
  '.WLLW....WLLW...',
  'WLLLLW..WLLLLW..',
  'LLLLLLWWLLLLLLWW',
  'LLLLLLLLLLLLLLLL',
  'LLLLLLLLLLLLLLLL',
];
const WAVE_PAL = { W: '#fcfcfc', L: '#5c94fc' };

function pipeColumn(c, lo, hi) {
  // colour key for a pipe column between lo and hi (inclusive outline columns)
  if (c === lo || c === hi) return 'k';
  const p = c - lo;
  if (p === 1 || p === 3) return 'M';
  if (p === 2 || p === 4 || p === 5) return 'L';
  if (hi - c <= 2) return 'D';
  if ((hi - c) % 2 === 1 && hi - c < 9) return 'D';
  return 'M';
}
const PIPE_PAL = { k: '#000000', L: '#b8f818', M: '#00a800', D: '#005800' };
function pipeArt() {
  const top = [], body = [];
  for (let y = 0; y < 16; y++) {
    let r = '', b = '';
    for (let x = 0; x < 32; x++) {
      r += (y === 0 || y === 15) ? 'k' : pipeColumn(x, 0, 31);
      b += (x < 2 || x > 29) ? '.' : pipeColumn(x, 2, 29);
    }
    top.push(r); body.push(b);
  }
  return { top: art(top, PIPE_PAL), body: art(body, PIPE_PAL) };
}

function coinArt(fill) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - 8) / 5, dy = (y + 0.5 - 8) / 7;
      const d = dx * dx + dy * dy;
      if (d > 1) r += '.';
      else if (d > 0.62) r += 'o';
      else if (x === 7 && y > 3 && y < 12) r += 'w';
      else r += 'y';
    }
    rows.push(r);
  }
  return art(rows, { o: '#000000', y: fill, w: '#fce0a8' });
}
// spinning coin frames (popped out of blocks)
function spinCoin(widthFrac) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 16; x++) {
      const rx = Math.max(0.6, 4.5 * widthFrac);
      const dx = (x + 0.5 - 8) / rx, dy = (y + 0.5 - 8) / 7;
      const d = dx * dx + dy * dy;
      r += d > 1 ? '.' : d > 0.55 ? 'o' : 'y';
    }
    rows.push(r);
  }
  return new Spr(art(rows, { o: '#c84c0c', y: '#fcbc3c' }));
}

// pixel "blob" made of circles: clouds, bushes, hills
function blob(w, h, circles, fill, outline, flatBottom, spots) {
  const inside = (x, y) => {
    if (x < 0 || x >= w || y < 0) return false;
    if (y >= h) return flatBottom;
    return circles.some(([cx, cy, r]) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
  };
  const rows = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) { r += '.'; continue; }
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      r += edge ? 'o' : 'f';
    }
    rows.push(r);
  }
  if (spots) for (const [sx, sy] of spots) {
    if (rows[sy] && rows[sy][sx] === 'f') {
      for (let k = 0; k < 2; k++) {
        const row = rows[sy + k];
        if (row) rows[sy + k] = row.slice(0, sx) + 'oo' + row.slice(sx + 2);
      }
    }
  }
  return new Spr(art(rows, { f: fill, o: outline }));
}

function cloudCircles(n) {
  const cs = [];
  for (let i = 0; i < n; i++) {
    const ox = 8 + i * 16;
    cs.push([ox + 4, 14, 7], [ox + 12, 9, 8.5]);
  }
  cs.push([16 * n + 4, 14, 7]);
  return cs;
}

function castleSprite(pal) {
  // 5x5 tiles small castle with battlements, a door and windows
  const c = makeCanvas(80, 80);
  const g = c.getContext('2d');
  const brick = art(BRICK, pal);
  const put = (tx, ty) => g.drawImage(brick, tx * 16, ty * 16);
  for (let tx = 0; tx < 5; tx++) for (let ty = 3; ty < 5; ty++) put(tx, ty);
  for (let tx = 1; tx < 4; tx++) put(tx, 1);
  // battlements
  const bat = (x, y, w) => {
    for (let i = 0; i < w; i += 2) {
      g.drawImage(brick, 0, 0, 8, 8, x + i * 8, y, 8, 8);
    }
    g.drawImage(brick, 0, 0, w * 8, 8, x, y + 8, w * 8, 8);
  };
  bat(0, 32, 10);
  bat(16, 0, 6);
  // door
  g.fillStyle = '#000000';
  g.fillRect(32, 52, 16, 28);
  g.beginPath(); g.arc(40, 52, 8, Math.PI, 0); g.fill();
  // windows
  g.fillRect(24, 24, 6, 10);
  g.fillRect(50, 24, 6, 10);
  return new Spr(c);
}

function liftSprite(w) {
  const c = makeCanvas(w, 8);
  const g = c.getContext('2d');
  const seg = art(LIFT_SEG, LIFT_PAL);
  for (let x = 0; x < w; x += 8) g.drawImage(seg, x, 0);
  return c;
}
const liftCache = new Map();
export function liftImg(w) {
  let c = liftCache.get(w);
  if (!c) { c = liftSprite(w); liftCache.set(w, c); }
  return c;
}

// ---------------------------------------------------------------- build
export const SPR = {};

function buildTiles(name) {
  const p = TILE_PAL[name];
  const tiles = [];
  const ground = name === 'castle' ? art(BRICK, p) : art(GROUND, p);
  tiles[T.GROUND] = ground;
  tiles[T.BRICK] = art(BRICK, p);
  tiles[T.BLOCK] = art(BLOCK, p);
  tiles[T.USED] = art(USED, { b: '#c84c0c', c: '#000000' });
  tiles[T.CORAL] = art(CORAL, CORAL_PAL);
  const pipe = pipeArt();
  tiles[T.PIPE_TL] = slice(pipe.top, 0, 0, 16, 16);
  tiles[T.PIPE_TR] = slice(pipe.top, 16, 0, 16, 16);
  tiles[T.PIPE_L] = slice(pipe.body, 0, 0, 16, 16);
  tiles[T.PIPE_R] = slice(pipe.body, 16, 0, 16, 16);
  // side pipes: rotate the vertical art so the rim faces left
  const sideTop = flipH(rot90(pipe.top));
  const sideBody = flipH(rot90(pipe.body));
  tiles[T.SP_MT] = slice(sideTop, 0, 0, 16, 16);
  tiles[T.SP_MB] = slice(sideTop, 0, 16, 16, 16);
  tiles[T.SP_BT] = slice(sideBody, 0, 0, 16, 16);
  tiles[T.SP_BB] = slice(sideBody, 0, 16, 16, 16);
  tiles[T.TT_M] = art(TT_M, TREE_PAL);
  tiles[T.TT_L] = art(TT_L, TREE_PAL);
  tiles[T.TT_R] = flipH(tiles[T.TT_L]);
  tiles[T.TRUNK] = art(TRUNK, TRUNK_PAL);
  tiles[T.MP_M] = art(MP_M, MP_PAL, { h: 16, top: true });
  tiles[T.MP_L] = art(MP_L, MP_PAL, { h: 16, top: true });
  tiles[T.MP_R] = flipH(tiles[T.MP_L]);
  tiles[T.STEM] = art(STEM, STEM_PAL);
  tiles[T.BRIDGE] = art(BRIDGE, BRIDGE_PAL, { h: 16, top: true });
  tiles[T.RAIL] = art(RAIL, BRIDGE_PAL, { h: 16 });
  tiles[T.CBRIDGE] = art(CBRIDGE, CBRIDGE_PAL, { h: 16, top: true });
  tiles[T.LAVA_TOP] = art(LAVA_TOP, LAVA_PAL);
  tiles[T.LAVA] = art(LAVA_TOP.slice(7).concat(LAVA_TOP.slice(7)), LAVA_PAL, { h: 16 });
  tiles[T.CANNON_TOP] = art(CANNON_TOP, CANNON_PAL);
  tiles[T.CANNON_MID] = art(CANNON_MID, CANNON_PAL);
  tiles[T.CANNON_BASE] = art(BLOCK, { a: '#bcbcbc', b: '#7c7c7c', c: '#000000' });
  tiles[T.WAVE] = art(WAVE, WAVE_PAL, { h: 16 });
  const chain = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 16; x++) {
      const d = (x + y) - 15;
      r += (d === 0 || d === 1) ? ((x + y * 3) % 4 < 2 ? 'g' : 'w') : '.';
    }
    chain.push(r);
  }
  tiles[T.CHAIN] = art(chain, { g: '#7c7c7c', w: '#fcfcfc' });
  // animated tiles
  const qFills = ['#fca044', '#e8902c', '#c87010'];
  tiles.q = qFills.map(f => art(QBLOCK, { o: '#c84c0c', y: f, k: '#000000' }));
  tiles.coin = ['#fcbc3c', '#e09030', '#c87010'].map(f => coinArt(f));
  return tiles;
}

export function buildSprites() {
  SPR.tiles = {};
  for (const name of Object.keys(TILE_PAL)) SPR.tiles[name] = buildTiles(name);

  SPR.hero = {};
  for (const [pn, pal] of Object.entries(HERO_PAL)) {
    const small = {}, big = {};
    for (const [k, lo] of Object.entries(SM_LO)) small[k] = S((k === 'jump' ? SM_UP_JUMP : SM_UP).concat(lo), pal, { h: 16 });
    small.die = S(SM_DIE, pal, { h: 16 });
    for (const [k, lo] of Object.entries(BG_LO)) big[k] = S(BG_UP.concat(lo), pal, { h: 32 });
    big.crouch = S(BG_CROUCH, pal, { h: 32 });
    SPR.hero[pn] = { small, big };
  }

  SPR.walker = S(WALKER, WALKER_PAL);
  SPR.walkerFlat = S(WALKER_FLAT, WALKER_PAL, { h: 16 });
  SPR.walkerDark = S(WALKER, { N: '#00788c', T: '#9cfcf0', K: '#002838', W: '#fcfcfc' });
  SPR.walkerDarkFlat = S(WALKER_FLAT, { N: '#00788c', T: '#9cfcf0', K: '#002838', W: '#fcfcfc' }, { h: 16 });
  SPR.walkerGrey = S(WALKER, { N: '#7c7c7c', T: '#fcfcfc', K: '#000000', W: '#fcfcfc' });
  SPR.walkerGreyFlat = S(WALKER_FLAT, { N: '#7c7c7c', T: '#fcfcfc', K: '#000000', W: '#fcfcfc' }, { h: 16 });
  for (const [name, pal] of [['green', TURTLE_PAL], ['red', TURTLE_RED]]) {
    SPR['turtle_' + name] = [S(TURTLE_A, pal, { h: 24 }), S(TURTLE_B, pal, { h: 24 })];
    SPR['shell_' + name] = S(SHELL, pal, { h: 16 });
    SPR['shellPeek_' + name] = S(SHELL_PEEK, pal, { h: 16 });
  }
  SPR.wing = [S(WING, { W: '#fcfcfc' }), S(WING2, { W: '#fcfcfc' })];
  SPR.plant = [S(PLANT_HEAD_OPEN.concat(PLANT_STEM), PLANT_PAL), S(PLANT_HEAD_SHUT.concat(PLANT_STEM), PLANT_PAL)];
  SPR.fish = [S(FISH_A, FISH_PAL, { h: 16 }), S(FISH_B, FISH_PAL, { h: 16 })];
  SPR.fishGrey = [S(FISH_A, FISH_GREY, { h: 16 }), S(FISH_B, FISH_GREY, { h: 16 })];
  SPR.squid = [S(SQUID_A, SQUID_PAL, { h: 16 }), S(SQUID_B, SQUID_PAL, { h: 16 })];
  SPR.hammerBro = [S(HAMMER_BRO, TURTLE_PAL, { h: 24 }), S(HAMMER_BRO_B, TURTLE_PAL, { h: 24 })];
  SPR.hammer = S(HAMMER, HAMMER_PAL);
  SPR.rider = S(RIDER, RIDER_PAL, { h: 24 });
  SPR.spiny = [S(SPINY_A, SPINY_PAL, { h: 16 }), S(SPINY_B, SPINY_PAL, { h: 16 })];
  SPR.spinyEgg = S(SPINY_EGG, SPINY_PAL, { h: 16 });
  SPR.bullet = S(BULLET, BULLET_PAL, { h: 16 });
  SPR.podoboo = S(PODOBOO, FIRE_PAL, { h: 16 });
  SPR.boss = [S(BOSS_A, BOSS_PAL, { h: 32, w: 32 }), S(BOSS_B, BOSS_PAL, { h: 32, w: 32 })];
  SPR.flame = S(FLAME, FIRE_PAL);
  SPR.captive = S(CAPTIVE, CAPTIVE_PAL, { h: 24 });
  SPR.queen = S(QUEEN, QUEEN_PAL, { h: 32 });
  SPR.mushroom = S(MUSHROOM, MUSH_PAL, { h: 16 });
  SPR.oneup = S(MUSHROOM, ONEUP_PAL, { h: 16 });
  SPR.flower = [
    ['#d82800', '#fca044', '#fcfcfc'], ['#fca044', '#d82800', '#fcfcfc'],
    ['#2038ec', '#5c94fc', '#fcfcfc'], ['#00a800', '#b8f818', '#fcfcfc'],
  ].map(([p, q, c]) => S(FLOWER, { P: p, Q: q, C: c, G: '#00a800' }, { h: 16 }));
  SPR.star = [
    ['#fcbc3c', '#c84c0c'], ['#fcfcfc', '#fc9838'], ['#fc9838', '#d82800'], ['#b8f818', '#00a800'],
  ].map(([y, o]) => S(STAR, { Y: y, O: o, K: '#000000' }, { h: 16 }));
  SPR.fireball = [S(FIREBALL, FIRE_PAL), S(FIREBALL2, FIRE_PAL)];
  SPR.flag = S(FLAG, FLAG_PAL);
  SPR.axe = S(AXE, AXE_PAL);
  SPR.debris = {};
  for (const [name, p] of Object.entries(TILE_PAL)) SPR.debris[name] = S(DEBRIS, p);
  SPR.spinCoin = [1, 0.66, 0.15, 0.66].map(spinCoin);
  SPR.hudCoin = ['#fcbc3c', '#e09030', '#c87010'].map(f => art(['.oo.', 'oyyo', 'oyyo', 'oyyo', 'oyyo', 'oyyo', '.oo.'], { o: '#000000', y: f }));

  // decorations
  SPR.cloud = [1, 2, 3].map(n => blob(16 * n + 16, 24, cloudCircles(n), '#fcfcfc', '#000000', false));
  SPR.cloudNight = [1, 2, 3].map(n => blob(16 * n + 16, 24, cloudCircles(n), '#7c7c7c', '#000000', false));
  SPR.bush = [1, 2, 3].map(n => blob(16 * n + 16, 16, cloudCircles(n).map(([x, y, r]) => [x, y + 2, r]), '#00a800', '#005800', true));
  SPR.hillBig = blob(80, 35, [[40, 40, 38]], '#00a800', '#005800', true, [[30, 14], [46, 20], [38, 26], [58, 27], [20, 28]]);
  SPR.hillSmall = blob(48, 19, [[24, 26, 24]], '#00a800', '#005800', true, [[22, 8], [30, 12]]);
  SPR.castle = castleSprite(TILE_PAL.over);
  SPR.castleNight = castleSprite(TILE_PAL.over);
}

// pick hero palette depending on form/star
export function heroPalette(size, starTimer, frame) {
  if (starTimer > 0) {
    const cyc = ['star1', 'star2', 'star3', size === 2 ? 'fire' : 'normal'];
    const speed = starTimer < 120 ? 8 : 3;
    return cyc[Math.floor(frame / speed) % 4];
  }
  return size === 2 ? 'fire' : 'normal';
}
