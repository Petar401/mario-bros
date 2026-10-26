import { SPR, drawText } from './gfx.js';

export function drawHUD(ctx, game, time) {
  const pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
  drawText(ctx, 'HERO', 24, 16);
  drawText(ctx, pad(game.score, 6), 24, 24);
  const coin = SPR.hudCoin[Math.floor((game.tick || 0) / 10) % 3];
  ctx.drawImage(coin, 91, 24);
  drawText(ctx, '*' + pad(game.coins, 2), 96, 24);
  drawText(ctx, 'WORLD', 144, 16);
  drawText(ctx, game.world ? `${game.world}-${game.lvl}` : '', 152, 24);
  drawText(ctx, 'TIME', 200, 16);
  if (time !== undefined && time !== null) drawText(ctx, pad(time, 3), 208, 24);
}
