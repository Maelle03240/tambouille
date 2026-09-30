"use client";
/**
 * État du mode cuisine pour une recette : portions, ingrédients cochés,
 * étape en cours, étapes faites, minuteurs. Gardé dans le navigateur
 * (localStorage) pour survivre à un rechargement ou à iOS qui ferme l'appli,
 * et oublié après 12 h.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { startAlarm, stopAlarm } from "./alarm";

export interface Timer {
  key: string;
  stepIndex: number;
  /** Durée prévue dans la recette (minutes). */
  minutes: number;
  /** Fin (timestamp ms) si en marche ; null si en pause. */
  endAt: number | null;
  /** Secondes restantes quand en pause. */
  pausedRemaining: number;
  rang: boolean;
}

interface Saved {
  savedAt: number;
  servings: number;
  checked: string[];
  current: number;
  timers: Record<string, Timer>;
}

const TTL = 12 * 3600 * 1000;
const storageKey = (id: string) => `tambouille:cook:${id}`;

function load(id: string): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return Date.now() - s.savedAt < TTL ? s : null;
  } catch {
    return null;
  }
}

export function remainingSec(t: Timer, now = Date.now()) {
  return t.endAt != null ? Math.max(0, (t.endAt - now) / 1000) : t.pausedRemaining;
}

/**
 * À n'utiliser que dans un composant rendu côté navigateur (le mode cuisine
 * attend la recette chargée depuis IndexedDB) : l'état initial est relu
 * directement depuis localStorage.
 */
export function useCookSession(recipeId: string, baseServings: number, stepCount: number) {
  const [saved] = useState(() => load(recipeId));
  const [servings, setServings] = useState(saved?.servings ?? baseServings);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(saved?.checked ?? []));
  const [current, setCurrent] = useState(() => Math.min(saved?.current ?? 0, stepCount));
  const [timers, setTimers] = useState<Record<string, Timer>>(saved?.timers ?? {});
  const [ringing, setRinging] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Sauvegarde
  useEffect(() => {
    const s: Saved = { savedAt: Date.now(), servings, checked: [...checked], current, timers };
    try {
      localStorage.setItem(storageKey(recipeId), JSON.stringify(s));
    } catch {}
  }, [recipeId, servings, checked, current, timers]);

  // Tic-tac + détection de fin
  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);
  const anyRunning = Object.values(timers).some((t) => t.endAt != null);
  useEffect(() => {
    if (!anyRunning) return;
    const iv = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const done = Object.values(timersRef.current).find((x) => x.endAt != null && !x.rang && x.endAt <= t);
      if (!done) return;
      setTimers((all) => ({ ...all, [done.key]: { ...done, rang: true, endAt: null, pausedRemaining: 0 } }));
      setRinging(done.key);
      startAlarm();
    }, 250);
    return () => clearInterval(iv);
  }, [anyRunning]);

  useEffect(() => () => stopAlarm(), []);

  const toggleChecked = useCallback((id: string) => {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  /**
   * Toucher l'étape en cours = « c'est fait » → étape suivante.
   * Toucher une autre étape = elle devient en cours (les précédentes sont faites).
   */
  const tapStep = useCallback(
    (i: number) => setCurrent((c) => (i === c ? (i + 1 < stepCount ? i + 1 : stepCount) : i)),
    [stepCount],
  );

  const startTimer = useCallback((key: string, stepIndex: number, minutes: number, seconds: number) => {
    setNow(Date.now());
    setTimers((all) => ({
      ...all,
      [key]: { key, stepIndex, minutes, endAt: Date.now() + seconds * 1000, pausedRemaining: seconds, rang: false },
    }));
  }, []);

  const setRemaining = useCallback((key: string, seconds: number) => {
    setTimers((all) => {
      const t = all[key];
      if (!t) return all;
      return {
        ...all,
        [key]: t.endAt != null ? { ...t, endAt: Date.now() + seconds * 1000 } : { ...t, pausedRemaining: seconds },
      };
    });
  }, []);

  const togglePause = useCallback((key: string) => {
    setNow(Date.now());
    setTimers((all) => {
      const t = all[key];
      if (!t) return all;
      return {
        ...all,
        [key]:
          t.endAt != null
            ? { ...t, endAt: null, pausedRemaining: remainingSec(t) }
            : { ...t, endAt: Date.now() + t.pausedRemaining * 1000 },
      };
    });
  }, []);

  const stopTimer = useCallback((key: string) => {
    setTimers((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });
  }, []);

  const acknowledge = useCallback(() => {
    stopAlarm();
    setRinging(null);
  }, []);

  const reset = useCallback(() => {
    setChecked(new Set());
    setCurrent(0);
    setTimers({});
    setServings(baseServings);
  }, [baseServings]);

  return {
    servings,
    setServings,
    checked,
    toggleChecked,
    current,
    tapStep,
    timers,
    now,
    ringing,
    startTimer,
    setRemaining,
    togglePause,
    stopTimer,
    acknowledge,
    reset,
  };
}

/** 125 → « 2:05 » ; 3725 → « 1:02:05 ». */
export function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
