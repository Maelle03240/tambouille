"use client";
/**
 * Commande vocale du mode cuisine (V2, en option, l'appli n'en dépend pas).
 * Mots reconnus (français) :
 *  - « suivant », « c'est fait »        → étape suivante
 *  - « précédent », « retour »           → étape précédente
 *  - « minuteur 10 minutes »             → minuteur de la durée dite
 *  - « lance le minuteur »               → premier minuteur de l'étape en cours
 *  - « stop », « c'est bon », « arrête » → coupe l'alarme
 * Utilise la reconnaissance vocale du navigateur (Safari, Chrome) ; le
 * bouton micro n'apparaît que si elle existe.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDuration } from "@/lib/recipes/markers";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export type VoiceCommand =
  | { kind: "next" }
  | { kind: "previous" }
  | { kind: "timer"; minutes: number | null }
  | { kind: "stop" };

const NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, "quarante-cinq": 45, cinquante: 50, soixante: 60,
};

/** Transforme une phrase entendue en commande (fonction pure, testable). */
export function parseVoiceCommand(heard: string): VoiceCommand | null {
  const t = heard
    .toLowerCase()
    .replace(/\b(une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante-cinq|quarante|cinquante|soixante)\b/g, (w) => String(NUMBERS[w] ?? w));
  const kw = t.search(/minuteur|chrono|timer/);
  if (kw >= 0) {
    // la durée se dit après le mot « minuteur » (« un minuteur de 1 heure »)
    const m = t.slice(kw).match(/(\d+(?:[.,]\d+)?)\s*(h|heures?|min|minutes?|s|secondes?)?/);
    if (!m) return { kind: "timer", minutes: null };
    const minutes = parseDuration(`${m[1]} ${m[2]?.startsWith("h") ? "h" : m[2]?.startsWith("s") ? "s" : "min"}`);
    return { kind: "timer", minutes };
  }
  if (/\b(stop|arr[êe]te|c'est bon|silence|ok)\b/.test(t)) return { kind: "stop" };
  if (/(suivant|suivante|c'est fait|fini|d'apr[èe]s)/.test(t)) return { kind: "next" };
  if (/(pr[ée]c[ée]dent|pr[ée]c[ée]dente|retour|avant)/.test(t)) return { kind: "previous" };
  return null;
}

export function useVoiceCommands(onCommand: (c: VoiceCommand, heard: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const handler = useRef(onCommand);
  useEffect(() => {
    handler.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const heard = e.results[i][0].transcript;
        const cmd = parseVoiceCommand(heard);
        if (cmd) handler.current(cmd, heard);
      }
    };
    // la reconnaissance s'arrête après un silence : on relance tant que le micro est voulu
    r.onend = () => {
      if (wanted.current) {
        try {
          r.start();
        } catch {}
      } else setListening(false);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wanted.current = false;
        setListening(false);
      }
    };
    rec.current = r;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    return () => {
      wanted.current = false;
      try {
        r.stop();
      } catch {}
    };
  }, []);

  const toggle = useCallback(() => {
    const r = rec.current;
    if (!r) return;
    if (wanted.current) {
      wanted.current = false;
      r.stop();
      setListening(false);
    } else {
      wanted.current = true;
      try {
        r.start();
      } catch {}
      setListening(true);
    }
  }, []);

  return { supported, listening, toggle };
}
