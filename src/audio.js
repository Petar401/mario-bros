// Tiny WebAudio chiptune engine: pulse/triangle/noise voices, a look-ahead
// sequencer for the (original) songs below, and synthesised sound effects.
const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteFreq(n) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) return 0;
  const midi = (parseInt(m[2], 10) + 1) * 12 + SEMI[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parse(str) {
  return str.replace(/\|/g, ' ').trim().split(/\s+/).map((tok) => {
    const [n, l] = tok.split('/');
    const d = +(l || 2);
    if (n === 'r') return { f: 0, d };
    if (n === 'k' || n === 's' || n === 'h') return { drum: n, d };
    return { f: noteFreq(n), d };
  });
}
const rep = (s, n) => Array(n).fill(s).join(' ');

const WALTZ_LEAD = 'E5/6 D5/2 C5/4 | G4/8 A4/4 | F5/6 E5/2 D5/4 | C5/12 | D5/4 E5/4 F5/4 | G5/6 F5/2 E5/4 | D5/4 B4/4 G4/4 | C5/12';
const WALTZ_BASS = 'C3/4 G3/4 G3/4 | F2/4 A2/4 A2/4 | G2/4 B2/4 D3/4 | C3/4 E3/4 G3/4 | D3/4 F3/4 A3/4 | C3/4 E3/4 G3/4 | G2/4 B2/4 D3/4 | C3/4 G2/4 C3/4';

const SONGS = {
  overworld: {
    bpm: 150, loop: true, tracks: [
      { wave: 'p25', vol: 0.075, notes: 'G4/2 C5/2 E5/2 G5/2 E5/2 C5/2 D5/4 | F5/2 E5/2 D5/2 C5/2 D5/4 r/2 G4/2 | A4/2 C5/2 F5/2 A5/2 G5/2 F5/2 E5/4 | D5/2 E5/2 F5/2 D5/2 G5/6 r/2 | E5/2 G5/2 C6/4 B5/2 A5/2 G5/4 | F5/2 A5/2 G5/2 F5/2 E5/4 C5/4 | D5/2 F5/2 E5/2 D5/2 C5/2 B4/2 C5/2 D5/2 | C5/8 r/4 G4/4' },
      { wave: 'p12', vol: 0.035, notes: 'E4/8 G4/8 | D4/8 B3/8 | C4/8 A4/8 | B3/8 D4/8 | G4/8 E4/8 | A4/8 G4/8 | F4/8 D4/8 | E4/8 r/8' },
      { wave: 'triangle', vol: 0.16, notes: 'C3/4 G3/4 C3/4 G3/4 | G2/4 D3/4 G2/4 B2/4 | F2/4 C3/4 F2/4 A2/4 | G2/4 D3/4 G2/4 D3/4 | C3/4 G3/4 E3/4 G3/4 | F2/4 A2/4 C3/4 E3/4 | G2/4 B2/4 D3/4 G2/4 | C3/4 G2/4 C3/4 r/4' },
      { wave: 'noise', vol: 0.05, notes: rep('k/4 h/2 h/2 s/4 h/2 h/2', 8) },
    ],
  },
  underground: {
    bpm: 120, loop: true, tracks: [
      { wave: 'p50', vol: 0.06, notes: 'A3/2 r/2 E4/2 r/2 A4/2 r/2 G4/2 E4/2 | D4/2 r/2 E4/2 r/2 C4/4 r/4 | A3/2 r/2 E4/2 r/2 A4/2 C5/2 B4/2 G4/2 | A4/4 r/2 E4/2 A3/4 r/4' },
      { wave: 'triangle', vol: 0.17, notes: 'A2/4 r/4 A2/4 r/4 | D2/4 r/4 E2/4 r/4 | A2/4 r/4 F2/4 r/4 | E2/4 r/4 A2/8' },
      { wave: 'noise', vol: 0.03, notes: rep('h/4 r/4 h/4 h/4', 4) },
    ],
  },
  athletic: {
    bpm: 165, loop: true, tracks: [
      { wave: 'p25', vol: 0.07, notes: WALTZ_LEAD },
      { wave: 'triangle', vol: 0.16, notes: WALTZ_BASS },
      { wave: 'noise', vol: 0.035, notes: rep('k/4 h/4 h/4', 8) },
    ],
  },
  water: {
    bpm: 112, loop: true, tracks: [
      { wave: 'p50', vol: 0.055, notes: WALTZ_LEAD },
      { wave: 'triangle', vol: 0.15, notes: WALTZ_BASS },
    ],
  },
  castle: {
    bpm: 170, loop: true, tracks: [
      { wave: 'p25', vol: 0.06, notes: 'E4/2 F4/2 E4/2 D#4/2 E4/2 G4/2 F4/2 E4/2 | D#4/2 E4/2 D#4/2 D4/2 D#4/2 F#4/2 E4/2 D#4/2 | F4/2 F#4/2 F4/2 E4/2 F4/2 G#4/2 G4/2 F4/2 | E4/4 B3/4 E4/4 r/4' },
      { wave: 'triangle', vol: 0.17, notes: 'E2/4 E2/4 E2/4 E2/4 | D#2/4 D#2/4 D#2/4 D#2/4 | F2/4 F2/4 F2/4 F2/4 | E2/4 B1/4 E2/8' },
    ],
  },
  star: {
    bpm: 190, loop: true, tracks: [
      { wave: 'p25', vol: 0.07, notes: 'C5/2 E5/2 G5/2 E5/2 C5/2 E5/2 G5/2 C6/2 | D5/2 F5/2 A5/2 F5/2 D5/2 F5/2 A5/2 D6/2' },
      { wave: 'triangle', vol: 0.16, notes: 'C3/2 r/2 C3/2 r/2 C3/2 r/2 G2/2 r/2 | D3/2 r/2 D3/2 r/2 D3/2 r/2 A2/2 r/2' },
      { wave: 'noise', vol: 0.05, notes: rep('k/2 h/2 s/2 h/2', 4) },
    ],
  },
  hurry: {
    bpm: 200, loop: false, tracks: [
      { wave: 'p25', vol: 0.07, notes: 'C6/1 B5/1 C6/1 B5/1 C6/1 B5/1 C6/2 r/2 D6/1 C#6/1 D6/1 C#6/1 D6/1 C#6/1 D6/2 r/2 E6/1 D#6/1 E6/1 D#6/1 E6/1 D#6/1 E6/4 r/6' },
    ],
  },
  death: {
    bpm: 120, loop: false, tracks: [
      { wave: 'p25', vol: 0.08, notes: 'E5/2 D#5/2 D5/2 C#5/2 C5/4 r/2 G4/2 C4/8' },
      { wave: 'triangle', vol: 0.16, notes: 'C3/8 G2/8 C2/8' },
    ],
  },
  gameover: {
    bpm: 100, loop: false, tracks: [
      { wave: 'p25', vol: 0.07, notes: 'A4/4 E4/4 C4/4 D4/2 E4/2 C4/2 A3/2 B3/4 G#3/4 A3/8' },
      { wave: 'triangle', vol: 0.16, notes: 'A2/16 E2/8 A1/8' },
    ],
  },
  clear: {
    bpm: 160, loop: false, tracks: [
      { wave: 'p25', vol: 0.08, notes: 'C5/2 G4/2 C5/2 E5/2 G5/4 E5/2 G5/2 | A5/2 F5/2 A5/2 C6/2 B5/4 G5/4 | C6/2 B5/2 A5/2 G5/2 F5/2 E5/2 D5/2 B4/2 | C5/12 r/4' },
      { wave: 'triangle', vol: 0.16, notes: 'C3/8 E3/8 | F2/8 G2/8 | A2/8 G2/8 | C3/12 r/4' },
    ],
  },
  worldClear: {
    bpm: 140, loop: false, tracks: [
      { wave: 'p25', vol: 0.08, notes: 'E5/2 G5/2 C6/4 G5/2 E5/2 C5/4 | D5/2 F5/2 A5/4 G5/2 B5/2 D6/4 | C6/4 G5/4 E5/4 G5/4 | C6/16' },
      { wave: 'triangle', vol: 0.16, notes: 'C3/8 A2/8 | D3/8 G2/8 | C3/8 G2/8 | C2/16' },
    ],
  },
};
for (const s of Object.values(SONGS)) for (const t of s.tracks) t.parsed = parse(t.notes);

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.music = null;
    this.timer = null;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.master.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.8; this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
    this.waves = {};
    for (const [k, d] of [['p12', 0.125], ['p25', 0.25], ['p50', 0.5]]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * d);
      this.waves[k] = c.createPeriodicWave(re, im);
    }
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.tick(), 25);
    if (this.pendingSong) { const [n, o] = this.pendingSong; this.pendingSong = null; this.playMusic(n, o); }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  osc(wave, freq, t) {
    const o = this.ctx.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]); else o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    return o;
  }

  tone(bus, wave, f, t, dur, vol) {
    const c = this.ctx;
    const o = this.osc(wave, f, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setTargetAtTime(vol * 0.65, t + 0.02, 0.06);
    g.gain.setTargetAtTime(0, t + Math.max(0.02, dur - 0.03), 0.015);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.1);
  }

  drum(kind, t, vol) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    let dur = 0.05;
    if (kind === 'k') { f.type = 'lowpass'; f.frequency.value = 400; dur = 0.12; vol *= 2.2; }
    else if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1800; dur = 0.1; vol *= 1.3; }
    else { f.type = 'highpass'; f.frequency.value = 7000; dur = 0.03; }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // ----------------------------------------------------------- music
  playMusic(name, opts = {}) {
    if (!this.ctx) { this.pendingSong = [name, opts]; return; }
    const song = SONGS[name];
    if (!song) return;
    const speed = opts.fast ? 1.35 : 1;
    const six = 60 / (song.bpm * speed) / 4;
    const t0 = this.ctx.currentTime + 0.06;
    this.music = {
      name, song, six, loop: opts.loop ?? song.loop, then: opts.then, fast: opts.fast,
      tracks: song.tracks.map(tr => ({ tr, i: 0, next: t0, done: false })),
      gen: (this.music ? this.music.gen : 0) + 1,
    };
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.8, this.ctx.currentTime);
  }

  stopMusic() {
    this.pendingSong = null;
    if (!this.ctx) return;
    this.music = null;
    // fade notes already scheduled
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(0, now, 0.02);
  }

  tick() {
    const m = this.music;
    if (!m || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    let allDone = true;
    for (const tk of m.tracks) {
      if (tk.done) continue;
      const notes = tk.tr.parsed;
      while (tk.next < ahead) {
        const n = notes[tk.i];
        const dur = n.d * m.six;
        if (n.drum) this.drum(n.drum, tk.next, tk.tr.vol);
        else if (n.f) this.tone(this.musicBus, tk.tr.wave, n.f, tk.next, dur, tk.tr.vol);
        tk.next += dur;
        tk.i++;
        if (tk.i >= notes.length) {
          if (m.loop) tk.i = 0;
          else { tk.done = true; break; }
        }
      }
      if (!tk.done) allDone = false;
    }
    if (allDone && !m.loop) {
      const endAt = Math.max(...m.tracks.map(t => t.next));
      if (this.ctx.currentTime >= endAt - 0.05) {
        this.music = null;
        if (m.then) this.playMusic(m.then, { fast: m.fast });
      }
    }
  }

  // ----------------------------------------------------------- sfx
  sweep(wave, f0, f1, dur, vol, t = this.ctx.currentTime) {
    const c = this.ctx;
    const o = this.osc(wave, f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.15);
    o.connect(g).connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  notes(wave, list, step, vol, t = this.ctx.currentTime) {
    list.forEach((n, i) => this.tone(this.sfxBus, wave, typeof n === 'string' ? noteFreq(n) : n, t + i * step, step * 1.1, vol));
  }
  noise(dur, vol, freq, type = 'lowpass', t = this.ctx.currentTime) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'jump': this.sweep('p25', 280, 760, 0.17, 0.08); break;
      case 'bigjump': this.sweep('p25', 200, 600, 0.2, 0.08); break;
      case 'swim': this.sweep('p50', 300, 520, 0.1, 0.06); break;
      case 'coin': this.tone(this.sfxBus, 'p50', noteFreq('B5'), t, 0.07, 0.07); this.tone(this.sfxBus, 'p50', noteFreq('E6'), t + 0.07, 0.35, 0.07); break;
      case 'bump': this.sweep('p50', 160, 70, 0.1, 0.1); break;
      case 'break': this.noise(0.25, 0.25, 1600); this.sweep('triangle', 300, 60, 0.2, 0.2); break;
      case 'stomp': this.sweep('p50', 600, 120, 0.12, 0.09); break;
      case 'kick': this.sweep('p25', 900, 300, 0.07, 0.08); break;
      case 'fireball': this.sweep('p25', 1400, 260, 0.08, 0.06); break;
      case 'sprout': this.notes('p25', ['G4', 'C5', 'E5', 'G5', 'D5', 'G5', 'B5'], 0.035, 0.06); break;
      case 'powerup': this.notes('p25', ['C5', 'E5', 'G5', 'C6', 'D5', 'F#5', 'A5', 'D6', 'E5', 'G#5', 'B5', 'E6'], 0.035, 0.07); break;
      case 'oneup': this.notes('p25', ['E6', 'G6', 'E7', 'C7', 'D7', 'G7'], 0.08, 0.07); break;
      case 'pipe':
      case 'shrink':
        for (let i = 0; i < 3; i++) this.sweep('p25', 500, 120, 0.09, 0.08, t + i * 0.11);
        break;
      case 'flagpole': this.sweep('p25', 1200, 180, 1.0, 0.07); break;
      case 'beep': this.tone(this.sfxBus, 'p25', 1320, t, 0.03, 0.04); break;
      case 'cannon': this.noise(0.25, 0.3, 500); break;
      case 'flame': this.noise(0.6, 0.15, 900, 'bandpass'); break;
      case 'bossfall': this.sweep('triangle', 500, 40, 1.2, 0.25); this.noise(1.0, 0.15, 400); break;
      case 'pause': this.notes('p25', ['E5', 'C5', 'E5', 'C5'], 0.07, 0.06); break;
      case 'select': this.tone(this.sfxBus, 'p25', 880, t, 0.05, 0.06); break;
    }
  }
}
