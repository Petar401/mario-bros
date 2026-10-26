# Super Plumber Quest

An NES-style side-scrolling platformer that runs in the browser. It is modelled on the
structure and feel of *Super Mario Bros.* (1985). All pixel art, music and sound effects
are original and generated in code. There are no Nintendo assets, names or melodies.

- **8 worlds × 4 levels**: overworld, underground, sky/athletic, underwater, night, and a castle with a boss at the end of every world
- Classic mechanics: walk/run, variable-height jumps, ? blocks, breakable bricks, coins, power-ups (grow, fire, star, 1-UP), shells, pipes, bonus rooms, warp zones, flagpoles, checkpoints, timer
- Enemies: walkers, turtles (green/red, winged), pipe plants, fish (swimming and leaping), squid, hammer throwers, a cloud rider that drops spiny eggs, bullet cannons, lava bubbles, fire bars, and a dragon boss on a collapsing bridge
- Chiptune music and SFX synthesised with WebAudio
- Keyboard and touch controls; high score and furthest world saved locally

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | ← → (or A / D) | D-pad |
| Crouch / enter pipe | ↓ (or S) | D-pad down |
| Jump (hold for higher) | Z, Space, ↑ | A |
| Run / fireball | X, Shift | B |
| Start / pause | Enter, P, Esc | START |
| Mute | M | ♪ |

## Run locally

It's plain static files (ES modules, no build step):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Debug URL parameters: `?level=3-4` jumps straight to a level, `?god=1` makes the hero invulnerable, and `?touch=1` forces the on-screen controls.

## Code layout

```
index.html, style.css      page shell and touch controls
src/main.js                boot, fixed 60 Hz loop, title/intro/game-over/ending scenes
src/play.js                level runtime: tiles, camera, collisions, blocks, pipes, flag & boss sequences
src/entities/              player, enemies, items/platforms, shared physics
src/level/builder.js       chunk library used to assemble levels
src/level/worlds.js        the 32 level definitions
src/gfx.js                 pixel-art sprites, tiles and bitmap font (all drawn from code)
src/audio.js               WebAudio chiptune sequencer, songs and sound effects
src/input.js, hud.js, storage.js
```

## Deploy

The site is static. `vercel.json` only adds cache headers, so `vercel deploy` from the repo root works with no build settings.
