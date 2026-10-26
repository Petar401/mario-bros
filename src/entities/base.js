import { SOLID, SEMI, T } from '../tiles.js';

export const GRAVITY = 0.25;

export class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.onGround = false;
    this.behind = false;
    this.t = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }
  overlaps(o) {
    return this.x < o.x + o.w && this.x + this.w > o.x && this.y < o.y + o.h && this.y + this.h > o.y;
  }
  update() {}
  draw() {}
}

// Draw a sprite bottom-centred on an entity's hitbox.
export function drawOn(ctx, spr, e, camX, flipX = false, flipY = false, dy = 0) {
  const img = spr.pick(flipX, flipY);
  const x = Math.round(e.x + e.w / 2 - spr.w / 2 - camX);
  const y = Math.round(e.y + e.h - spr.h + dy);
  ctx.drawImage(img, x, y);
}

// Tile collision. Returns -1/1 when blocked horizontally, 0 otherwise.
export function moveX(play, e) {
  e.x += e.vx;
  const top = Math.floor(e.y / 16), bot = Math.floor((e.y + e.h - 1) / 16);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 1) / 16);
    for (let ty = top; ty <= bot; ty++) {
      if (play.solidAt(tx, ty)) { e.x = tx * 16 - e.w; return 1; }
    }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / 16);
    for (let ty = top; ty <= bot; ty++) {
      if (play.solidAt(tx, ty)) { e.x = (tx + 1) * 16; return -1; }
    }
  }
  return 0;
}

// Vertical movement. Returns the list of tiles hit by the head (when rising).
export function moveY(play, e, hidden = false) {
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  e.onGround = false;
  const l = Math.floor(e.x / 16), r = Math.floor((e.x + e.w - 1) / 16);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 1) / 16);
    if (ty < 0 || ty >= 15) return null;
    for (let tx = l; tx <= r; tx++) {
      const t = play.tileAt(tx, ty);
      if (SOLID[t] || (SEMI[t] && prevBottom <= ty * 16 + 0.5)) {
        e.y = ty * 16 - e.h; e.vy = 0; e.onGround = true;
        return null;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / 16);
    if (ty < 0 || ty >= 15) return null;
    const hits = [];
    for (let tx = l; tx <= r; tx++) {
      const t = play.tileAt(tx, ty);
      if (SOLID[t] || (hidden && t === T.HIDDEN)) hits.push(tx);
    }
    if (hits.length) {
      e.y = (ty + 1) * 16; e.vy = 0;
      return hits.map(tx => [tx, ty]);
    }
  }
  return null;
}

// is there ground below the point ahead of an entity walking in dir?
export function groundAhead(play, e, dir) {
  const fx = dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const tx = Math.floor(fx / 16), ty = Math.floor((e.y + e.h + 2) / 16);
  const t = play.tileAt(tx, ty);
  return SOLID[t] || SEMI[t];
}
