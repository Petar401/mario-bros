// Per-browser persistence (high score, furthest world, mute). Always guarded:
// storage can be unavailable in private windows or embedded previews.
const KEY = 'spq.save.v1';

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { top: 0, unlocked: 1, muted: false, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { top: 0, unlocked: 1, muted: false };
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
