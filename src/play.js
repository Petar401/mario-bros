// In-level runtime: tiles, entities, collisions, camera and level-end sequences.
import { T, SOLID, ROWS, THEMES, SCREEN_W } from './tiles.js';
import { SPR, drawText } from './gfx.js';
import { Player } from './entities/player.js';
import * as E from './entities/enemies.js';
import * as I from './entities/items.js';
import { drawHUD } from './hud.js';
import { moveX, moveY } from './entities/base.js';

const STOMP_CHAIN = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
const SHELL_CHAIN = [500, 800, 1000, 2000, 4000, 5000, 8000];
const BUMP_DY = [0, -3, -5, -6, -6, -5, -4, -3, -1, 0];
const Q_FRAMES = [0, 0, 0, 0, 1, 2, 1];

export class Play {
  constructor(game, level, opts = {}) {
    this.game = game;
    this.level = level;
    this.frame = 0;
    this.time = level.time;
    this.timeTick = 0;
    this.hurried = this.time <= 100;
    this.flags = { riderRespawn: 0 };
    this.passedCheckpoint = !!opts.checkpoint;
    this.seq = null; this.seqT = 0;
    this.freeze = 0; this.freezeKind = null;
    this.blackout = 0; this.pending = null;
    this.deathT = 0;
    this.message = null;
    this.loadArea(0, opts.checkpoint && level.checkpoint ? { checkpoint: true } : null);
  }

  // ------------------------------------------------------------ areas
  loadArea(i, entry) {
    const src = this.level.areas[i];
    this.areaIndex = i;
    this.area = {
      theme: src.theme, w: src.w, tiles: src.tiles.slice(), contents: new Map(src.contents),
      deco: src.deco, pipes: src.pipes, exits: src.exits, castleDoor: src.castleDoor, bridge: src.bridge,
    };
    this.water = src.theme === 'water';
    this.ents = []; this.platforms = []; this.bumps = [];
    this.spawnList = src.ents; this.spawnIdx = 0;
    this.multiCoin = new Map();
    this.flag = this.axe = this.boss = this.captive = null;
    this.flags.fishZone = false;
    this.flags.riderOn = false; this.flags.riderStop = false;

    const size = this.game.size;
    let x, bottom, rise = null;
    if (entry && entry.checkpoint) {
      x = this.level.checkpoint.x; bottom = this.level.checkpoint.y;
    } else if ((entry && entry.exit) || src.start.mode === 'rise') {
      rise = src.exits[(entry && entry.exit) || src.start.exit];
    } else {
      x = src.start.x; bottom = src.start.y;
    }
    if (rise) { x = rise.x - 6; bottom = rise.y; }
    const p = this.player = new Player(this, x, bottom, size);
    if (rise) {
      p.y = rise.y + 2;
      p.state = 'pipe'; p.behind = true; p.stateT = 0;
      p.pipe = { dir: 'up', frames: p.h + 2 };
      this.game.audio.sfx('pipe');
    }
    this.camX = Math.max(0, Math.min(p.x - 112, this.maxCam()));
    this.spawnAhead(true);
    if (this.player.star <= 0) this.restoreMusic();
  }

  maxCam() { return Math.max(0, this.area.w * 16 - SCREEN_W); }

  restoreMusic() {
    if (this.seq || this.deathT) return;
    this.game.audio.playMusic(THEMES[this.area.theme].music, { fast: this.hurried });
  }

  tileAt(tx, ty) {
    if (ty < 0 || ty >= ROWS) return T.EMPTY;
    if (tx < 0 || tx >= this.area.w) return T.INVIS;
    return this.area.tiles[tx * ROWS + ty];
  }
  solidAt(tx, ty) { return SOLID[this.tileAt(tx, ty)]; }
  setTile(tx, ty, t) { if (tx >= 0 && tx < this.area.w && ty >= 0 && ty < ROWS) this.area.tiles[tx * ROWS + ty] = t; }

  sfx(n) { this.game.audio.sfx(n); }
  spawn(e) { this.ents.push(e); if (e.isPlatform) this.platforms.push(e); return e; }
  onScreen(e) { return e.x + e.w > this.camX - 8 && e.x < this.camX + SCREEN_W + 8; }
  countType(cls) { let n = 0; for (const e of this.ents) if (!e.dead && e instanceof cls && !e.flipped) n++; return n; }
  countFireballs() { let n = 0; for (const e of this.ents) if (!e.dead && e.isFireball) n++; return n; }

  addScore(points, x, y, pop = true) {
    this.game.score += points;
    if (pop) this.spawn(new I.ScorePop(x, y - 8, points));
  }
  addCoin() {
    const g = this.game;
    g.coins++; g.score += 200;
    this.sfx('coin');
    if (g.coins >= 100) { g.coins -= 100; this.oneUp(); }
  }
  oneUp(x, y) {
    this.game.lives = Math.min(99, this.game.lives + 1);
    this.sfx('oneup');
    if (x !== undefined) this.spawn(new I.ScorePop(x, y - 8, '1UP'));
  }

  // ------------------------------------------------------------ spawning
  spawnAhead(initial) {
    const limit = this.camX + SCREEN_W + 24;
    while (this.spawnIdx < this.spawnList.length && this.spawnList[this.spawnIdx].x * 16 <= limit) {
      const s = this.spawnList[this.spawnIdx++];
      if (initial && s.x * 16 < this.camX - 40 && !['lakitu', 'lakituEnd', 'fishZone', 'flag', 'cannon'].includes(s.type)) continue;
      this.makeEntity(s);
    }
  }

  makeEntity(s) {
    const px = s.x * 16, bottom = (s.y + 1) * 16;
    switch (s.type) {
      case 'walker': return this.spawn(new E.Walker(px, bottom));
      case 'turtle': return this.spawn(new E.Turtle(px, bottom, {}));
      case 'turtleRed': return this.spawn(new E.Turtle(px, bottom, { red: true }));
      case 'para': return this.spawn(new E.Turtle(px, bottom, { para: true }));
      case 'plant': return this.spawn(new E.Plant(s.x, bottom));
      case 'fishSwim': return this.spawn(new E.FishSwim(px, bottom - 12, s.grey));
      case 'squid': return this.spawn(new E.Squid(px, bottom - 16));
      case 'hammer': return this.spawn(new E.HammerBro(px, bottom));
      case 'cannon': return this.spawn(new E.Cannon(s.x, s.y));
      case 'liftH': return this.spawn(new I.Lift(px, s.y * 16, { mode: 'h', range: s.range, w: s.w, speed: s.speed }));
      case 'liftV': return this.spawn(new I.Lift(px, s.y * 16, { mode: 'v', range: s.range, w: s.w }));
      case 'liftLoop': return this.spawn(new I.Lift(px, s.y0, { mode: 'loop', dir: s.dir, w: s.w }));
      case 'firebar': return this.spawn(new E.Firebar(px + 8, s.y * 16 + 8, s.speed, s.len));
      case 'podoboo': return this.spawn(new E.Podoboo(px));
      case 'boss': return (this.boss = this.spawn(new E.Boss(px, bottom, s)));
      case 'axe': return (this.axe = this.spawn(new E.Axe(px, bottom)));
      case 'captive': return (this.captive = this.spawn(new E.Captive(px, bottom, s.queen)));
      case 'flag': return (this.flag = this.spawn(new E.Flag(s.x)));
      case 'fishZone': this.flags.fishZone = s.on; this.flags.fishT = 40; return null;
      case 'lakitu': if (!this.flags.riderStop) { this.flags.riderOn = true; this.flags.riderRespawn = 0; } return null;
      case 'lakituEnd': this.flags.riderStop = true; this.flags.riderOn = false; return null;
    }
    return null;
  }

  // ------------------------------------------------------------ update
  update(inp) {
    const p = this.player;
    if (this.blackout > 0) {
      if (--this.blackout === 0 && this.pending) { const f = this.pending; this.pending = null; f(); }
      return;
    }
    if (this.freeze > 0) { this.freezeTick(); return; }
    this.frame++;

    if (p.state === 'dying' || (p.state === 'hidden' && this.deathT)) {
      p.update(inp);
      if (--this.deathT <= 0) this.game.playerDied(this.passedCheckpoint);
      return;
    }

    if (p.state === 'normal' && !this.seq) {
      if (++this.timeTick >= 24) {
        this.timeTick = 0;
        this.time--;
        if (this.time === 100 && !this.hurried) {
          this.hurried = true;
          this.game.audio.playMusic('hurry', { then: THEMES[this.area.theme].music, fast: true });
        }
        if (this.time <= 0) { this.time = 0; this.killPlayer(); return; }
      }
    }

    this.spawnAhead(false);
    for (const pl of this.platforms) pl.update(this);
    if (p.state === 'normal') this.checkPipes(inp);
    p.update(inp);
    for (let i = 0; i < this.ents.length; i++) {
      const e = this.ents[i];
      if (!e.isPlatform && !e.dead) e.update(this);
    }
    this.collisions();
    if (p.state === 'normal') this.collectTiles();
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter(b => b.t < BUMP_DY.length);

    // camera follows forward only
    if (p.state === 'normal' || p.state === 'walk') {
      const target = p.x + p.w / 2 - 112;
      if (target > this.camX) this.camX = Math.min(target, this.maxCam(), this.camX + 4);
    }

    // cleanup
    for (const e of this.ents) {
      if (e.dead) continue;
      if (e === this.boss || e === this.flag || e === this.axe || e === this.captive) continue;
      if (e.x + e.w < this.camX - 96) e.dead = true;
    }
    if (this.ents.some(e => e.dead)) {
      this.ents = this.ents.filter(e => !e.dead);
      this.platforms = this.platforms.filter(e => !e.dead);
    }

    if (p.state === 'normal') {
      if (this.areaIndex === 0 && this.level.checkpoint && p.x >= this.level.checkpoint.x) this.passedCheckpoint = true;
      if (p.y > 240) this.killPlayer(true);
      else if (this.touchesLava(p)) this.killPlayer(true);
    }

    this.spawners();
    this.sequences(inp);
  }

  freezeTick() {
    const p = this.player;
    const k = this.freezeKind;
    this.freeze--;
    const t = k.total - this.freeze;
    p.drawSize = (t >> 2) & 1 ? k.to : k.from;
    if (this.freeze === 0) {
      p.drawSize = null;
      p.setSize(k.to);
      this.game.size = k.to;
      if (k.to < k.from) p.invuln = 120;
    }
  }
  changeSize(to) {
    const p = this.player;
    this.freezeKind = { from: p.size, to, total: 48 };
    this.freeze = 48;
  }

  touchesLava(p) {
    const ty = Math.floor((p.bottom - 4) / 16);
    const l = Math.floor(p.x / 16), r = Math.floor((p.x + p.w - 1) / 16);
    for (let tx = l; tx <= r; tx++) {
      const t = this.tileAt(tx, ty);
      if (t === T.LAVA || t === T.LAVA_TOP) return p.bottom > ty * 16 + 8;
    }
    return false;
  }

  spawners() {
    const p = this.player;
    if (this.flags.riderOn && !this.flags.riderStop && this.frame >= this.flags.riderRespawn && !this.countType(E.Rider)) {
      this.spawn(new E.Rider(this.camX + SCREEN_W + 8));
      this.flags.riderRespawn = Infinity;
    }
    if (this.flags.fishZone && p.state === 'normal') {
      if (--this.flags.fishT <= 0) {
        this.flags.fishT = 35 + Math.floor(Math.random() * 50);
        const x = this.camX + 16 + Math.random() * 224;
        const vx = (0.6 + Math.random() * 1.2) * (Math.random() < 0.75 ? 1 : -1);
        this.spawn(new E.FishJump(x, vx, -(5.2 + Math.random() * 1.2)));
      }
    }
  }

  // ------------------------------------------------------------ collisions
  collisions() {
    const p = this.player;
    const ents = this.ents;
    for (const e of ents) {
      if (e.dead) continue;
      if (e.isFireball) {
        for (const en of ents) {
          if (!en.isEnemy || en.dead || en.flipped || en.harmless || !e.overlaps(en)) continue;
          if (en instanceof E.Boss) en.hitByFire(this);
          else if (!en.fireproof && !en.invincible) en.kill(this, 'fire', Math.sign(e.vx));
          e.explode(this);
          break;
        }
      } else if (e instanceof E.Turtle && e.state === 'spin' && !e.flipped) {
        for (const en of ents) {
          if (en === e || !en.isEnemy || en.dead || en.flipped || en.harmless || en.invincible || !e.overlaps(en)) continue;
          if (en instanceof E.Boss) continue;
          en.kill(this, 'chain', Math.sign(e.vx));
          const v = SHELL_CHAIN[Math.min(e.chain, SHELL_CHAIN.length - 1)];
          e.chain++;
          if (e.chain > SHELL_CHAIN.length) this.oneUp(en.cx, en.y); else this.addScore(v, en.cx, en.y);
        }
      } else if (e.isEnemy && !e.flipped && !e.harmless && e.onGround &&
                 (e instanceof E.Walker || (e instanceof E.Turtle && e.state === 'walk') || (e instanceof E.Spiny && !e.egg))) {
        for (const o of ents) {
          if (o === e || o.dead || o.flipped || o.harmless || !o.isEnemy) continue;
          if (!(o instanceof E.Walker || (o instanceof E.Turtle && o.state === 'walk') || (o instanceof E.Spiny && !o.egg))) continue;
          if (!e.overlaps(o)) continue;
          if (e.vx > 0 && e.cx < o.cx) e.vx = -e.vx;
          else if (e.vx < 0 && e.cx > o.cx) e.vx = -e.vx;
        }
      }
    }

    if (p.state !== 'normal') return;
    for (const e of ents) {
      if (e.dead || p.state !== 'normal') continue;
      if (e.isHazard) {
        if (p.star <= 0 && e.hits(p)) this.hurtPlayer(e);
        continue;
      }
      if (e.isItem) {
        if (e.emerge === 0 && p.overlaps(e)) this.collect(e);
        continue;
      }
      if (!e.isEnemy || e.flipped || e.harmless || !p.overlaps(e)) continue;
      if (p.star > 0) {
        if (!e.invincible) {
          e.kill(this, 'chain', Math.sign(e.cx - p.cx) || 1);
          this.addScore(Math.max(200, e.score), e.cx, e.y);
        }
        continue;
      }
      const falling = p.vy > 0 || p.prevBottom < p.bottom;
      const stomp = e.stompable && !this.water && falling && (p.prevBottom <= e.y + 6 || p.bottom <= e.y + 7);
      if (stomp && e.stomp(this, p)) {
        p.vy = -4; p.jumping = true; p.y = Math.min(p.y, e.y - p.h + 2);
        const v = STOMP_CHAIN[Math.min(p.chain, STOMP_CHAIN.length - 1)];
        if (p.chain >= STOMP_CHAIN.length) this.oneUp(e.cx, e.y);
        else this.addScore(e.score >= 800 ? Math.max(v, e.score) : v, e.cx, e.y);
        p.chain++;
        this.sfx('stomp');
      } else {
        e.touch(this, p);
      }
    }
    if (p.state === 'normal' && this.axe && !this.axe.dead && p.overlaps(this.axe)) this.startAxe();
    if (p.state === 'normal' && this.flag && p.x + p.w >= this.flag.poleX - 9 && p.y + p.h > 24) this.startFlag();
  }

  collectTiles() {
    const p = this.player;
    const l = Math.floor(p.x / 16), r = Math.floor((p.x + p.w - 1) / 16);
    const t0 = Math.floor(p.y / 16), t1 = Math.floor((p.bottom - 1) / 16);
    for (let tx = l; tx <= r; tx++) for (let ty = t0; ty <= t1; ty++) {
      if (this.tileAt(tx, ty) === T.COIN) { this.setTile(tx, ty, T.EMPTY); this.addCoin(); }
    }
  }

  collect(item) {
    const p = this.player;
    item.dead = true;
    if (item.kind === '1up') { this.oneUp(item.cx, item.y); return; }
    this.addScore(1000, item.cx, item.y);
    if (item.kind === 'star') {
      p.star = 660;
      this.game.audio.playMusic('star');
      this.sfx('powerup');
      return;
    }
    this.sfx('powerup');
    if (item.kind === 'power' && p.size === 0) this.changeSize(1);
    else if (item.kind === 'flower') {
      if (p.size === 0) this.changeSize(1);
      else if (p.size === 1) this.changeSize(2);
    }
  }

  hurtPlayer() {
    const p = this.player;
    if (p.invuln > 0 || p.star > 0 || p.state !== 'normal' || this.freeze || this.game.god) return;
    if (p.size > 0) {
      this.sfx('shrink');
      this.changeSize(0);
      p.invuln = 1;
    } else {
      this.killPlayer();
    }
  }

  killPlayer(pit = false) {
    const p = this.player;
    if (p.state === 'dying' || this.deathT) return;
    this.game.size = 0;
    p.size = 0; p.star = 0;
    p.state = pit ? 'hidden' : 'dying';
    p.stateT = 0; p.vx = 0; p.vy = 0;
    if (!pit) { const b = p.bottom; p.h = 14; p.y = b - 14; p.crouch = false; }
    this.deathT = 200;
    this.game.audio.playMusic('death', { loop: false });
  }

  // ------------------------------------------------------------ blocks
  headHit(heads, p) {
    let best = heads[0];
    for (const h of heads) if (Math.abs(h[0] * 16 + 8 - p.cx) < Math.abs(best[0] * 16 + 8 - p.cx)) best = h;
    this.bumpTile(best[0], best[1], p);
  }

  bumpTile(tx, ty, p) {
    const t = this.tileAt(tx, ty);
    const key = tx * ROWS + ty;
    const content = this.area.contents.get(key);
    if (t === T.Q || t === T.HIDDEN || (t === T.BRICK && content)) {
      if (content === 'multi') {
        let m = this.multiCoin.get(key);
        if (!m) { m = { start: this.frame, count: 0 }; this.multiCoin.set(key, m); }
        m.count++;
        this.release('coin', tx, ty, p);
        if (this.frame - m.start > 240 || m.count >= 10) { this.setTile(tx, ty, T.USED); this.area.contents.delete(key); }
      } else {
        this.setTile(tx, ty, T.USED);
        this.area.contents.delete(key);
        this.release(content || 'coin', tx, ty, p);
      }
      this.bumps.push({ tx, ty, t: 0 });
      this.bumpAbove(tx, ty);
    } else if (t === T.BRICK) {
      if (p.size > 0) {
        this.setTile(tx, ty, T.EMPTY);
        const pal = { overworld: 'over', night: 'over', sky: 'over', skyNight: 'over', underground: 'under', castle: 'castle', water: 'water' }[this.area.theme];
        const x = tx * 16, y = ty * 16;
        this.spawn(new I.Debris(x, y, -1, -5, pal)); this.spawn(new I.Debris(x + 8, y, 1, -5, pal));
        this.spawn(new I.Debris(x, y + 8, -1, -3, pal)); this.spawn(new I.Debris(x + 8, y + 8, 1, -3, pal));
        this.game.score += 50;
        this.sfx('break');
      } else {
        this.bumps.push({ tx, ty, t: 0 });
        this.sfx('bump');
      }
      this.bumpAbove(tx, ty);
    } else {
      this.sfx('bump');
    }
  }

  release(content, tx, ty, p) {
    if (content === 'coin') {
      this.spawn(new I.CoinPop(tx, ty));
      const g = this.game;
      g.coins++; this.sfx('coin');
      if (g.coins >= 100) { g.coins -= 100; this.oneUp(); }
      return;
    }
    this.sfx('sprout');
    if (content === 'power') this.spawn(p.size === 0 ? new I.Mushroom(tx, ty, 'power') : new I.Flower(tx, ty));
    else if (content === '1up') this.spawn(new I.Mushroom(tx, ty, '1up'));
    else if (content === 'star') this.spawn(new I.Star(tx, ty));
  }

  bumpAbove(tx, ty) {
    const box = { x: tx * 16, y: ty * 16 - 16, w: 16, h: 16 };
    const hit = (e) => e.x < box.x + box.w && e.x + e.w > box.x && e.y < box.y + box.h && e.y + e.h > box.y;
    for (const e of this.ents) {
      if (e.dead || !hit(e)) continue;
      if (e.isEnemy && !e.flipped && !e.invincible) e.kill(this, 'bump', Math.sign(e.cx - (tx * 16 + 8)) || 1);
      else if (e.isItem && e.emerge === 0) { e.hop(); if (e.vx) e.vx = Math.sign(e.cx - (tx * 16 + 8) || 1) * Math.abs(e.vx); }
    }
    if (this.tileAt(tx, ty - 1) === T.COIN) {
      this.setTile(tx, ty - 1, T.EMPTY);
      this.spawn(new I.CoinPop(tx, ty - 1));
      this.addCoin();
    }
  }

  // ------------------------------------------------------------ pipes
  checkPipes(inp) {
    const p = this.player;
    for (const pp of this.area.pipes) {
      if (pp.kind === 'down' && inp.down && p.onGround) {
        const px = pp.tx * 16;
        if (p.x >= px + 1 && p.x + p.w <= px + 31 && Math.abs(p.bottom - pp.ty * 16) < 1) return this.enterPipe(pp, 'down');
      } else if (pp.kind === 'right' && inp.right) {
        const px = pp.tx * 16, top = pp.ty * 16;
        if (p.x + p.w >= px - 1 && p.x + p.w <= px + 4 && p.bottom > top + 16 && p.bottom <= top + 32.5 && (p.onGround || this.water)) {
          return this.enterPipe(pp, 'right');
        }
      }
    }
  }

  enterPipe(pp, dir) {
    const p = this.player;
    p.state = 'pipe'; p.stateT = 0; p.behind = true; p.vx = 0; p.vy = 0;
    if (dir === 'right') { p.y = pp.ty * 16 + 32 - p.h; p.facing = 1; }
    p.pipe = {
      dir, frames: dir === 'down' ? 32 : 24, after: 'hidden',
      done: () => { this.blackout = 24; this.pending = () => this.pipeTransition(pp); },
    };
    this.sfx('pipe');
    this.game.audio.stopMusic();
  }

  pipeTransition(pp) {
    if (pp.warp) { this.game.warpTo(pp.warp); return; }
    const star = this.player.star;
    this.loadArea(pp.to.area, pp.to.exit ? { exit: pp.to.exit } : null);
    this.player.star = star;
    if (star > 0) this.game.audio.playMusic('star');
  }

  // ------------------------------------------------------------ sequences
  startFlag() {
    const p = this.player;
    const f = this.flag;
    p.state = 'flag'; p.vx = 0; p.vy = 0; p.facing = 1; p.crouch = false;
    p.x = f.poleX - p.w - 1;
    const rel = (p.y - 24) / 160;
    const pts = rel < 0.08 ? 5000 : rel < 0.3 ? 2000 : rel < 0.55 ? 800 : rel < 0.8 ? 400 : 100;
    this.addScore(pts, f.poleX + 16, p.y);
    this.game.audio.stopMusic();
    this.sfx('flagpole');
    this.seq = 'flag'; this.seqT = 0;
  }

  startAxe() {
    const p = this.player;
    p.state = 'frozen'; p.vx = 0; p.vy = 0;
    this.axe.dead = true;
    if (this.boss) this.boss.frozen = true;
    for (const e of this.ents) if (e instanceof E.Flame || e instanceof E.Hammer) e.dead = true;
    this.game.audio.stopMusic();
    const b = this.area.bridge;
    if (b && b.chain) this.setTile(b.chain[0], b.chain[1], T.EMPTY);
    this.seq = 'bridge'; this.seqT = 0;
    this.bridgeIdx = b ? b.x1 : 0;
  }

  // auto-walk the hero with gravity and collisions
  autoWalk(speed) {
    const p = this.player;
    p.facing = 1; p.vx = speed;
    p.vy = Math.min(p.vy + 0.42, 4.5);
    const hx = moveX(this, p);
    moveY(this, p);
    p.anim += 0.25;
    return hx;
  }

  sequences(inp) {
    if (!this.seq) return;
    const p = this.player;
    const f = this.flag;
    this.seqT++;
    switch (this.seq) {
      case 'flag': {
        const poleBottom = 192;
        let done = true;
        if (p.bottom < poleBottom) { p.y = Math.min(p.y + 2, poleBottom - p.h); done = false; }
        if (f.flagY < poleBottom - 18) { f.flagY += 2; done = false; }
        if (done && this.seqT > 30) {
          p.x = f.poleX + 1; p.facing = -1;
          this.seq = 'flagHold'; this.seqT = 0;
        }
        break;
      }
      case 'flagHold':
        if (this.seqT === 20) {
          p.state = 'walk'; p.y = p.y; p.vy = 0;
          this.game.audio.playMusic('clear', { loop: false });
          this.seq = 'walkCastle'; this.seqT = 0;
        }
        break;
      case 'walkCastle': {
        this.autoWalk(1.2);
        const door = this.area.castleDoor ?? (f.poleX + 6 * 16);
        if (p.cx >= door) { p.state = 'hidden'; this.seq = 'tally'; this.seqT = 0; }
        const target = p.x + p.w / 2 - 112;
        if (target > this.camX) this.camX = Math.min(target, this.maxCam());
        break;
      }
      case 'tally':
        if (this.seqT < 90) break;
        if (this.time > 0) {
          const step = Math.min(this.time, 2);
          this.time -= step; this.game.score += 50 * step;
          if (this.seqT % 4 === 0) this.sfx('beep');
        } else if (!this.tallyDone) {
          this.tallyDone = this.seqT;
        } else if (this.seqT - this.tallyDone > 70) {
          this.seq = null;
          this.game.levelComplete();
        }
        break;
      case 'bridge': {
        const b = this.area.bridge;
        if (b && this.seqT % 4 === 0 && this.bridgeIdx >= b.x0) {
          this.setTile(this.bridgeIdx, b.row, T.EMPTY);
          this.bridgeIdx--;
          if (this.bridgeIdx % 2 === 0) this.sfx('break');
        }
        if (!b || this.bridgeIdx < b.x0) {
          if (this.boss && !this.boss.dead && !this.boss.flipped && !this.boss.falling) {
            this.boss.falling = true; this.boss.vy = -1; this.sfx('bossfall');
          }
          this.seq = 'bossFall'; this.seqT = 0;
        }
        break;
      }
      case 'bossFall':
        if (this.seqT === 70) {
          p.state = 'walk';
          this.game.audio.playMusic('worldClear', { loop: false });
          this.seq = 'walkCaptive'; this.seqT = 0;
        }
        break;
      case 'walkCaptive': {
        const c = this.captive;
        const stopX = c ? c.x - 24 : this.area.w * 16 - 64;
        if (p.x < stopX) this.autoWalk(1.2);
        else { p.anim = 0; p.vx = 0; this.seq = 'message'; this.seqT = 0; }
        const target = p.x + p.w / 2 - 112;
        if (target > this.camX) this.camX = Math.min(target, this.maxCam());
        break;
      }
      case 'message': {
        const final = this.level.world === 8;
        this.message = final
          ? ['THANK YOU HERO!', '', 'YOUR QUEST IS OVER.', 'THE KINGDOM IS SAVED!']
          : ['THANK YOU HERO!', '', 'BUT OUR QUEEN IS HELD', 'IN ANOTHER FORTRESS!'];
        if (this.seqT > 60 && this.time > 0) {
          const step = Math.min(this.time, 2);
          this.time -= step; this.game.score += 50 * step;
          if (this.seqT % 4 === 0) this.sfx('beep');
        }
        if (this.seqT > 360 && this.time === 0) { this.seq = null; this.game.levelComplete(); }
        break;
      }
    }
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const th = THEMES[this.area.theme];
    ctx.fillStyle = this.blackout > 0 ? '#000000' : th.bg;
    ctx.fillRect(0, 0, 256, 240);
    if (this.blackout > 0) { drawHUD(ctx, this.game, this.time); return; }
    const camX = Math.round(this.camX);
    const night = th.bg === '#000000';
    for (const d of this.area.deco) {
      if (d.x > camX + 256 || d.x + 96 < camX) continue;
      let spr = null;
      switch (d.type) {
        case 'cloud': spr = (night ? SPR.cloudNight : SPR.cloud)[d.n - 1]; break;
        case 'bush': spr = SPR.bush[d.n - 1]; break;
        case 'hillBig': spr = SPR.hillBig; break;
        case 'hillSmall': spr = SPR.hillSmall; break;
        case 'castle': spr = SPR.castle; break;
        case 'text': drawText(ctx, d.text, d.x - camX, d.y); continue;
      }
      if (spr) ctx.drawImage(spr.c, d.x - camX, d.y);
    }
    for (const e of this.ents) if (e.behind && !e.dead) e.draw(ctx, camX, this);
    if (this.player.behind) this.player.draw(ctx, camX);
    this.drawTiles(ctx, camX, th);
    for (const e of this.ents) if (!e.behind && !e.dead && !e.isPlatform) e.draw(ctx, camX, this);
    for (const e of this.platforms) e.draw(ctx, camX, this);
    if (!this.player.behind) this.player.draw(ctx, camX);
    drawHUD(ctx, this.game, this.time);
    if (this.message && this.seq === 'message') {
      this.message.forEach((line, i) => {
        if (this.seqT > 20 + i * 30) drawText(ctx, line, 128 - line.length * 4, 72 + i * 16);
      });
    }
  }

  drawTiles(ctx, camX, th) {
    const ts = SPR.tiles[th.tiles];
    const c0 = Math.max(0, Math.floor(camX / 16)), c1 = Math.min(this.area.w - 1, c0 + 16);
    const qf = Q_FRAMES[Math.floor(this.frame / 8) % Q_FRAMES.length];
    const tiles = this.area.tiles;
    for (let tx = c0; tx <= c1; tx++) {
      for (let ty = 0; ty < ROWS; ty++) {
        const t = tiles[tx * ROWS + ty];
        if (!t || t === T.HIDDEN || t === T.INVIS) continue;
        const img = t === T.Q ? ts.q[qf] : t === T.COIN ? ts.coin[qf] : ts[t];
        if (!img) continue;
        let dy = 0;
        if (this.bumps.length) for (const b of this.bumps) if (b.tx === tx && b.ty === ty) dy = BUMP_DY[b.t];
        ctx.drawImage(img, tx * 16 - camX, ty * 16 + dy);
      }
    }
  }
}

