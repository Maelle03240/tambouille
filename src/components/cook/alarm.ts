/**
 * Alerte de fin de minuteur : bips (Web Audio) + vibration quand c'est
 * possible. Sur iPhone, le son doit être « débloqué » par un premier geste :
 * `unlockAudio()` est appelé au premier toucher dans le mode cuisine.
 */
let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;
let stopAt = 0;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* pas de son : tant pis */
  }
}

function beep(at: number, freq = 880, dur = 0.16) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function ring() {
  if (ctx) {
    const t = ctx.currentTime + 0.02;
    beep(t);
    beep(t + 0.22);
    beep(t + 0.44, 1175);
  }
  try {
    navigator.vibrate?.([400, 150, 400]);
  } catch {}
}

/** Sonne en boucle jusqu'à `stopAlarm()` (arrêt automatique après 90 s). */
export function startAlarm() {
  unlockAudio();
  stopAt = Date.now() + 90_000;
  if (loop) return;
  ring();
  loop = setInterval(() => {
    if (Date.now() > stopAt) return stopAlarm();
    ring();
  }, 1500);
}

export function stopAlarm() {
  if (loop) clearInterval(loop);
  loop = null;
  try {
    navigator.vibrate?.(0);
  } catch {}
}
