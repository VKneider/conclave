export const CUES = [
  'ui.tap',
  'ui.toggle',
  'ui.nav',
  'modal.open',
  'modal.close',
  'toast.info',
  'toast.success',
  'toast.warning',
  'toast.error',
  'ui.blocked',
  'ui.celebrate',
];

const STORAGE_KEY = 'conclave:sound';

const RECIPES = {
  'ui.tap':       { steps: [{ f: 520, d: 0.035, type: 'triangle', g: 0.22 }] },
  'ui.toggle':    { steps: [{ f: 440, d: 0.03, g: 0.18 }, { f: 660, d: 0.05, at: 0.035, g: 0.18 }] },
  'ui.nav':       { steps: [{ f: 380, d: 0.06, type: 'sine', g: 0.16 }] },
  'modal.open':   { steps: [{ f: 300, to: 520, d: 0.12, type: 'sine', g: 0.18 }] },
  'modal.close':  { steps: [{ f: 520, to: 280, d: 0.11, type: 'sine', g: 0.16 }] },
  'toast.info':   { steps: [{ f: 660, d: 0.10, type: 'sine', g: 0.20 }] },
  'toast.success': { steps: [
    { f: 523, d: 0.09, type: 'triangle', g: 0.18 },
    { f: 659, d: 0.09, at: 0.070, type: 'triangle', g: 0.18 },
    { f: 784, d: 0.16, at: 0.140, type: 'triangle', g: 0.20 },
  ] },
  'toast.warning': { steps: [
    { f: 494, d: 0.09, type: 'square', g: 0.10 },
    { f: 494, d: 0.13, at: 0.130, type: 'square', g: 0.10 },
  ] },
  'toast.error':  { steps: [
    { f: 320, d: 0.10, type: 'triangle', g: 0.20 },
    { f: 200, d: 0.22, at: 0.080, type: 'triangle', g: 0.22 },
  ] },
  'ui.blocked':   { steps: [{ f: 160, d: 0.09, type: 'square', g: 0.12 }] },
  'ui.celebrate': { steps: [
    { f: 523, d: 0.10, type: 'triangle', g: 0.18 },
    { f: 659, d: 0.10, at: 0.090, type: 'triangle', g: 0.18 },
    { f: 784, d: 0.10, at: 0.180, type: 'triangle', g: 0.18 },
    { f: 1047, d: 0.22, at: 0.270, type: 'triangle', g: 0.20 },
  ] },
};

const MIN_INTERVAL = {
  'ui.tap': 45,
  'ui.toggle': 45,
  'ui.nav': 80,
  __default: 120,
};

const MAX_VOICES = 8;

function renderRecipe(ctx, out, cue) {
  const recipe = RECIPES[cue];
  if (!recipe) return 0;
  const now = ctx.currentTime;
  let tail = 0;
  for (const step of recipe.steps) {
    const at = now + (step.at ?? 0);
    const dur = step.d;
    const osc = ctx.createOscillator();
    osc.type = step.type ?? 'triangle';
    osc.frequency.setValueAtTime(step.f, at);
    if (step.to) osc.frequency.exponentialRampToValueAtTime(step.to, at + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(step.g ?? 0.2, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + dur + 0.02);
    tail = Math.max(tail, (step.at ?? 0) + dur);
  }
  return tail;
}

export default class SoundService {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._voices = 0;
    this._lastPlayed = new Map();
    this._muted = false;
    this._volume = 0.7;
    try {
      this._muted = localStorage.getItem(STORAGE_KEY) === 'off';
    } catch {
      // localStorage no disponible
    }
  }

  async unlock() {
    if (this._ctx && this._ctx.state === 'running') return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this._ctx) {
      this._ctx = new AC();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._volume;
      this._master.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') await this._ctx.resume();
    return this._ctx.state === 'running';
  }

  play(cue) {
    if (this._muted) return false;
    if (!RECIPES[cue]) return false;
    const min = MIN_INTERVAL[cue] ?? MIN_INTERVAL.__default;
    const now = performance.now();
    if (now - (this._lastPlayed.get(cue) ?? -Infinity) < min) return false;
    if (this._voices >= MAX_VOICES) return false;
    if (!this._ctx || this._ctx.state !== 'running') return false;
    this._lastPlayed.set(cue, now);
    this._voices++;
    const tail = renderRecipe(this._ctx, this._master, cue);
    setTimeout(() => { this._voices--; }, (tail + 0.05) * 1000);
    return true;
  }

  get muted() { return this._muted; }
  set muted(v) {
    this._muted = Boolean(v);
    try { localStorage.setItem(STORAGE_KEY, this._muted ? 'off' : 'on'); } catch { /* localStorage no disponible */ }
  }

  get volume() { return this._volume; }
  set volume(v) {
    this._volume = Math.min(1, Math.max(0, v));
    if (this._master) this._master.gain.value = this._volume;
  }

  attachSFX(root = document) {
    let unlocked = false;
    const handler = async () => {
      if (!unlocked) {
        unlocked = await this.unlock();
      }
      const el = event.composedPath().find((n) => n?.dataset?.sfx);
      if (el) this.play(el.dataset.sfx);
    };
    root.addEventListener('pointerdown', handler, { passive: true });
    return () => root.removeEventListener('pointerdown', handler);
  }
}