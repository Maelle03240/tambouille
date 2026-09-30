/**
 * Alarme de fin de minuteur : sonnerie forte qui boucle jusqu'à l'arrêt,
 * + vibration quand l'appareil le permet (pas sur iPhone).
 *
 * Pourquoi c'est fait ainsi (iPhone) :
 * - le son doit être « débloqué » pendant un vrai geste (fin de toucher /
 *   clic) : `unlockAudio()` est appelé sur chaque toucher du mode cuisine ;
 * - on joue un élément <audio> (sonnerie générée ici, sans fichier) plutôt
 *   que Web Audio, qui est coupé par le bouton silencieux de l'iPhone ;
 * - `navigator.audioSession.type = "playback"` (Safari 17+) demande à iOS de
 *   traiter le son comme un média (volume média, pas le mode silencieux).
 * Réglages : SOUND ci-dessous (durée, notes, volume).
 */

const SOUND = {
  sampleRate: 22050,
  /** Durée d'un motif (s), rejoué en boucle. */
  pattern: 1.4,
  /** Bips : [début (s), durée (s), fréquence (Hz)]. */
  beeps: [
    [0, 0.16, 988],
    [0.22, 0.16, 988],
    [0.44, 0.16, 988],
    [0.66, 0.3, 1319],
  ] as [number, number, number][],
  volume: 0.95,
  /** Arrêt automatique (ms) si personne ne réagit. */
  maxDurationMs: 3 * 60_000,
};

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let vibrateLoop: ReturnType<typeof setInterval> | null = null;

/** Sonnerie en WAV (PCM 16 bits), générée une fois. */
function alarmUrl(): string {
  const { sampleRate: sr, pattern, beeps, volume } = SOUND;
  const n = Math.floor(sr * pattern);
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    for (const [start, dur, f] of beeps) {
      if (t < start || t > start + dur) continue;
      const local = t - start;
      const env = Math.min(1, local / 0.01, (dur - local) / 0.02); // attaque / relâche douces
      // onde « carrée arrondie » : bien audible, sans grésiller
      s += env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(6 * Math.PI * f * t) + 0.15 * Math.sin(10 * Math.PI * f * t));
    }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s * volume * 0.72)) * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function getAudio() {
  if (!audio) {
    audio = new Audio(alarmUrl());
    audio.loop = true;
    audio.preload = "auto";
  }
  return audio;
}

/** À appeler pendant un geste (toucher / clic) : autorise le son pour plus tard. */
export function unlockAudio() {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  } catch {}
  if (unlocked) return;
  try {
    const a = getAudio();
    a.muted = true;
    a.play()
      .then(() => {
        if (!ringing) {
          a.pause();
          a.currentTime = 0;
        }
        a.muted = false;
        unlocked = true;
      })
      .catch(() => {
        a.muted = false;
      });
  } catch {}
}

let ringing = false;

/** Sonne en boucle jusqu'à `stopAlarm()`. */
export function startAlarm() {
  ringing = true;
  try {
    const a = getAudio();
    a.muted = false;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {}
  try {
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500]);
      vibrateLoop = setInterval(() => navigator.vibrate?.([500, 200, 500]), 1400);
    }
  } catch {}
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = setTimeout(stopAlarm, SOUND.maxDurationMs);
}

export function stopAlarm() {
  ringing = false;
  if (stopTimer) clearTimeout(stopTimer);
  if (vibrateLoop) clearInterval(vibrateLoop);
  stopTimer = vibrateLoop = null;
  try {
    audio?.pause();
    if (audio) audio.currentTime = 0;
    navigator.vibrate?.(0);
  } catch {}
}

/** Pour le bouton « Tester l'alarme » : sonne 3 secondes. */
export function testAlarm() {
  unlockAudio();
  startAlarm();
  setTimeout(stopAlarm, 3000);
}
