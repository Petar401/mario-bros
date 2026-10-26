// Level areas are built from small hand-designed chunks. A chunk writes tiles
// and entity spawns starting at the area's cursor `a.x` and advances it.
import { T, ROWS, THEMES } from '../tiles.js';

const MAXW = 640;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Area {
  constructor(theme) {
    this.theme = theme;
    this.tiles = new Uint8Array(MAXW * ROWS);
    this.w = 0;
    this.x = 0;
    this.contents = new Map(); // tile index -> block content
    this.ents = [];            // spawn list {type, x (tile), y (row of feet), ...}
    this.deco = [];            // background decorations {type, x, y} in pixels
    this.pipes = [];           // enterable pipes
    this.exits = {};           // named pipe exits {x, y} in pixels
    this.start = { x: 40, y: 208, mode: 'stand' };
    this.castleDoor = null;
    this.bridge = null;
  }
  idx(x, y) { return x * ROWS + y; }
  set(x, y, t) {
    x = Math.floor(x);
    if (x < 0 || x >= MAXW || y < 0 || y >= ROWS) return;
    this.tiles[x * ROWS + y] = t;
    if (x + 1 > this.w) this.w = x + 1;
  }
  get(x, y) {
    if (x < 0 || x >= MAXW || y < 0 || y >= ROWS) return T.EMPTY;
    return this.tiles[x * ROWS + y];
  }
  fill(x0, y0, x1, y1, t) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) this.set(x, y, t);
  }
  ground(x, n, top = 13) { if (n > 0) this.fill(x, top, x + n - 1, ROWS - 1, T.GROUND); }
  ceil(x, n, row = 2) { this.fill(x, row, x + n - 1, row, T.BRICK); }
  cceil(x, n, bottom = 2) { this.fill(x, 2, x + n - 1, bottom, T.GROUND); }
  cfloor(x, n, top = 10) { this.fill(x, top, x + n - 1, ROWS - 1, T.GROUND); }
  lava(x, n) { this.fill(x, 13, x + n - 1, 13, T.LAVA_TOP); this.fill(x, 14, x + n - 1, 14, T.LAVA); }
  wave(x, n) { this.fill(x, 2, x + n - 1, 2, T.WAVE); }
  q(x, y, c = 'coin') { this.set(x, y, T.Q); this.contents.set(this.idx(x, y), c); }
  brick(x, y, c = null) { this.set(x, y, T.BRICK); if (c) this.contents.set(this.idx(x, y), c); }
  hidden(x, y, c = 'coin') { this.set(x, y, T.HIDDEN); this.contents.set(this.idx(x, y), c); }
  coins(x, y, n) { for (let i = 0; i < n; i++) this.set(x + i, y, T.COIN); }
  pipe(x, h, o = {}) {
    const base = o.base ?? 13;
    const top = base - h;
    this.set(x, top, T.PIPE_TL); this.set(x + 1, top, T.PIPE_TR);
    for (let y = top + 1; y < base; y++) { this.set(x, y, T.PIPE_L); this.set(x + 1, y, T.PIPE_R); }
    if (o.enter) this.pipes.push({ kind: 'down', tx: x, ty: top, to: o.enter });
    if (o.warp) this.pipes.push({ kind: 'down', tx: x, ty: top, warp: o.warp });
    if (o.plant) this.e('plant', x, top - 1);
    if (o.exitId) this.exits[o.exitId] = { x: x * 16 + 16, y: top * 16 };
  }
  sidePipe(x, row, bodyLen = 1) {
    this.set(x, row, T.SP_MT); this.set(x, row + 1, T.SP_MB);
    for (let i = 1; i <= bodyLen; i++) { this.set(x + i, row, T.SP_BT); this.set(x + i, row + 1, T.SP_BB); }
  }
  stairs(x, h, dir = 1, base = 13) {
    for (let i = 0; i < h; i++) {
      const height = dir > 0 ? i + 1 : h - i;
      this.fill(x + i, base - height, x + i, base - 1, T.BLOCK);
    }
  }
  cannon(x, h, base = 13) {
    const top = base - h;
    this.set(x, top, T.CANNON_TOP);
    if (h >= 2) this.set(x, top + 1, T.CANNON_MID);
    for (let y = top + 2; y < base; y++) this.set(x, y, T.CANNON_BASE);
    this.e('cannon', x, top);
  }
  tree(x, w, r) {
    this.set(x, r, T.TT_L); this.set(x + w - 1, r, T.TT_R);
    for (let i = 1; i < w - 1; i++) this.set(x + i, r, T.TT_M);
    for (let i = 1; i < w - 1; i++) for (let y = r + 1; y < ROWS; y++) this.set(x + i, y, T.TRUNK);
  }
  mush(x, w, r) {
    this.set(x, r, T.MP_L); this.set(x + w - 1, r, T.MP_R);
    for (let i = 1; i < w - 1; i++) this.set(x + i, r, T.MP_M);
    const sc = x + Math.floor(w / 2) - (w % 2 === 0 ? 1 : 0);
    for (let y = r + 1; y < ROWS; y++) this.set(sc, y, T.STEM);
  }
  bridgeRow(x, w, row) {
    this.fill(x, row, x + w - 1, row, T.BRIDGE);
    this.fill(x, row - 1, x + w - 1, row - 1, T.RAIL);
  }
  e(type, x, y, extra = {}) { this.ents.push({ type, x, y, ...extra }); }
  addDeco(type, x, y, extra = {}) { this.deco.push({ type, x, y, ...extra }); }
  startAt(tx, row, mode = 'stand') { this.start = { x: tx * 16, y: (row + 1) * 16, mode }; }

  finish() {
    this.w = Math.max(this.w, this.x, 16);
    this.tiles = this.tiles.slice(0, this.w * ROWS);
    const th = THEMES[this.theme];
    if (th.deco) this.autoDeco(th.deco === 'clouds');
    this.ents.sort((p, q) => p.x - q.x);
    return this;
  }
  autoDeco(cloudsOnly) {
    const groundAt = (x0, w) => {
      for (let x = x0; x < x0 + w; x++) if (this.get(x, 13) !== T.GROUND || this.get(x, 12) !== T.EMPTY) return false;
      return true;
    };
    for (let base = 0; base < this.w; base += 48) {
      const items = [
        ['hillBig', 0, 5], ['cloud', 8, 1, 3], ['bush', 11, 5, 3], ['hillSmall', 16, 3],
        ['cloud', 19, 1, 1], ['bush', 23, 3, 1], ['cloud', 27, 3, 4], ['cloud', 36, 2, 2], ['bush', 41, 4, 2],
      ];
      for (const [type, dx, w, n] of items) {
        const x = base + dx;
        if (x + w > this.w) continue;
        if (type === 'cloud') { this.deco.push({ type, n: Math.min(n, 3), x: x * 16, y: 48 + ((dx * 7) % 3) * 12 }); continue; }
        if (cloudsOnly || !groundAt(x, w)) continue;
        if (type === 'bush') this.deco.push({ type, n, x: x * 16, y: 13 * 16 - 16 });
        else if (type === 'hillBig') this.deco.push({ type, x: x * 16, y: 13 * 16 - 35 });
        else this.deco.push({ type, x: x * 16, y: 13 * 16 - 19 });
      }
    }
  }
}

const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ------------------------------------------------------------------ chunks
// signature: (area, args[], ctx{ d, rng, world })
export const CHUNKS = {
  // ---- overworld
  start(a, [castle]) {
    const x = a.x; a.ground(x, 16);
    if (castle) a.addDeco('castle', x * 16, 13 * 16 - 80);
    a.startAt(x + 2.5, 12);
    a.x += 16;
  },
  intro(a, _, c) {
    const x = a.x; a.ground(x, 24);
    a.q(x + 6, 9);
    a.brick(x + 10, 9); a.q(x + 11, 9, 'power'); a.brick(x + 12, 9); a.q(x + 13, 9); a.brick(x + 14, 9);
    a.q(x + 12, 5);
    a.e('walker', x + 13, 12);
    if (c.d > 2) a.e('walker', x + 19, 12);
    a.x += 24;
  },
  pipes(a, [bonus], c) {
    const x = a.x; a.ground(x, 30);
    const pl = c.d >= 2;
    a.pipe(x + 2, 2, { plant: pl });
    a.pipe(x + 10, 3, { plant: pl });
    a.pipe(x + 18, 4, bonus ? { enter: { area: 'bonus' } } : { plant: pl });
    a.pipe(x + 26, 4, { plant: pl && c.d >= 4 });
    a.e('walker', x + 14, 12); a.e('walker', x + 22, 12); a.e('walker', x + 23.5, 12);
    a.x += 30;
  },
  gap(a, [n]) { a.x += +n || 2; },
  walkers(a, [n], c) {
    const x = a.x; n = +n || 2; a.ground(x, 16);
    for (let i = 0; i < n; i++) a.e('walker', x + 7 + i * 1.5, 12);
    if (c.d >= 3) a.q(x + 4, 9, c.d >= 6 ? 'coin' : 'power');
    a.x += 16;
  },
  bricks(a, [star]) {
    const x = a.x; a.ground(x, 10); a.ground(x + 12, 18);
    a.brick(x + 3, 9); a.q(x + 4, 9, 'power'); a.brick(x + 5, 9);
    for (let i = 6; i < 14; i++) a.brick(x + i, 5);
    a.e('walker', x + 8, 4); a.e('walker', x + 10, 4);
    for (let i = 16; i < 19; i++) a.brick(x + i, 5);
    a.q(x + 19, 5); a.brick(x + 19, 9, 'multi');
    a.brick(x + 24, 9); a.brick(x + 25, 9, star ? 'star' : null);
    a.e('walker', x + 20, 12); a.e('walker', x + 21.5, 12);
    a.x += 30;
  },
  qblocks(a, _, c) {
    const x = a.x; a.ground(x, 22);
    a.q(x + 4, 9); a.q(x + 7, 9); a.q(x + 10, 9); a.q(x + 7, 5, 'power');
    a.e('turtle', x + 13, 12);
    a.brick(x + 15, 9); a.brick(x + 16, 9);
    a.brick(x + 17, 5); a.q(x + 18, 5); a.q(x + 19, 5); a.brick(x + 20, 5);
    a.brick(x + 18, 9); a.brick(x + 19, 9);
    a.e('walker', x + 17, 12); a.e('walker', x + 18.5, 12);
    if (c.d >= 5) a.e('turtle', x + 20, 12);
    a.x += 22;
  },
  pyramid(a, [h]) {
    h = +h || 4; const x = a.x;
    a.ground(x, 2 * h + 5);
    a.stairs(x + 1, h, 1); a.stairs(x + h + 3, h, -1);
    a.x += 2 * h + 5;
  },
  stairgap(a, [h, g]) {
    h = +h || 4; g = +g || 2; const x = a.x;
    a.ground(x, h + 2);
    a.stairs(x + 1, h, 1);
    a.fill(x + h + 1, 13 - h, x + h + 1, 12, T.BLOCK);
    const x2 = x + h + 2 + g;
    a.ground(x2, h + 3);
    a.fill(x2, 13 - h, x2, 12, T.BLOCK);
    a.stairs(x2 + 1, h, -1);
    a.x = x2 + h + 3;
  },
  turtles(a, _, c) {
    const x = a.x; a.ground(x, 20);
    a.e('turtle', x + 6, 12); a.e('walker', x + 9, 12);
    a.e(c.d >= 2 ? 'para' : 'turtle', x + 13, 12);
    a.q(x + 10, 9); a.brick(x + 11, 9); a.q(x + 12, 9, c.d >= 3 ? 'coin' : 'power');
    a.coins(x + 15, 8, 3);
    a.x += 20;
  },
  paras(a, _, c) {
    const x = a.x;
    a.ground(x, 6); a.ground(x + 9, 4); a.ground(x + 16, 8);
    a.e('para', x + 8, 9); a.e('para', x + 14, 8);
    if (c.d >= 3) a.e('para', x + 20, 10);
    a.brick(x + 10, 9); a.q(x + 11, 9); a.brick(x + 12, 9);
    a.x += 24;
  },
  ledges(a, _, c) {
    const g = 2 + Math.min(2, Math.floor(c.d / 3));
    const x = a.x;
    a.ground(x, 5); a.ground(x + 5 + g, 4); a.ground(x + 9 + 2 * g, 6);
    a.e('walker', x + 6 + g, 12); a.e('turtleRed', x + 11 + 2 * g, 12);
    a.brick(x + 3, 9); a.brick(x + 4, 9);
    a.coins(x + 5 + g, 8, 3);
    if (c.d >= 6) a.e('para', x + 4 + g, 8);
    a.x += 15 + 2 * g;
  },
  cannons(a, _, c) {
    const x = a.x; a.ground(x, 22);
    a.cannon(x + 4, 2); a.cannon(x + 11, 3); a.cannon(x + 18, 2);
    a.e('walker', x + 8, 12); a.e('walker', x + 15, 12);
    if (c.d >= 6) a.e('turtle', x + 20, 12);
    a.x += 22;
  },
  hammers(a, _, c) {
    const x = a.x; a.ground(x, 22);
    a.q(x + 2, 9, c.d >= 7 ? 'coin' : 'power');
    for (let i = 5; i <= 12; i++) a.brick(x + i, 9);
    for (let i = 8; i <= 15; i++) a.brick(x + i, 5);
    a.e('hammer', x + 9, 12);
    a.e('hammer', x + 12, 8);
    a.x += 22;
  },
  lakitu(a) { a.e('lakitu', a.x + 12, 3); },
  lakituEnd(a) { a.e('lakituEnd', a.x, 0); },
  coinArc(a) {
    const x = a.x;
    a.ground(x, 3); a.ground(x + 9, 3);
    a.brick(x + 5, 10); a.brick(x + 6, 10);
    a.coins(x + 3, 7, 1); a.coins(x + 4, 6, 4); a.coins(x + 8, 7, 1);
    a.x += 12;
  },
  ret(a) { const x = a.x; a.ground(x, 8); a.pipe(x + 3, 2, { exitId: 'ret' }); a.x += 8; },
  hidden1up(a) {
    const x = a.x; a.ground(x, 16);
    a.hidden(x + 5, 8, '1up');
    a.brick(x + 9, 9); a.brick(x + 10, 9, 'multi'); a.brick(x + 11, 9);
    a.e('walker', x + 12, 12); a.e('walker', x + 13.5, 12);
    a.x += 16;
  },
  finale(a, [h]) {
    h = h === undefined ? 8 : +h;
    const x = a.x; const W = h + 20;
    a.ground(x, W);
    if (h > 0) { a.stairs(x, h, 1); a.fill(x + h, 13 - h, x + h, 12, T.BLOCK); }
    const px = x + h + (h > 0 ? 9 : 4);
    a.set(px, 12, T.BLOCK);
    a.e('flag', px, 11);
    a.addDeco('castle', (px + 4) * 16, 13 * 16 - 80);
    a.castleDoor = (px + 6) * 16 + 8;
    a.x += W;
  },

  // ---- underground
  ugStart(a) {
    const x = a.x; a.ground(x, 16);
    a.fill(x, 2, x, 12, T.BRICK);
    a.ceil(x + 6, 10);
    a.startAt(x + 3, 1, 'drop');
    a.x += 16;
  },
  ugBricks(a, _, c) {
    const x = a.x; a.ground(x, 24); a.ceil(x, 24);
    a.q(x + 3, 9, 'power'); for (let i = 4; i <= 7; i++) a.q(x + i, 9);
    a.fill(x + 11, 10, x + 11, 12, T.BRICK); a.coins(x + 11, 9, 1);
    a.fill(x + 13, 8, x + 13, 12, T.BRICK); a.coins(x + 13, 7, 1);
    a.fill(x + 15, 10, x + 15, 12, T.BRICK); a.coins(x + 15, 9, 1);
    for (let i = 17; i <= 22; i++) a.brick(x + i, 9);
    a.contents.set(a.idx(x + 19, 9), 'multi');
    if (c.d >= 3) a.contents.set(a.idx(x + 21, 9), 'star');
    a.e('walker', x + 8, 12); a.e('walker', x + 9.5, 12); a.e('turtle', x + 20, 12);
    a.x += 24;
  },
  ugColumns(a, _, c) {
    const x = a.x; a.ground(x, 28); a.ceil(x, 28);
    a.fill(x + 3, 10, x + 3, 12, T.BRICK);
    a.fill(x + 5, 9, x + 6, 12, T.BRICK);
    a.fill(x + 12, 3, x + 18, 4, T.BRICK); a.coins(x + 13, 6, 5);
    a.fill(x + 21, 9, x + 22, 12, T.BRICK); a.coins(x + 21, 8, 2);
    a.e('walker', x + 9, 12); a.e('walker', x + 15, 12); a.e('walker', x + 16.5, 12);
    a.e(c.d >= 3 ? 'turtleRed' : 'turtle', x + 25, 12);
    a.x += 28;
  },
  ugPipes(a, _, c) {
    const x = a.x; a.ground(x, 22); a.ceil(x, 22);
    a.pipe(x + 2, 3, { plant: true }); a.pipe(x + 8, 4, { plant: true }); a.pipe(x + 14, 2, { plant: c.d >= 2 });
    a.e('walker', x + 6, 12); a.e('walker', x + 12, 12); a.e('walker', x + 18, 12);
    a.x += 22;
  },
  ugPits(a, _, c) {
    const x = a.x;
    a.ground(x, 4); a.ground(x + 7, 3); a.ground(x + 13, 9); a.ceil(x, 22);
    for (let i = 4; i <= 6; i++) a.brick(x + i, 9);
    for (let i = 10; i <= 12; i++) a.brick(x + i, 9);
    a.coins(x + 4, 8, 3); a.coins(x + 10, 8, 3);
    a.e('turtle', x + 17, 12);
    if (c.d >= 4) a.e('walker', x + 8, 12);
    a.x += 22;
  },
  ugLifts(a) {
    const x = a.x;
    a.ground(x, 3); a.ground(x + 13, 3); a.ceil(x, 3); a.ceil(x + 13, 3);
    for (const [tx, dir] of [[x + 4, -1], [x + 9, 1]]) {
      a.e('liftLoop', tx, 0, { dir, w: 3, y0: 40 });
      a.e('liftLoop', tx, 0, { dir, w: 3, y0: 160 });
    }
    a.x += 16;
  },
  ugExit(a, worlds) {
    const x = a.x;
    a.ground(x, 10); a.ceil(x, 12);
    a.sidePipe(x + 4, 11, 1);
    a.fill(x + 6, 3, x + 6, 12, T.PIPE_L); a.fill(x + 7, 3, x + 7, 12, T.PIPE_R);
    a.pipes.push({ kind: 'right', tx: x + 4, ty: 11, to: { area: 'outro' } });
    a.fill(x + 8, 3, x + 9, 12, T.BRICK);
    worlds = worlds.filter(Boolean).map(Number);
    if (worlds.length) {
      a.ground(x + 10, 18);
      a.fill(x + 27, 3, x + 27, 12, T.BRICK);
      worlds.forEach((w, i) => {
        a.pipe(x + 14 + i * 4, 3, { warp: w });
        a.addDeco('text', (x + 14 + i * 4) * 16 + 12, 8 * 16, { text: String(w) });
      });
      a.addDeco('text', (x + 12) * 16, 5 * 16, { text: 'WELCOME TO WARP ZONE!' });
      a.x += 28;
    } else {
      a.x += 10;
    }
  },

  // ---- water
  wStart(a) { const x = a.x; a.ground(x, 16); a.wave(x, 16); a.startAt(x + 3, 4, 'drop'); a.x += 16; },
  wCoral(a, _, c) {
    const x = a.x; a.ground(x, 24); a.wave(x, 24);
    a.fill(x + 4, 9, x + 4, 12, T.CORAL);
    a.fill(x + 8, 7, x + 11, 7, T.CORAL);
    a.fill(x + 15, 3, x + 17, 5, T.CORAL);
    a.fill(x + 20, 10, x + 21, 12, T.CORAL);
    a.coins(x + 9, 6, 2); a.coins(x + 16, 11, 2);
    a.e('fishSwim', x + 10, 9); a.e('fishSwim', x + 18, 7, { grey: true }); a.e('squid', x + 14, 9);
    if (c.d >= 4) a.e('squid', x + 22, 7);
    a.x += 24;
  },
  wTrench(a, _, c) {
    const x = a.x; a.ground(x, 4); a.ground(x + 10, 10); a.wave(x, 20);
    a.fill(x + 6, 9, x + 7, 9, T.CORAL);
    a.coins(x + 5, 7, 4);
    a.e('fishSwim', x + 8, 6); a.e('squid', x + 14, 8); a.e('fishSwim', x + 16, 10, { grey: true });
    if (c.d >= 5) a.e('fishSwim', x + 18, 5);
    a.x += 20;
  },
  wWalls(a, _, c) {
    const x = a.x; a.ground(x, 20); a.wave(x, 20);
    a.fill(x + 5, 3, x + 6, 8, T.CORAL);
    a.fill(x + 12, 8, x + 13, 12, T.CORAL);
    a.coins(x + 5, 10, 2); a.coins(x + 12, 5, 2);
    a.e('fishSwim', x + 9, 7); a.e('squid', x + 16, 6);
    if (c.d >= 5) a.e('fishSwim', x + 15, 11, { grey: true });
    a.x += 20;
  },
  wExit(a) {
    const x = a.x; a.ground(x, 18); a.wave(x, 18);
    a.fill(x + 12, 3, x + 17, 10, T.CORAL);
    a.sidePipe(x + 10, 11, 7);
    a.pipes.push({ kind: 'right', tx: x + 10, ty: 11, to: { area: 'outro' } });
    a.x += 18;
  },

  // ---- athletic (sky)
  trees(a, [n], c) { platforms(a, +n || 5, c, 'tree'); },
  mushes(a, [n], c) { platforms(a, +n || 4, c, 'mush'); },
  liftH(a, _, c) {
    const x = a.x;
    a.tree(x, 3, 9);
    a.e('liftH', x + 4, 9, { range: 6, w: 3, speed: c.d >= 5 ? 1.2 : 0.9 });
    a.tree(x + 13, 4, 9);
    a.x += 17;
  },
  liftV(a) {
    const x = a.x;
    a.tree(x, 3, 12);
    a.e('liftV', x + 4, 12, { range: 6, w: 3 });
    a.tree(x + 8, 4, 6);
    a.x += 12;
  },
  bridgeFish(a, [n], c) {
    n = +n || 3;
    const row = 10;
    // steps up to the bridge deck when coming from lower ground
    if (surfaceBefore(a) > row) { a.ground(a.x, 4); a.stairs(a.x + 1, 3, 1); a.x += 4; }
    a.e('fishZone', a.x, 0, { on: true });
    for (let i = 0; i < n; i++) {
      const w = ri(c.rng, 10, 14);
      a.bridgeRow(a.x, w, row);
      if (c.rng() < 0.6) a.e(c.rng() < 0.5 ? 'turtleRed' : 'walker', a.x + w - 3, row - 1);
      if (c.rng() < 0.5) a.q(a.x + 4, row - 4, c.rng() < 0.3 ? 'power' : 'coin');
      a.x += w;
      if (i < n - 1) a.x += ri(c.rng, 2, 3);
    }
    a.x += 2;
    a.e('fishZone', a.x, 0, { on: false });
  },

  // ---- castle
  cStart(a) {
    const x = a.x; a.cceil(x, 16);
    a.fill(x, 8, x + 5, 14, T.GROUND); a.cfloor(x + 6, 10);
    a.startAt(x + 2, 7);
    a.x += 16;
  },
  cLava(a, [w]) {
    w = +w || 3; const x = a.x;
    a.cceil(x, w + 8); a.cfloor(x, 4); a.lava(x + 4, w); a.cfloor(x + 4 + w, 4);
    a.e('podoboo', x + 4 + Math.floor(w / 2), 14);
    a.x += w + 8;
  },
  cBars(a, _, c) {
    const x = a.x; a.cceil(x, 20); a.cfloor(x, 20);
    const sp = 0.03 + c.d * 0.004;
    const len = c.d >= 5 ? 7 : 6;
    a.set(x + 5, 6, T.USED); a.e('firebar', x + 5, 6, { speed: sp, len });
    a.set(x + 12, 9, T.USED); a.e('firebar', x + 12, 9, { speed: -sp, len });
    a.set(x + 17, 5, T.USED); a.e('firebar', x + 17, 5, { speed: sp, len: c.d >= 3 ? len : 5 });
    a.x += 20;
  },
  cLow(a, _, c) {
    const x = a.x; a.cceil(x, 18); a.cfloor(x, 18);
    a.fill(x + 4, 4, x + 13, 6, T.GROUND);
    a.set(x + 9, 10, T.USED); a.e('firebar', x + 9, 10, { speed: 0.04 + c.d * 0.003, len: 5 });
    a.x += 18;
  },
  cPillars(a) {
    const x = a.x; a.cceil(x, 22); a.cfloor(x, 2); a.lava(x + 2, 20);
    for (const [dx, top] of [[4, 9], [8, 8], [12, 9], [16, 8], [19, 10]]) a.fill(x + dx, top, x + dx + 1, 14, T.GROUND);
    for (const dx of [6, 10, 14]) a.e('podoboo', x + dx, 14);
    a.x += 22;
  },
  cLift(a, _, c) {
    const x = a.x; a.cceil(x, 20); a.cfloor(x, 3); a.lava(x + 3, 14); a.cfloor(x + 17, 3);
    a.e('liftH', x + 3, 9, { range: 11, w: 3, speed: c.d >= 5 ? 1.1 : 0.9 });
    a.e('podoboo', x + 9, 14);
    a.x += 20;
  },
  cPreBoss(a) {
    const x = a.x; a.cceil(x, 12); a.cfloor(x, 12);
    a.q(x + 5, 6, 'power');
    a.x += 12;
  },
  cBridge(a, _, c) {
    const x = a.x; a.cceil(x, 32); a.cfloor(x, 2); a.lava(x + 2, 13);
    a.fill(x + 2, 10, x + 14, 10, T.CBRIDGE);
    a.set(x + 14, 9, T.CHAIN);
    a.cfloor(x + 15, 17);
    a.e('axe', x + 15, 9);
    a.e('boss', x + 10, 9, { hammers: c.world >= 6, world: c.world });
    a.e('captive', x + 25, 9, { queen: c.world === 8 });
    a.fill(x + 31, 4, x + 31, 9, T.GROUND);
    a.bridge = { x0: x + 2, x1: x + 14, row: 10, chain: [x + 14, 9] };
    a.x += 32;
  },
};

// current surface row at the cursor (to keep platforms reachable)
function surfaceBefore(a) {
  for (let x = a.x - 1; x >= Math.max(0, a.x - 6); x--) {
    for (let y = 3; y < ROWS; y++) {
      const t = a.get(x, y);
      if (t !== T.EMPTY && t !== T.COIN && t !== T.RAIL) return y;
    }
  }
  return 12;
}

function platforms(a, n, c, kind) {
  let r = surfaceBefore(a);
  for (let i = 0; i < n; i++) {
    const w = ri(c.rng, c.d >= 5 ? 3 : 4, c.d >= 5 ? 6 : 8);
    const gap = ri(c.rng, 1, 3) + (c.d >= 6 && c.rng() < 0.5 ? 1 : 0);
    const up = gap >= 3 ? 2 : 3;
    r = Math.max(5, Math.min(12, r + ri(c.rng, -up, 3)));
    a.x += gap;
    if (kind === 'tree') a.tree(a.x, w, r); else a.mush(a.x, w, r);
    if (w >= 4 && c.rng() < 0.3 + c.d * 0.07) {
      const pick = c.rng();
      const type = pick < 0.4 ? 'walker' : pick < 0.75 ? 'turtleRed' : 'para';
      a.e(type, a.x + w - 2, r - 1);
    }
    if (c.rng() < 0.4) a.coins(a.x + 1, r - 3, Math.min(3, w - 1));
    a.x += w;
  }
  a.x += ri(c.rng, 1, 2);
}

export function bonusRoom() {
  const a = new Area('underground');
  a.ground(0, 16);
  a.fill(0, 2, 0, 12, T.BRICK);
  a.ceil(5, 11);
  a.fill(3, 11, 9, 12, T.BRICK);
  a.coins(3, 10, 7); a.coins(3, 8, 7); a.coins(4, 6, 5);
  a.sidePipe(12, 11, 1);
  a.fill(14, 3, 14, 12, T.PIPE_L); a.fill(15, 3, 15, 12, T.PIPE_R);
  a.pipes.push({ kind: 'right', tx: 12, ty: 11, to: { area: 'main', exit: 'ret' } });
  a.startAt(2, 1, 'drop');
  a.x = 16;
  return a.finish();
}

export function outroArea(theme) {
  const a = new Area(theme);
  a.ground(0, 10);
  a.pipe(2, 2, { exitId: 'start' });
  a.start = { mode: 'rise', exit: 'start' };
  a.x = 10;
  CHUNKS.finale(a, ['8'], {});
  return a.finish();
}
