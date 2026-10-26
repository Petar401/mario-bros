import { Entity, moveX, moveY, drawOn, GRAVITY } from './base.js';
import { SPR, drawText, liftImg } from '../gfx.js';

// Power-ups rise out of their block before acting.
class Rising extends Entity {
  constructor(tx, ty) {
    super(tx * 16 + 1, ty * 16, 14, 16);
    this.isItem = true;
    this.emerge = 16; this.behind = true;
  }
  rise() {
    if (this.emerge > 0) { this.y -= 1; this.emerge--; if (this.emerge === 0) this.behind = false; return true; }
    return false;
  }
}

export class Mushroom extends Rising {
  constructor(tx, ty, kind = 'power') { super(tx, ty); this.kind = kind; this.vx = 1; }
  update(play) {
    this.t++;
    if (this.rise()) return;
    this.vy = Math.min(this.vy + GRAVITY, 4);
    if (moveX(play, this)) this.vx = -this.vx;
    moveY(play, this);
    if (this.y > 260) this.dead = true;
  }
  hop() { this.vy = -3; }
  draw(ctx, camX) { drawOn(ctx, this.kind === '1up' ? SPR.oneup : SPR.mushroom, this, camX); }
}

export class Flower extends Rising {
  constructor(tx, ty) { super(tx, ty); this.kind = 'flower'; }
  update() { this.t++; this.rise(); }
  hop() {}
  draw(ctx, camX) { drawOn(ctx, SPR.flower[(this.t >> 2) & 3], this, camX); }
}

export class Star extends Rising {
  constructor(tx, ty) { super(tx, ty); this.kind = 'star'; this.vx = 1; }
  update(play) {
    this.t++;
    if (this.rise()) { if (this.emerge === 0) this.vy = -4; return; }
    this.vy = Math.min(this.vy + 0.17, 4);
    if (moveX(play, this)) this.vx = -this.vx;
    moveY(play, this);
    if (this.onGround) this.vy = -4.2;
    if (this.y > 260) this.dead = true;
  }
  hop() { this.vy = -4; }
  draw(ctx, camX) { drawOn(ctx, SPR.star[(this.t >> 2) & 3], this, camX); }
}

export class CoinPop extends Entity {
  constructor(tx, ty) { super(tx * 16, ty * 16 - 16, 16, 16); this.vy = -5; }
  update(play) {
    this.t++;
    this.vy += 0.32; this.y += this.vy;
    if (this.t > 30) { this.dead = true; play.addScore(200, this.cx, this.y, true); }
  }
  draw(ctx, camX) { ctx.drawImage(SPR.spinCoin[(this.t >> 2) & 3].c, Math.round(this.x - camX), Math.round(this.y)); }
}

export class Puff extends Entity {
  constructor(x, y) { super(x - 8, y - 8, 16, 16); }
  update() { if (++this.t > 12) this.dead = true; }
  draw(ctx, camX) {
    const r = 2 + this.t * 0.6;
    ctx.fillStyle = this.t & 2 ? '#fcfcfc' : '#fc7400';
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      ctx.fillRect(Math.round(this.cx + Math.cos(a) * r - 1 - camX), Math.round(this.cy + Math.sin(a) * r - 1), 3, 3);
    }
  }
}

export class Fireball extends Entity {
  constructor(x, y, dir) { super(x, y, 8, 8); this.vx = dir * 4; this.vy = 1.5; this.isFireball = true; }
  update(play) {
    this.t++;
    this.vy = Math.min(this.vy + 0.35, 4);
    if (moveX(play, this)) { this.explode(play); return; }
    moveY(play, this);
    if (this.onGround) this.vy = -2.6;
    if (this.y > 250 || this.x < play.camX - 16 || this.x > play.camX + 272) this.dead = true;
  }
  explode(play) {
    this.dead = true;
    play.spawn(new Puff(this.cx, this.cy));
  }
  draw(ctx, camX) {
    const spr = SPR.fireball[(this.t >> 2) & 1];
    ctx.drawImage(spr.pick((this.t >> 3) & 1, (this.t >> 2) & 1), Math.round(this.x - camX), Math.round(this.y));
  }
}

export class Debris extends Entity {
  constructor(x, y, vx, vy, pal) { super(x, y, 8, 8); this.vx = vx; this.vy = vy; this.pal = pal; }
  update() {
    this.t++;
    this.vy += 0.3; this.x += this.vx; this.y += this.vy;
    if (this.y > 260) this.dead = true;
  }
  draw(ctx, camX) {
    const s = SPR.debris[this.pal] || SPR.debris.over;
    ctx.drawImage(s.pick((this.t >> 2) & 1, (this.t >> 3) & 1), Math.round(this.x - camX), Math.round(this.y));
  }
}

export class ScorePop extends Entity {
  constructor(x, y, text) { super(x, y, 0, 0); this.text = String(text); }
  update() { this.t++; this.y -= 0.8; if (this.t > 40) this.dead = true; }
  draw(ctx, camX) {
    drawText(ctx, this.text, Math.round(this.x - this.text.length * 4 - camX), Math.round(this.y), '#fcfcfc', true);
  }
}

// Moving platforms. mode: 'h' (horizontal), 'v' (vertical), 'loop' (wrapping vertical)
export class Lift extends Entity {
  constructor(x, y, o) {
    super(x, y, (o.w || 3) * 16, 8);
    this.isPlatform = true;
    this.mode = o.mode; this.speed = o.speed || 1;
    this.x0 = x; this.y0 = y;
    this.range = (o.range || 6) * 16;
    this.dir = o.dir || 1;
    this.dx = 0; this.dy = 0;
    if (this.mode === 'v') this.dir = -1;
  }
  update() {
    const ox = this.x, oy = this.y;
    if (this.mode === 'h') {
      this.x += this.dir * this.speed;
      if (this.x > this.x0 + this.range) { this.x = this.x0 + this.range; this.dir = -1; }
      if (this.x < this.x0) { this.x = this.x0; this.dir = 1; }
    } else if (this.mode === 'v') {
      this.y += this.dir * 0.8;
      if (this.y < this.y0 - this.range) { this.y = this.y0 - this.range; this.dir = 1; }
      if (this.y > this.y0) { this.y = this.y0; this.dir = -1; }
    } else {
      this.y += this.dir * 1;
      if (this.y < -16) this.y = 248;
      if (this.y > 248) this.y = -16;
    }
    this.dx = this.x - ox; this.dy = this.y - oy;
    if (Math.abs(this.dy) > 100) this.dy = 0; // wrap
  }
  draw(ctx, camX) { ctx.drawImage(liftImg(this.w), Math.round(this.x - camX), Math.round(this.y)); }
}
