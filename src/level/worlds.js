// 8 worlds x 4 levels. Each level is an ordered list of chunks (see builder.js).
// Chunk strings are "name:arg:arg".
import { Area, CHUNKS, bonusRoom, outroArea, mulberry32 } from './builder.js';
import { T, SEMI, SOLID, ROWS } from '../tiles.js';

const CASTLE_A = ['cStart', 'cLava:3', 'cBars', 'cLava:2', 'cPillars', 'cPreBoss', 'cBridge'];
const CASTLE_B = ['cStart', 'cBars', 'cLava:3', 'cPillars', 'cLift', 'cBars', 'cPreBoss', 'cBridge'];
const CASTLE_C = ['cStart', 'cLava:2', 'cBars', 'cLow', 'cPillars', 'cLift', 'cBars', 'cPreBoss', 'cBridge'];
const CASTLE_D = ['cStart', 'cBars', 'cLava:4', 'cLow', 'cPillars', 'cBars', 'cLift', 'cPreBoss', 'cBridge'];

export const LEVELS = {
  '1-1': { theme: 'overworld', time: 400, chunks: ['start', 'intro', 'pipes:bonus', 'gap:2', 'hidden1up', 'bricks:star', 'qblocks', 'turtles', 'pyramid:4', 'stairgap:4:2', 'ret', 'walkers:2', 'finale:8'] },
  '1-2': { theme: 'underground', time: 400, outro: 'overworld', chunks: ['ugStart', 'ugBricks', 'ugColumns', 'ugPits', 'ugPipes', 'ugLifts', 'ugExit:4:3:2'] },
  '1-3': { theme: 'sky', time: 300, chunks: ['start', 'trees:5', 'liftH', 'trees:4', 'mushes:3', 'liftV', 'trees:4', 'finale:0'] },
  '1-4': { theme: 'castle', time: 300, chunks: CASTLE_A },

  '2-1': { theme: 'overworld', time: 400, chunks: ['start:castle', 'qblocks', 'paras', 'pipes:bonus', 'ledges', 'turtles', 'bricks', 'walkers:3', 'pyramid:4', 'ret', 'stairgap:4:3', 'finale:8'] },
  '2-2': { theme: 'water', time: 400, outro: 'overworld', chunks: ['wStart', 'wCoral', 'wTrench', 'wWalls', 'wCoral', 'wTrench', 'wExit'] },
  '2-3': { theme: 'sky', time: 300, chunks: ['start', 'bridgeFish:4', 'trees:3', 'bridgeFish:3', 'finale:0'] },
  '2-4': { theme: 'castle', time: 300, chunks: CASTLE_B },

  '3-1': { theme: 'night', time: 400, chunks: ['start:castle', 'intro', 'hammers', 'pipes:bonus', 'ledges', 'paras', 'bricks:star', 'hammers', 'ret', 'stairgap:4:2', 'finale:8'] },
  '3-2': { theme: 'night', time: 300, chunks: ['start:castle', 'walkers:3', 'turtles', 'paras', 'walkers:4', 'qblocks', 'cannons', 'turtles', 'pyramid:4', 'finale:8'] },
  '3-3': { theme: 'skyNight', time: 300, chunks: ['start', 'trees:4', 'liftH', 'mushes:4', 'liftH', 'trees:3', 'liftV', 'finale:0'] },
  '3-4': { theme: 'castle', time: 300, chunks: CASTLE_C },

  '4-1': { theme: 'overworld', time: 400, chunks: ['start:castle', 'lakitu', 'walkers:2', 'pipes:bonus', 'ledges', 'turtles', 'qblocks', 'ret', 'ledges', 'lakituEnd', 'pyramid:4', 'finale:8'] },
  '4-2': { theme: 'underground', time: 400, outro: 'overworld', chunks: ['ugStart', 'ugPipes', 'ugPits', 'ugColumns', 'ugBricks', 'ugPits', 'ugLifts', 'ugExit:8:7:6'] },
  '4-3': { theme: 'sky', time: 300, chunks: ['start', 'mushes:5', 'liftV', 'mushes:4', 'liftH', 'mushes:4', 'finale:0'] },
  '4-4': { theme: 'castle', time: 300, chunks: CASTLE_D },

  '5-1': { theme: 'overworld', time: 300, chunks: ['start:castle', 'walkers:3', 'cannons', 'pipes:bonus', 'paras', 'turtles', 'hammers', 'ret', 'ledges', 'cannons', 'stairgap:4:2', 'finale:8'] },
  '5-2': { theme: 'overworld', time: 400, chunks: ['start:castle', 'qblocks', 'hammers', 'paras', 'ledges', 'bricks:star', 'turtles', 'hammers', 'pyramid:4', 'finale:8'] },
  '5-3': { theme: 'sky', time: 300, chunks: ['start', 'trees:5', 'liftH', 'trees:5', 'liftV', 'trees:4', 'finale:0'] },
  '5-4': { theme: 'castle', time: 300, chunks: CASTLE_B },

  '6-1': { theme: 'night', time: 400, chunks: ['start:castle', 'lakitu', 'walkers:2', 'ledges', 'turtles', 'ledges', 'pipes:bonus', 'paras', 'ret', 'ledges', 'lakituEnd', 'stairgap:4:3', 'finale:8'] },
  '6-2': { theme: 'underground', time: 400, outro: 'night', chunks: ['ugStart', 'ugPipes', 'ugBricks', 'ugPits', 'ugPipes', 'ugColumns', 'ugPits', 'ugExit'] },
  '6-3': { theme: 'skyNight', time: 300, chunks: ['start', 'mushes:4', 'liftH', 'trees:4', 'liftV', 'mushes:4', 'liftH', 'finale:0'] },
  '6-4': { theme: 'castle', time: 300, chunks: CASTLE_C },

  '7-1': { theme: 'overworld', time: 400, chunks: ['start:castle', 'cannons', 'walkers:3', 'hammers', 'pipes:bonus', 'cannons', 'paras', 'ret', 'hammers', 'stairgap:4:3', 'finale:8'] },
  '7-2': { theme: 'water', time: 400, outro: 'overworld', chunks: ['wStart', 'wTrench', 'wCoral', 'wWalls', 'wTrench', 'wCoral', 'wWalls', 'wExit'] },
  '7-3': { theme: 'sky', time: 300, chunks: ['start', 'bridgeFish:4', 'trees:3', 'bridgeFish:4', 'finale:0'] },
  '7-4': { theme: 'castle', time: 300, chunks: CASTLE_D },

  '8-1': { theme: 'overworld', time: 300, chunks: ['start:castle', 'ledges', 'walkers:3', 'paras', 'ledges', 'turtles', 'pipes:bonus', 'ledges', 'paras', 'ret', 'ledges', 'bricks', 'ledges', 'stairgap:4:3', 'finale:8'] },
  '8-2': { theme: 'overworld', time: 400, chunks: ['start:castle', 'lakitu', 'ledges', 'cannons', 'paras', 'ledges', 'turtles', 'cannons', 'lakituEnd', 'ledges', 'stairgap:4:3', 'finale:8'] },
  '8-3': { theme: 'overworld', time: 300, chunks: ['start:castle', 'hammers', 'ledges', 'hammers', 'cannons', 'hammers', 'paras', 'hammers', 'pyramid:4', 'finale:8'] },
  '8-4': { theme: 'castle', time: 400, chunks: ['cStart', 'cLava:4', 'cBars', 'cPillars', 'cLow', 'cLift', 'cBars', 'cPillars', 'cLava:3', 'cBars', 'cPreBoss', 'cBridge'] },
};

export function standable(area, x, y) {
  const t = area.get(x, y);
  return SOLID[t] || SEMI[t];
}

// first column at/after `col` where the hero can safely stand
export function findSpawn(area, col) {
  for (let x = col; x < area.w - 2; x++) {
    // skip a ceiling (underground/castle) so we never spawn on top of it
    const st = (y) => standable(area, x, y) || standable(area, x + 1, y);
    let y0 = 2;
    if (st(2) || st(3)) { y0 = 2; while (y0 < ROWS && st(y0)) y0++; y0 += 2; }
    for (let y = y0; y < ROWS; y++) {
      if (!standable(area, x, y) || !standable(area, x + 1, y)) continue;
      if (area.get(x, y) === T.Q || area.get(x, y) === T.BRICK) break;
      if (area.get(x, y - 1) === T.EMPTY && area.get(x, y - 2) === T.EMPTY &&
          area.get(x + 1, y - 1) === T.EMPTY && area.get(x + 1, y - 2) === T.EMPTY) {
        return { x: x * 16 + 2, y: y * 16 };
      }
      break;
    }
  }
  return null;
}

export function buildLevel(world, lvl) {
  const id = `${world}-${lvl}`;
  const spec = LEVELS[id];
  const ctx = { d: world, rng: mulberry32(world * 977 + lvl * 131), world };
  const main = new Area(spec.theme);
  for (const ch of spec.chunks) {
    const [name, ...args] = ch.split(':');
    const fn = CHUNKS[name];
    if (!fn) throw new Error('unknown chunk ' + name);
    fn(main, args, ctx);
  }
  main.finish();
  const areas = [main];
  const names = { main: 0 };
  const wants = (n) => main.pipes.some(p => p.to && p.to.area === n);
  if (wants('bonus')) { names.bonus = areas.length; areas.push(bonusRoom()); }
  if (wants('outro')) { names.outro = areas.length; areas.push(outroArea(spec.outro || 'overworld')); }
  for (const a of areas) for (const p of a.pipes) if (p.to && typeof p.to.area === 'string') p.to.area = names[p.to.area];

  const checkpoint = findSpawn(main, Math.floor(main.w * 0.45));
  return { id, world, lvl, theme: spec.theme, time: spec.time, areas, checkpoint };
}
