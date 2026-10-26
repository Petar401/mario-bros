// Tile ids and their collision properties.
export const TILE = 16;
export const ROWS = 15;
export const SCREEN_W = 256;
export const SCREEN_H = 240;

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  Q: 3,
  USED: 4,
  BLOCK: 5,
  PIPE_TL: 6, PIPE_TR: 7, PIPE_L: 8, PIPE_R: 9,
  SP_MT: 10, SP_MB: 11, SP_BT: 12, SP_BB: 13,
  HIDDEN: 14,
  COIN: 15,
  CORAL: 16,
  TT_L: 17, TT_M: 18, TT_R: 19, TRUNK: 20,
  MP_L: 21, MP_M: 22, MP_R: 23, STEM: 24,
  BRIDGE: 25, RAIL: 26,
  LAVA_TOP: 27, LAVA: 28,
  CBRIDGE: 29, CHAIN: 30,
  CANNON_TOP: 31, CANNON_MID: 32, CANNON_BASE: 33,
  WAVE: 34,
  INVIS: 35, // invisible solid wall (level borders)
};

const N = 64;
export const SOLID = new Uint8Array(N);
export const SEMI = new Uint8Array(N);
export const BUMPABLE = new Uint8Array(N);
export const DEADLY = new Uint8Array(N);

for (const t of [T.GROUND, T.BRICK, T.Q, T.USED, T.BLOCK, T.PIPE_TL, T.PIPE_TR, T.PIPE_L, T.PIPE_R,
  T.SP_MT, T.SP_MB, T.SP_BT, T.SP_BB, T.CORAL, T.BRIDGE, T.CBRIDGE,
  T.CANNON_TOP, T.CANNON_MID, T.CANNON_BASE, T.INVIS]) SOLID[t] = 1;
for (const t of [T.TT_L, T.TT_M, T.TT_R, T.MP_L, T.MP_M, T.MP_R]) SEMI[t] = 1;
for (const t of [T.BRICK, T.Q, T.HIDDEN]) BUMPABLE[t] = 1;
for (const t of [T.LAVA, T.LAVA_TOP]) DEADLY[t] = 1;

// Visual themes. `tiles` picks the tile palette; `bg` the sky colour.
export const THEMES = {
  overworld: { bg: '#5c94fc', tiles: 'over', music: 'overworld', deco: true },
  night: { bg: '#000000', tiles: 'over', music: 'overworld', deco: true },
  sky: { bg: '#5c94fc', tiles: 'over', music: 'athletic', deco: 'clouds' },
  skyNight: { bg: '#000000', tiles: 'over', music: 'athletic', deco: 'clouds' },
  underground: { bg: '#000000', tiles: 'under', music: 'underground' },
  water: { bg: '#2038ec', tiles: 'water', music: 'water' },
  castle: { bg: '#000000', tiles: 'castle', music: 'castle' },
};
