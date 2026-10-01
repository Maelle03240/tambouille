"use client";
/**
 * Commande vocale du mode cuisine (V2, en option, l'appli n'en dépend pas).
 * Mots reconnus (français) :
 *  - « suivant », « c'est fait »        → étape suivante
 *  - « précédent », « retour »           → étape précédente
 *  - « minuteur 10 minutes »             → minuteur de la durée dite
 *  - « lance le minuteur »               → premier minuteur de l'étape en cours
 *  - « pause » / « reprends »            → met en pause / relance les minuteurs
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
  | { kind: "pause" }
  | { kind: "resume" }
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
  if (/\bpause\b/.test(t)) return { kind: "pause" };
  if (/\b(reprends|reprend|reprise|continue)\b/.test(t)) return { kind: "resume" };
  if (/\b(stop|arr[êe]te|c'est bon|silence|ok)\b/.test(t)) return { kind: "stop" };
  if (/(suivant|suivante|c'est fait|fini|d'apr[èe]s)/.test(t)) return { kind: "next" };
  if (/(pr[ée]c[ée]dent|pr[ée]c[ée]dente|retour|avant)/.test(t)) return { kind: "previous" };
  return null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Micro refusé : autorise-le dans les réglages du téléphone",
  "service-not-allowed": "Commande vocale indisponible sur cet appareil",
  "audio-capture": "Aucun micro trouvé",
  network: "La commande vocale a besoin d'internet",
};

/**
 * Sur iPhone, la reconnaissance continue renvoie souvent une seule phrase qui
 * s'allonge (« suivant … suivant ») sans jamais être « finale », et s'arrête
 * sans prévenir : on lit donc aussi les résultats provisoires, en ne traitant
 * que le texte nouveau, et on signale les erreurs.
 */
export function useVoiceCommands(onCommand: (c: VoiceCommand, heard: string) => void, onError?: (message: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const start = useRef<() => void>(() => {});
  const wanted = useRef(false);
  const handler = useRef(onCommand);
  const errorHandler = useRef(onError);
  useEffect(() => {
    handler.current = onCommand;
    errorHandler.current = onError;
  }, [onCommand, onError]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    // texte déjà traité, par résultat
    let consumed: number[] = [];
    let quickEnds = 0;
    let startedAt = 0;
    const begin = () => {
      consumed = [];
      startedAt = Date.now();
      r.start();
    };
    const giveUp = (message?: string) => {
      wanted.current = false;
      setListening(false);
      if (message) errorHandler.current?.(message);
    };
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const full = res[0].transcript;
        const fresh = full.slice(consumed[i] ?? 0);
        const cmd = parseVoiceCommand(fresh);
        if (!cmd) continue;
        // un minuteur sans durée peut encore recevoir son nombre : on attend la fin de phrase
        if (cmd.kind === "timer" && cmd.minutes == null && !res.isFinal) continue;
        consumed[i] = full.length;
        handler.current(cmd, fresh);
      }
    };
    // la reconnaissance s'arrête après un silence : on relance tant que le micro est voulu
    r.onend = () => {
      if (!wanted.current) return setListening(false);
      quickEnds = Date.now() - startedAt < 1500 ? quickEnds + 1 : 0;
      if (quickEnds >= 3) return giveUp("Le micro s'est coupé, retouche le bouton");
      try {
        begin();
      } catch {
        giveUp("Le micro s'est coupé, retouche le bouton");
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      giveUp(ERRORS[e.error] ?? `Commande vocale : erreur « ${e.error} »`);
    };
    rec.current = r;
    start.current = begin;
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
        start.current();
        setListening(true);
      } catch {
        wanted.current = false;
        errorHandler.current?.("Impossible de démarrer le micro");
      }
    }
  }, []);

  return { supported, listening, toggle };
}
