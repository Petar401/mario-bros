import { Entity, GRAVITY, moveX, moveY, groundAhead, drawOn } from './base.js';
import { SPR } from '../gfx.js';

export class Enemy extends Entity {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.isEnemy = true;
    this.stompable = true;
    this.fireproof = false;
    this.invincible = false; // ignores stars/shells/fire
    this.score = 100;
    this.flipped = false;
    this.harmless = false;
    this.dir = -1;
  }
  // knocked out by fire/shell/star/block bump
  kill(play, cause, dirX = 1) {
    if (this.invincible || this.flipped) return false;
    this.flipped = true; this.harmless = true;
    this.vy = -3; this.vx = dirX * 0.8;
    if (cause !== 'chain') play.addScore(this.score, this.cx, this.y);
    play.sfx('kick');
    return true;
  }
  stomp(play) {
    this.kill(play, 'chain');
    return true;
  }
  touch(play) { play.hurtPlayer(this); }
  fall() {
    this.vy = Math.min(this.vy + GRAVITY, 4);
    this.y += this.vy; this.x += this.vx;
    if (this.y > 260) this.dead = true;
  }
  walk(play, turnAtEdges) {
    this.vy = Math.min(this.vy + GRAVITY, 4);
    if (turnAtEdges && this.onGround && !groundAhead(play, this, Math.sign(this.vx))) this.vx = -this.vx;
    if (moveX(play, this)) this.vx = -this.vx;
    moveY(play, this);
    if (this.y > 260) this.dead = true;
  }
}

function themeSprite(play, base) {
  const th = play.area.theme;
  if (th === 'underground') return [SPR[base + 'Dark'], SPR[base + 'DarkFlat']];
  if (th === 'castle') return [SPR[base + 'Grey'], SPR[base + 'GreyFlat']];
  return [SPR[base], SPR[base + 'Flat']];
}

export class Walker extends Enemy {
  constructor(x, bottom) { super(x + 1, bottom - 14, 14, 14); this.vx = -0.5; this.flat = 0; }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    if (this.flat) { if (--this.flat === 0) this.dead = true; return; }
    this.walk(play, false);
  }
  stomp(play) {
    this.flat = 30; this.harmless = true;
    return true;
  }
  draw(ctx, camX, play) {
    const [spr, flat] = themeSprite(play, 'walker');
    if (this.flat) return drawOn(ctx, flat, this, camX);
    drawOn(ctx, spr, this, camX, (this.t >> 3) & 1, this.flipped);
  }
}

export class Turtle extends Enemy {
  constructor(x, bottom, o = {}) {
    super(x + 1, bottom - 22, 14, 22);
    this.red = !!o.red; this.para = !!o.para; this.fly = !!o.fly;
    this.vx = -0.5; this.state = 'walk'; this.timer = 0; this.grace = 0;
    this.y0 = this.y;
    this.chain = 0;
  }
  get color() { return this.red ? 'red' : 'green'; }
  toShell() {
    const b = this.bottom;
    this.h = 14; this.y = b - 14;
    this.state = 'shell'; this.vx = 0; this.timer = 0; this.para = false; this.fly = false;
  }
  update(play) {
    this.t++;
    if (this.grace > 0) this.grace--;
    if (this.flipped) return this.fall();
    if (this.state === 'walk') {
      if (this.fly) {
        this.y = this.y0 + Math.sin(this.t * 0.025) * 40;
        this.x += this.vx * 0.5;
        return;
      }
      if (this.para && this.onGround) this.vy = -3.6;
      this.walk(play, this.red && !this.para);
      const p = play.player;
      if (this.onGround && !this.red && Math.abs(p.cx - this.cx) > 120) { /* keep course */ }
    } else if (this.state === 'shell') {
      this.timer++;
      this.vy = Math.min(this.vy + GRAVITY, 4);
      moveY(play, this);
      if (this.timer > 480) {
        const b = this.bottom; this.h = 22; this.y = b - 22;
        this.state = 'walk'; this.vx = play.player.cx < this.cx ? -0.5 : 0.5;
      }
    } else if (this.state === 'spin') {
      this.walk(play, false);
      if (this.vx === 0) this.vx = 3.5;
      if (Math.abs(this.vx) < 3.5) this.vx = Math.sign(this.vx) * 3.5;
    }
  }
  stomp(play, player) {
    if (this.state === 'walk') {
      if (this.para || this.fly) {
        this.para = false;
        if (this.fly) { this.fly = false; this.vy = 0; }
        return true;
      }
      this.toShell();
      return true;
    }
    if (this.state === 'shell') { this.kick(play, player); return true; }
    if (this.state === 'spin') { this.state = 'shell'; this.vx = 0; this.timer = 0; return true; }
    return true;
  }
  kick(play, player) {
    this.state = 'spin';
    this.vx = player.cx < this.cx ? 3.5 : -3.5;
    this.grace = 12; this.chain = 0;
    play.sfx('kick');
    play.addScore(400, this.cx, this.y);
  }
  touch(play, player) {
    if (this.state === 'shell') { this.kick(play, player); return; }
    if (this.state === 'spin' && this.grace > 0) return;
    play.hurtPlayer(this);
  }
  draw(ctx, camX) {
    const c = this.color;
    if (this.state === 'walk') {
      const spr = SPR['turtle_' + c][(this.t >> 3) & 1];
      const flipX = this.vx > 0;
      drawOn(ctx, spr, this, camX, flipX, this.flipped);
      if (this.para || this.fly) {
        const wing = SPR.wing[(this.t >> 3) & 1];
        const wx = Math.round(this.cx + (flipX ? -10 : 2) - camX);
        ctx.drawImage(wing.pick(flipX), wx, Math.round(this.y + 2));
      }
    } else {
      const peek = this.state === 'shell' && this.timer > 400 && (this.t >> 2) & 1;
      drawOn(ctx, peek ? SPR['shellPeek_' + c] : SPR['shell_' + c], this, camX, false, this.flipped);
    }
  }
}

export class Plant extends Enemy {
  constructor(tx, pipeTop) {
    super(tx * 16 + 10, pipeTop, 12, 22);
    this.base = pipeTop;
    this.behind = true; this.stompable = false;
    this.phase = 'hidden'; this.timer = 40; this.score = 200;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    const p = play.player;
    if (this.phase === 'hidden') {
      this.y = this.base;
      if (--this.timer <= 0) {
        const near = Math.abs(p.cx - this.cx) < 28 && p.bottom <= this.base + 2;
        if (Math.abs(p.cx - this.cx) > 26 && !near) this.phase = 'up';
        else this.timer = 20;
      }
    } else if (this.phase === 'up') {
      this.y -= 0.75;
      if (this.y <= this.base - 24) { this.y = this.base - 24; this.phase = 'show'; this.timer = 70; }
    } else if (this.phase === 'show') {
      if (--this.timer <= 0) this.phase = 'down';
    } else if (this.phase === 'down') {
      this.y += 0.75;
      if (this.y >= this.base) { this.phase = 'hidden'; this.timer = 90; }
    }
    this.harmless = this.y > this.base - 4;
  }
  draw(ctx, camX) {
    const spr = SPR.plant[(this.t >> 3) & 1];
    const x = Math.round(this.cx - 8 - camX);
    const y = Math.round(this.y - 2);
    ctx.drawImage(this.flipped ? spr.fv : spr.c, x, y);
  }
}

export class FishSwim extends Enemy {
  constructor(x, y, grey) {
    super(x, y, 14, 12);
    this.grey = grey; this.vx = grey ? -0.45 : -0.7; this.stompable = false; this.score = 200;
    this.y0 = y;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    this.x += this.vx;
    if (!this.grey) this.y = this.y0 + Math.sin(this.t * 0.03) * 10;
    if (this.x < play.camX - 64) this.dead = true;
  }
  draw(ctx, camX) {
    drawOn(ctx, (this.grey ? SPR.fishGrey : SPR.fish)[(this.t >> 4) & 1], this, camX, this.vx > 0, this.flipped);
  }
}

export class FishJump extends Enemy {
  constructor(x, vx, vy) {
    super(x, 240, 14, 12);
    this.vx = vx; this.vy = vy; this.score = 200;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    this.vy += 0.09; this.x += this.vx; this.y += this.vy;
    if (this.y > 260 && this.vy > 0) this.dead = true;
  }
  stomp(play) { this.kill(play, 'chain'); return true; }
  draw(ctx, camX) {
    drawOn(ctx, SPR.fish[(this.t >> 3) & 1], this, camX, this.vx > 0, this.flipped);
  }
}

export class Squid extends Enemy {
  constructor(x, y) {
    super(x, y, 14, 16); this.stompable = false; this.mode = 'sink'; this.timer = 30; this.score = 200;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    const p = play.player;
    if (this.mode === 'sink') {
      this.vx *= 0.9; this.vy = 0.5;
      if (--this.timer <= 0 && (this.y + 8 >= p.y || this.y > 170)) {
        this.mode = 'rise'; this.timer = 28;
        this.vx = Math.sign(p.cx - this.cx || 1) * 1.3; this.vy = -1.5;
      }
    } else {
      this.vy *= 0.97;
      if (--this.timer <= 0) { this.mode = 'sink'; this.timer = 24; }
    }
    this.x += this.vx; this.y += this.vy;
    if (this.y < 36) this.y = 36;
    if (this.y > 200) this.y = 200;
    if (this.x < play.camX - 64) this.dead = true;
  }
  draw(ctx, camX) {
    drawOn(ctx, SPR.squid[this.mode === 'rise' ? 1 : 0], this, camX, false, this.flipped);
  }
}

export class Hammer extends Enemy {
  constructor(x, y, vx) {
    super(x, y, 8, 8); this.vx = vx; this.vy = -4.2; this.invincible = true; this.stompable = false;
  }
  update(play) {
    this.t++;
    this.vy += 0.18; this.x += this.vx; this.y += this.vy;
    if (this.y > 260) this.dead = true;
  }
  draw(ctx, camX) {
    ctx.save();
    ctx.translate(Math.round(this.cx - camX), Math.round(this.cy));
    ctx.rotate(Math.floor(this.t / 4) * (Math.PI / 2) * Math.sign(this.vx || 1));
    ctx.drawImage(SPR.hammer.c, -4, -4);
    ctx.restore();
  }
}

export class HammerBro extends Enemy {
  constructor(x, bottom) {
    super(x + 1, bottom - 22, 14, 22);
    this.home = this.x; this.vx = 0.5; this.score = 1000;
    this.jumpT = 140; this.throwT = 60; this.noclip = 0; this.burst = 0;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    const p = play.player;
    this.dir = p.cx < this.cx ? -1 : 1;
    if (this.x < this.home - 16) this.vx = 0.5;
    if (this.x > this.home + 16) this.vx = -0.5;
    moveX(play, this);
    if (this.noclip > 0) {
      this.noclip--;
      this.vy = Math.min(this.vy + 0.2, 4);
      this.y += this.vy;
      if (this.vy > 0 && this.noclip === 0) { /* resume collisions */ }
    } else {
      this.vy = Math.min(this.vy + 0.2, 4);
      moveY(play, this);
    }
    if (this.onGround && --this.jumpT <= 0) {
      this.jumpT = 120 + Math.floor(Math.random() * 90);
      const lower = this.bottom > 11 * 16;
      if (lower || Math.random() < 0.3) { this.vy = -6.2; this.noclip = 34; }
      else { this.vy = -2.5; this.noclip = 22; }
    }
    if (--this.throwT <= 0 && play.onScreen(this)) {
      play.spawn(new Hammer(this.cx + this.dir * 4, this.y - 4, this.dir * (1.1 + Math.random() * 0.6)));
      if (this.burst < 2 && Math.random() < 0.6) { this.burst++; this.throwT = 14; }
      else { this.burst = 0; this.throwT = 50 + Math.floor(Math.random() * 50); }
    }
    if (this.y > 260) this.dead = true;
  }
  draw(ctx, camX) {
    drawOn(ctx, SPR.hammerBro[(this.t >> 4) & 1], this, camX, this.dir > 0, this.flipped);
    if (!this.flipped && this.throwT < 12) {
      ctx.drawImage(SPR.hammer.c, Math.round(this.cx + this.dir * 2 - 4 - camX), Math.round(this.y - 8));
    }
  }
}

export class Spiny extends Enemy {
  constructor(x, y, vx) {
    super(x, y, 14, 14); this.vx = vx; this.vy = -3; this.egg = true; this.stompable = false; this.score = 200;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    if (this.egg) {
      this.vy = Math.min(this.vy + 0.15, 4);
      moveX(play, this);
      moveY(play, this);
      if (this.onGround) { this.egg = false; this.vx = play.player.cx < this.cx ? -0.5 : 0.5; }
      if (this.y > 260) this.dead = true;
      return;
    }
    this.walk(play, false);
  }
  draw(ctx, camX) {
    if (this.egg) return drawOn(ctx, SPR.spinyEgg, this, camX, (this.t >> 3) & 1, this.flipped);
    drawOn(ctx, SPR.spiny[(this.t >> 3) & 1], this, camX, this.vx > 0, this.flipped);
  }
}

export class Rider extends Enemy {
  constructor(x) {
    super(x, 36, 16, 22); this.score = 800; this.throwT = 120; this.leaving = false;
  }
  update(play) {
    this.t++;
    if (this.flipped) return this.fall();
    const p = play.player;
    if (play.flags.riderStop) this.leaving = true;
    if (this.leaving) {
      this.x -= 1.5;
      if (this.x < play.camX - 40) this.dead = true;
      return;
    }
    const target = p.cx + p.vx * 30 + Math.sin(this.t * 0.02) * 56;
    this.vx += Math.sign(target - this.cx) * 0.08;
    const lim = 1.2 + Math.abs(p.vx);
    this.vx = Math.max(-lim, Math.min(lim, this.vx));
    this.x += this.vx;
    this.y = 36 + Math.sin(this.t * 0.05) * 3;
    if (--this.throwT <= 0) {
      this.throwT = 140 + Math.floor(Math.random() * 80);
      if (play.countType(Spiny) < 4) play.spawn(new Spiny(this.cx - 7, this.y - 6, Math.sign(p.cx - this.cx) * 0.6));
    }
  }
  kill(play, cause, dirX) {
    const ok = super.kill(play, cause, dirX);
    if (ok) play.flags.riderRespawn = play.frame + 600;
    return ok;
  }
  draw(ctx, camX) {
    const dy = this.throwT < 16 ? -4 : 0;
    drawOn(ctx, SPR.rider, this, camX, false, this.flipped, dy);
  }
}

export class Bullet extends Enemy {
  constructor(x, y, dir) {
    super(x, y, 16, 14); this.vx = dir * 1.2; this.fireproof = true; this.score = 200; this.behindT = 14;
  }
  update(play) {
    this.t++;
    if (this.behindT > 0) this.behindT--;
    this.behind = this.behindT > 0;
    if (this.flipped) return this.fall();
    this.x += this.vx;
    if (this.x < play.camX - 64 || this.x > play.camX + 320) this.dead = true;
  }
  draw(ctx, camX) { drawOn(ctx, SPR.bullet, this, camX, this.vx > 0, this.flipped); }
}

export class Cannon extends Entity {
  constructor(tx, ty) {
    super(tx * 16, ty * 16, 16, 16); this.timer = 90 + Math.floor(Math.random() * 90); this.passive = true;
  }
  update(play) {
    if (!play.onScreen(this)) return;
    if (--this.timer > 0) return;
    this.timer = 150 + Math.floor(Math.random() * 120);
    const p = play.player;
    if (Math.abs(p.cx - this.cx) < 36) return;
    const dir = p.cx < this.cx ? -1 : 1;
    play.spawn(new Bullet(this.x + (dir < 0 ? -2 : 2), this.y + 1, dir));
    play.sfx('cannon');
  }
}

export class Podoboo extends Enemy {
  constructor(x) {
    super(x + 1, 250, 14, 14); this.invincible = true; this.stompable = false; this.wait = 30 + Math.floor(Math.random() * 60);
  }
  update(play) {
    this.t++;
    if (this.wait > 0) { this.wait--; this.y = 250; this.harmless = true; return; }
    this.harmless = false;
    if (this.vy === 0) this.vy = -7.2;
    this.vy += 0.15; this.y += this.vy;
    if (this.y > 250 && this.vy > 0) { this.vy = 0; this.wait = 70 + Math.floor(Math.random() * 60); }
  }
  draw(ctx, camX) { if (this.y < 240) drawOn(ctx, SPR.podoboo, this, camX, false, this.vy > 0); }
}

export class Firebar extends Entity {
  constructor(cx, cy, speed, len) {
    super(cx - 4, cy - 4, 8, 8);
    this.ax = cx; this.ay = cy; this.speed = speed; this.len = len; this.angle = 0;
    this.isHazard = true;
  }
  update() { this.t++; this.angle += this.speed; }
  balls() {
    const out = [];
    for (let i = 0; i < this.len; i++) {
      out.push([this.ax + Math.cos(this.angle) * i * 8, this.ay + Math.sin(this.angle) * i * 8]);
    }
    return out;
  }
  hits(p) {
    const ix = p.x + 2, iy = p.y + 3, iw = p.w - 4, ih = p.h - 5;
    for (const [bx, by] of this.balls()) {
      const nx = Math.max(ix, Math.min(bx, ix + iw)), ny = Math.max(iy, Math.min(by, iy + ih));
      if ((bx - nx) ** 2 + (by - ny) ** 2 < 12) return true;
    }
    return false;
  }
  draw(ctx, camX) {
    const spr = SPR.fireball[(this.t >> 2) & 1].c;
    for (const [bx, by] of this.balls()) ctx.drawImage(spr, Math.round(bx - 4 - camX), Math.round(by - 4));
  }
}

export class Flame extends Enemy {
  constructor(x, y, targetY) {
    super(x, y, 24, 8); this.vx = -1.5; this.targetY = targetY; this.invincible = true; this.stompable = false;
  }
  update(play) {
    this.t++;
    this.x += this.vx;
    if (Math.abs(this.y - this.targetY) > 1) this.y += Math.sign(this.targetY - this.y) * 0.5;
    if (this.x < play.camX - 40) this.dead = true;
  }
  draw(ctx, camX) {
    ctx.drawImage((this.t >> 3) & 1 ? SPR.flame.fv : SPR.flame.c, Math.round(this.x - camX), Math.round(this.y));
  }
}

export class Boss extends Enemy {
  constructor(x, bottom, o = {}) {
    super(x + 2, bottom - 30, 28, 30);
    this.home = this.x; this.vx = -0.4; this.hp = 5; this.score = 5000;
    this.stompable = false; this.invincible = true; this.fireproof = false;
    this.fireT = 90; this.jumpT = 160; this.hammerT = 60; this.hammers = o.hammers; this.mouth = 0;
    this.frozen = false; this.falling = false;
  }
  hitByFire(play) {
    this.hp--;
    play.sfx('bump');
    if (this.hp <= 0) {
      this.invincible = false;
      this.kill(play, 'fire', 0);
    }
  }
  update(play) {
    this.t++;
    if (this.flipped || this.falling) return this.fall();
    if (this.frozen) return;
    const p = play.player;
    if (this.x < this.home - 40) this.vx = 0.4;
    if (this.x > this.home + 24) this.vx = -0.4;
    this.vy = Math.min(this.vy + 0.15, 4);
    moveX(play, this);
    moveY(play, this);
    if (this.onGround && --this.jumpT <= 0) { this.vy = -3.5; this.jumpT = 140 + Math.floor(Math.random() * 120); }
    if (this.mouth > 0) this.mouth--;
    if (--this.fireT <= 0 && play.onScreen(this)) {
      this.fireT = 110 + Math.floor(Math.random() * 100);
      this.mouth = 20;
      const ty = Math.max(this.y - 8, Math.min(p.y + 4, this.y + 16));
      play.spawn(new Flame(this.x - 20, this.y + 6, ty));
      play.sfx('flame');
    }
    if (this.hammers && --this.hammerT <= 0 && play.onScreen(this)) {
      this.hammerT = 30 + Math.floor(Math.random() * 60);
      play.spawn(new Hammer(this.x, this.y - 4, -(0.8 + Math.random() * 1.2)));
    }
    if (this.y > 260) this.dead = true;
  }
  draw(ctx, camX, play) {
    const p = play.player;
    const flipX = p.cx > this.cx + 8;
    drawOn(ctx, SPR.boss[this.mouth > 0 ? 0 : 1], this, camX, flipX, this.flipped);
  }
}

export class Axe extends Entity {
  constructor(x, bottom) { super(x, bottom - 16, 16, 16); }
  update() { this.t++; }
  draw(ctx, camX) { ctx.drawImage(SPR.axe.c, Math.round(this.x - camX), Math.round(this.y + ((this.t >> 4) & 1))); }
}

export class Captive extends Entity {
  constructor(x, bottom, queen) {
    const spr = queen ? SPR.queen : SPR.captive;
    super(x, bottom - spr.h, 16, spr.h); this.spr = spr; this.queen = queen;
  }
  draw(ctx, camX) { ctx.drawImage(this.spr.fh, Math.round(this.x - camX), Math.round(this.y)); }
}

export class Flag extends Entity {
  constructor(tx) {
    super(tx * 16 + 6, 24, 4, 192 - 24);
    this.poleX = tx * 16 + 8;
    this.flagY = 40;
  }
  draw(ctx, camX) {
    const x = Math.round(this.poleX - camX);
    ctx.fillStyle = '#00a800';
    ctx.fillRect(x - 1, 32, 2, 160);
    ctx.fillStyle = '#b8f818';
    ctx.fillRect(x - 1, 32, 1, 160);
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(x, 28, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00a800';
    ctx.beginPath(); ctx.arc(x, 28, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(SPR.flag.c, x - 17, Math.round(this.flagY));
  }
}
