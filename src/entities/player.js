import { Entity, moveX, moveY } from './base.js';
import { SPR, heroPalette } from '../gfx.js';
import { Fireball } from './items.js';

export class Player extends Entity {
  constructor(play, x, bottom, size) {
    const h = size ? 28 : 14;
    super(x, bottom - h, 12, h);
    this.play = play;
    this.size = size;          // 0 small, 1 big, 2 fire
    this.facing = 1;
    this.state = 'normal';     // normal | dying | pipe | flag | walk | hidden | frozen
    this.anim = 0;
    this.star = 0;
    this.invuln = 0;
    this.chain = 0;
    this.ride = null;
    this.crouch = false;
    this.skid = false;
    this.jumping = false;
    this.throwT = 0;
    this.stateT = 0;
    this.airMax = 1.5;
    this.jumpBuf = 0;
    this.prevBottom = this.bottom;
    this.drawSize = null;      // used by grow/shrink flicker
    this.pipe = null;
  }

  setSize(s) {
    const b = this.bottom;
    this.size = s;
    if (!s) this.crouch = false;
    this.h = s && !this.crouch ? 28 : 14;
    this.y = b - this.h;
  }

  canStand() {
    const play = this.play;
    const top = this.bottom - 28;
    const l = Math.floor(this.x / 16), r = Math.floor((this.x + this.w - 1) / 16);
    for (let ty = Math.floor(top / 16); ty <= Math.floor((this.bottom - 15) / 16); ty++)
      for (let tx = l; tx <= r; tx++) if (play.solidAt(tx, ty)) return false;
    return true;
  }

  update(inp) {
    const play = this.play;
    if (this.state !== 'normal') return this.updateSpecial(inp);
    if (this.star > 0) {
      this.star--;
      if (this.star === 0) play.restoreMusic();
    }
    if (this.invuln > 0) this.invuln--;
    if (this.throwT > 0) this.throwT--;
    if (inp.pressed.jump) this.jumpBuf = 6; else if (this.jumpBuf > 0) this.jumpBuf--;

    const water = play.water;
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    // crouching (big forms only)
    const wantCrouch = this.size > 0 && inp.down && this.onGround && !water;
    if (wantCrouch && !this.crouch) {
      this.crouch = true; const b = this.bottom; this.h = 14; this.y = b - 14;
    } else if (!wantCrouch && this.crouch && (this.size === 0 || this.canStand())) {
      this.crouch = false; const b = this.bottom; this.h = this.size ? 28 : 14; this.y = b - this.h;
    }
    if (this.crouch && this.onGround) dir = 0;

    // riding a lift
    if (this.ride) { this.x += this.ride.dx; this.y += this.ride.dy; }

    if (water) {
      const max = this.onGround ? 1.0 : 1.5;
      if (dir) {
        this.vx += dir * 0.04;
        if (Math.abs(this.vx) > max) this.vx = Math.sign(this.vx) * max;
        this.facing = dir;
      } else if (this.onGround) {
        this.vx = Math.abs(this.vx) < 0.05 ? 0 : this.vx - Math.sign(this.vx) * 0.05;
      }
      if (inp.pressed.jump) { this.vy = -2.2; play.sfx('swim'); this.jumping = true; this.anim += 1; }
      this.vy = Math.min(this.vy + 0.05, 1.6);
    } else {
      const run = inp.run;
      if (this.onGround) {
        if (dir) {
          if (this.vx * dir < 0) {
            this.vx += dir * 0.11; this.skid = true;
          } else {
            this.skid = false;
            const max = run ? 2.5 : 1.5;
            if (Math.abs(this.vx) < max) this.vx += dir * (run ? 0.065 : 0.05);
            else this.vx -= Math.sign(this.vx) * 0.03;
          }
          this.facing = dir;
        } else {
          this.skid = false;
          const f = this.crouch ? 0.03 : 0.05;
          this.vx = Math.abs(this.vx) < f ? 0 : this.vx - Math.sign(this.vx) * f;
        }
      } else if (dir) {
        const max = Math.max(run ? 2.5 : 1.5, this.airMax);
        this.vx += dir * 0.05;
        if (Math.abs(this.vx) > max) this.vx = Math.sign(this.vx) * max;
      }
      if (this.jumpBuf > 0 && this.onGround) {
        const s = Math.abs(this.vx);
        this.vy = s > 2.0 ? -4.6 : s > 1.0 ? -4.4 : -4.25;
        this.jumping = true; this.jumpBuf = 0;
        this.airMax = Math.max(1.5, s);
        this.onGround = false; this.ride = null;
        play.sfx(this.size ? 'bigjump' : 'jump');
      }
      const g = this.vy < 0 && inp.jump ? 0.12 : 0.42;
      this.vy = Math.min(this.vy + g, 4.5);
    }

    // movement & collisions
    if (moveX(play, this)) this.vx = 0;
    if (this.x < play.camX) { this.x = play.camX; if (this.vx < 0) this.vx = 0; }
    const maxX = play.area.w * 16 - this.w;
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }
    this.prevBottom = this.bottom;
    const heads = moveY(play, this, true);
    if (heads) { play.headHit(heads, this); this.jumping = false; this.vy = 1; }
    this.ride = null;
    if (this.vy >= 0) {
      for (const p of play.platforms) {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.prevBottom <= p.y + Math.max(0, p.dy) + 2 && this.bottom >= p.y) {
          this.y = p.y - this.h; this.vy = 0; this.onGround = true; this.ride = p;
        }
      }
    }
    if (water && this.y < 28) { this.y = 28; if (this.vy < 0) this.vy = 0; }
    if (this.onGround) { this.chain = 0; this.jumping = false; this.airMax = 1.5; }

    // fire
    if (this.size === 2 && inp.pressed.run && !this.crouch && play.countFireballs() < 2) {
      play.spawn(new Fireball(this.facing > 0 ? this.x + this.w - 2 : this.x - 6, this.y + 4, this.facing));
      play.sfx('fireball');
      this.throwT = 10;
    }

    // animation
    if (this.onGround) {
      if (Math.abs(this.vx) > 0.05) this.anim += Math.abs(this.vx) * 0.16 + 0.05;
      else this.anim = 0;
    } else if (water) {
      this.anim += 0.08;
    }
  }

  updateSpecial(inp) {
    const play = this.play;
    this.stateT++;
    switch (this.state) {
      case 'dying':
        if (this.stateT === 30) this.vy = -4.5;
        if (this.stateT > 30) { this.vy += 0.22; this.y += this.vy; }
        break;
      case 'pipe': {
        const p = this.pipe;
        if (p.dir === 'down') this.y += 1;
        else if (p.dir === 'right') { this.x += 0.75; this.anim += 0.12; }
        else if (p.dir === 'up') this.y -= 1;
        if (this.stateT >= p.frames) { this.state = p.after || 'normal'; this.behind = false; p.done && p.done(); }
        break;
      }
      case 'flag':
      case 'walk':
      case 'hidden':
      case 'frozen':
        break;
    }
  }

  frameKey() {
    if (this.state === 'dying') return 'die';
    const size = this.drawSize ?? this.size;
    if (size && this.crouch) return 'crouch';
    if (this.state === 'flag') return 'jump';
    if (this.play.water && !this.onGround) return ['w1', 'jump', 'w3'][Math.floor(this.anim) % 3];
    if (!this.onGround && this.jumping) return 'jump';
    if (this.skid && this.onGround) return 'w2';
    if (this.throwT > 0) return 'w3';
    if (this.anim === 0 && this.state !== 'walk' && !(this.state === 'pipe' && this.pipe.dir === 'right')) return 'stand';
    return ['w1', 'w2', 'w3'][Math.floor(this.anim) % 3];
  }

  draw(ctx, camX) {
    const play = this.play;
    if (this.state === 'hidden') return;
    if (this.invuln > 0 && this.state === 'normal' && (play.frame >> 1) & 1) return;
    const size = this.drawSize ?? this.size;
    const pal = heroPalette(size, this.star, play.frame);
    let key = this.frameKey();
    let form = size ? 'big' : 'small';
    if (key === 'die') form = 'small';
    if (key === 'crouch' && !size) key = 'stand';
    const spr = SPR.hero[pal][form][key];
    const flipX = this.facing < 0;
    const img = spr.pick(flipX, false);
    const x = Math.round(this.x + this.w / 2 - spr.w / 2 - camX);
    const y = Math.round(this.y + this.h - spr.h);
    ctx.drawImage(img, x, y);
  }
}

