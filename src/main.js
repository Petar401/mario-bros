import { buildSprites, drawText, SPR, heroPalette } from './gfx.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { buildLevel } from './level/worlds.js';
import { Play } from './play.js';
import { drawHUD } from './hud.js';
import { T } from './tiles.js';
import * as store from './storage.js';

const STEP = 1000 / 60;
const params = new URLSearchParams(location.search);

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input();
    this.audio = new Audio();
    this.save = store.load();
    this.audio.muted = this.save.muted;
    this.top = this.save.top;
    this.score = 0; this.coins = 0; this.lives = 3; this.size = 0;
    this.world = 0; this.lvl = 0;
    this.tick = 0;
    this.scene = 'title'; this.sceneT = 0;
    this.menu = 0;
    this.paused = false;
    this.touch = false;
    this.god = params.has('god');
  }

  // ---------------------------------------------------------- flow
  newGame(world = 1, lvl = 1) {
    this.score = 0; this.coins = 0; this.lives = this.god ? 99 : 3; this.size = 0;
    this.world = world; this.lvl = lvl;
    this.toIntro(false);
  }
  toIntro(checkpoint) {
    this.scene = 'intro'; this.sceneT = 0;
    this.checkpoint = checkpoint;
    this.play = null;
    this.audio.stopMusic();
  }
  startLevel() {
    this.level = buildLevel(this.world, this.lvl);
    this.play = new Play(this, this.level, { checkpoint: this.checkpoint });
    this.scene = 'play'; this.sceneT = 0;
  }
  playerDied(checkpoint) {
    this.lives--;
    this.size = 0;
    if (this.lives <= 0) {
      this.scene = 'gameover'; this.sceneT = 0;
      this.audio.playMusic('gameover', { loop: false });
      this.persist();
    } else {
      this.toIntro(checkpoint);
    }
  }
  levelComplete() {
    this.lvl++;
    if (this.lvl > 4) { this.lvl = 1; this.world++; }
    if (this.world > 8) {
      this.scene = 'ending'; this.sceneT = 0;
      this.world = 8; this.lvl = 4;
      this.audio.playMusic('athletic');
      this.persist();
      return;
    }
    this.persist();
    this.toIntro(false);
  }
  warpTo(world) {
    this.world = world; this.lvl = 1;
    this.persist();
    this.toIntro(false);
  }
  persist() {
    this.top = Math.max(this.top, this.score);
    this.save.top = this.top;
    this.save.unlocked = Math.max(this.save.unlocked || 1, Math.min(8, this.world || 1));
    this.save.muted = this.audio.muted;
    store.save(this.save);
  }

  // ---------------------------------------------------------- update
  update() {
    const inp = this.input;
    inp.poll();
    this.tick++;
    this.sceneT++;
    if (inp.pressed.mute) {
      this.audio.setMuted(!this.audio.muted);
      this.save.muted = this.audio.muted; store.save(this.save);
    }
    switch (this.scene) {
      case 'title': {
        const opts = this.save.unlocked > 1 ? 2 : 1;
        if (inp.pressed.down || inp.pressed.up) { this.menu = (this.menu + 1) % opts; this.audio.sfx('select'); }
        if (this.menu >= opts) this.menu = 0;
        if (this.sceneT > 20 && (inp.pressed.start || inp.pressed.tap)) {
          this.newGame(this.menu === 1 ? this.save.unlocked : 1);
        }
        break;
      }
      case 'intro':
        if (this.sceneT > 150) this.startLevel();
        break;
      case 'play':
        if (inp.pressed.start && !this.play.seq && this.play.player.state === 'normal') {
          this.paused = !this.paused;
          this.audio.sfx('pause');
          if (this.paused) this.audio.musicBus && this.audio.musicBus.gain.setTargetAtTime(0.15, this.audio.ctx.currentTime, 0.05);
          else this.audio.musicBus && this.audio.musicBus.gain.setTargetAtTime(0.8, this.audio.ctx.currentTime, 0.05);
        }
        if (!this.paused) this.play.update(inp);
        if (this.score > this.top) this.top = this.score;
        break;
      case 'gameover':
        if (this.sceneT > 280 || (this.sceneT > 60 && (inp.pressed.start || inp.pressed.tap))) {
          this.scene = 'title'; this.sceneT = 0; this.world = 0;
          this.menu = this.save.unlocked > 1 ? 1 : 0;
          this.audio.stopMusic();
        }
        break;
      case 'ending':
        if (this.sceneT > 240 && (inp.pressed.start || inp.pressed.tap)) {
          this.scene = 'title'; this.sceneT = 0; this.world = 0; this.audio.stopMusic();
        }
        break;
    }
  }

  // ---------------------------------------------------------- draw
  draw() {
    const ctx = this.ctx;
    switch (this.scene) {
      case 'title': this.drawTitle(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'play':
        this.play.draw(ctx);
        if (this.paused) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 100, 256, 40);
          drawText(ctx, 'PAUSE', 108, 116);
        }
        break;
      case 'gameover':
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 240);
        drawHUD(ctx, this);
        drawText(ctx, 'GAME OVER', 92, 112);
        break;
      case 'ending': this.drawEnding(ctx); break;
    }
  }

  drawBackdrop(ctx) {
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, 256, 240);
    ctx.drawImage(SPR.hillBig.c, 0, 13 * 16 - 35);
    ctx.drawImage(SPR.cloud[0].c, 140, 50);
    ctx.drawImage(SPR.cloud[1].c, 24, 36);
    ctx.drawImage(SPR.bush[2].c, 168, 13 * 16 - 16);
    ctx.drawImage(SPR.hillSmall.c, 200, 13 * 16 - 19);
    const g = SPR.tiles.over[T.GROUND];
    for (let x = 0; x < 16; x++) { ctx.drawImage(g, x * 16, 208); ctx.drawImage(g, x * 16, 224); }
  }

  drawTitle(ctx) {
    this.drawBackdrop(ctx);
    drawHUD(ctx, this);
    // title panel
    ctx.fillStyle = '#000000'; ctx.fillRect(38, 44, 180, 76);
    ctx.fillStyle = '#c84c0c'; ctx.fillRect(40, 46, 176, 72);
    ctx.fillStyle = '#fcbcb0';
    ctx.fillRect(40, 46, 176, 2); ctx.fillRect(40, 46, 2, 72);
    for (const [x, y] of [[44, 50], [208, 50], [44, 110], [208, 110]]) { ctx.fillStyle = '#000'; ctx.fillRect(x, y, 4, 4); }
    drawText(ctx, 'SUPER', 52, 58, '#fcbcb0', true);
    drawText(ctx, 'PLUMBER', 84, 74, '#fcfcfc', true);
    drawText(ctx, 'QUEST', 140, 90, '#fcbcb0', true);
    drawText(ctx, '8 WORLDS * 32 LEVELS', 48, 106, '#fce0a8');
    const hero = SPR.hero.normal.small.stand;
    ctx.drawImage(hero.c, 40, 192);

    const items = ['1 PLAYER GAME'];
    if (this.save.unlocked > 1) items.push(`CONTINUE WORLD ${this.save.unlocked}`);
    items.forEach((t, i) => {
      drawText(ctx, t, 72, 136 + i * 14);
      if (this.menu === i) drawText(ctx, '>', 60, 136 + i * 14);
    });
    drawText(ctx, 'TOP- ' + String(this.top).padStart(6, '0'), 80, 168);
    const hint = this.touch ? 'TAP TO START' : 'PRESS ENTER TO START';
    if ((this.tick >> 5) & 1) drawText(ctx, hint, 128 - hint.length * 4, 184, '#fcfcfc', true);
    if (!this.touch) drawText(ctx, 'ARROWS MOVE Z JUMP X RUN', 32, 224, '#fcfcfc');
  }

  drawIntro(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 240);
    drawHUD(ctx, this);
    drawText(ctx, `WORLD ${this.world}-${this.lvl}`, 88, 80);
    const hero = SPR.hero[heroPalette(this.size, 0, 0)].small.stand;
    ctx.drawImage(hero.c, 96, 108);
    drawText(ctx, '* ' + this.lives, 120, 112);
    if (this.checkpoint) drawText(ctx, 'CHECKPOINT', 88, 144, '#fca044');
  }

  drawEnding(ctx) {
    this.drawBackdrop(ctx);
    drawHUD(ctx, this);
    ctx.drawImage(SPR.queen.fh, 140, 176);
    ctx.drawImage(SPR.hero.normal.small.stand.c, 112, 192);
    const lines = ['CONGRATULATIONS!', '', 'THE QUEEN IS FREE AND', 'THE KINGDOM IS SAVED.', '', 'THANKS FOR PLAYING!'];
    lines.forEach((l, i) => { if (this.sceneT > i * 30) drawText(ctx, l, 128 - l.length * 4, 56 + i * 14, '#fcfcfc', true); });
    if (this.sceneT > 240 && (this.tick >> 5) & 1) drawText(ctx, 'PRESS START', 84, 160, '#fcfcfc', true);
  }
}

// ------------------------------------------------------------ boot
function fit(canvas) {
  const touchUI = document.body.classList.contains('touch');
  const W = window.innerWidth, H = window.innerHeight;
  const portrait = H > W;
  let availH = H, availW = W;
  if (touchUI && portrait) availH = H * 0.62;
  let s = Math.min(availW / 256, availH / 240);
  if (s >= 2) s = Math.floor(s * 2) / 2;
  canvas.style.width = Math.floor(256 * s) + 'px';
  canvas.style.height = Math.floor(240 * s) + 'px';
}

function boot() {
  buildSprites();
  const canvas = document.getElementById('screen');
  const game = new Game(canvas);
  window.__game = game;
  const unlock = () => game.audio.unlock();
  game.input.onGesture = unlock;
  game.input.attach();
  const touchRoot = document.getElementById('touch');
  game.input.attachTouch(touchRoot);
  canvas.addEventListener('pointerdown', (e) => { unlock(); game.input.taps.add('tap'); e.preventDefault(); });

  const enableTouch = () => {
    if (game.touch) return;
    game.touch = true;
    document.body.classList.add('touch');
    fit(canvas);
  };
  if (params.has('touch') || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) enableTouch();
  window.addEventListener('touchstart', enableTouch, { passive: true });
  window.addEventListener('resize', () => fit(canvas));
  fit(canvas);

  const lvl = params.get('level');
  if (lvl && /^[1-8]-[1-4]$/.test(lvl)) {
    const [w, l] = lvl.split('-').map(Number);
    game.newGame(w, l);
    game.sceneT = 150;
  }

  let last = performance.now(), acc = 0;
  const frame = (now) => {
    acc += Math.min(250, now - last);
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 5) { game.update(); acc -= STEP; steps++; }
    if (steps) game.draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.scene === 'play' && !game.paused && game.play.player.state === 'normal') {
      game.paused = true;
    }
  });
}

boot();
