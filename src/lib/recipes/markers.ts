/**
 * Marqueurs dans le texte des étapes.
 *
 * Stockage (base) : « Faites fondre {{ing:<id>}} et laissez dorer {{timer:8}}. »
 * Saisie (éditeur, IA) : « Faites fondre {beurre} et laissez dorer {8 min}. »
 *
 * Les jetons lisibles `{…}` sont convertis en marqueurs à l'enregistrement,
 * et inversement à l'ouverture de l'éditeur. Fonctions pures, testées.
 */
import type { Ingredient } from "./types";

export type StepPart =
  | { type: "text"; value: string }
  | { type: "ing"; id: string }
  | { type: "timer"; minutes: number };

const MARKER_RE = /\{\{(ing|timer):([^}]+)\}\}/g;

export function parseStepText(text: string): StepPart[] {
  const parts: StepPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ type: "text", value: text.slice(last, idx) });
    if (m[1] === "ing") parts.push({ type: "ing", id: m[2] });
    else {
      const minutes = Number(m[2]);
      if (isFinite(minutes) && minutes > 0) parts.push({ type: "timer", minutes });
    }
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function timersIn(text: string): number[] {
  return parseStepText(text).flatMap((p) => (p.type === "timer" ? [p.minutes] : []));
}

export function ingredientIdsIn(text: string): string[] {
  return [...new Set(parseStepText(text).flatMap((p) => (p.type === "ing" ? [p.id] : [])))];
}

/* ───────────── Durées ───────────── */

/** 8 → « 8 min » ; 1.5 → « 1 min 30 » ; 90 → « 1 h 30 » ; 60 → « 1 h » ; 0.5 → « 30 s ». */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const secs = Math.round(minutes * 60);
  if (secs < 3600 && secs % 60) return `${Math.floor(secs / 60)} min ${String(secs % 60).padStart(2, "0")}`;
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/** « 8 min », « 8min », « 1 h 30 », « 1h30 », « 2 h », « 45 s » → minutes ; sinon null. */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase().replace(",", ".");
  let m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|heures?)\s*(\d+)?\s*(?:min|mn|m)?$/);
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0);
  m = s.match(/^(\d+)\s*(?:min|mn|minutes?|m)\s*(\d+)\s*(?:s|sec|secondes?)?$/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|minutes?|m)$/);
  if (m) return Number(m[1]);
  m = s.match(/^(\d+)\s*(?:s|sec|secondes?)$/);
  if (m) return Number(m[1]) / 60;
  return null;
}

/* ───────────── Jetons lisibles ⇄ marqueurs ───────────── */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Nom de jeton d'un ingrédient : « farine », ou « farine#2 » si le nom est en double. */
function tokenNames(ingredients: Pick<Ingredient, "id" | "name">[]): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const ing of ingredients) {
    const key = normalize(ing.name);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    out.set(ing.id, n > 1 ? `${ing.name}#${n}` : ing.name);
  }
  return out;
}

export function markersToTokens(text: string, ingredients: Pick<Ingredient, "id" | "name">[]): string {
  const names = tokenNames(ingredients);
  return text.replace(MARKER_RE, (_all, kind: string, value: string) => {
    if (kind === "timer") return `{${formatDuration(Number(value))}}`;
    const name = names.get(value);
    return name ? `{${name}}` : "";
  });
}

/** Résout le jeton `{nom}` / `{nom#2}` vers un ingrédient (nom exact, puis début de nom). */
function findIngredient(token: string, ingredients: Pick<Ingredient, "id" | "name">[]) {
  const [raw, nth] = token.split("#");
  const wanted = normalize(raw);
  const index = nth ? Math.max(0, Number(nth) - 1) : 0;
  const exact = ingredients.filter((i) => normalize(i.name) === wanted);
  if (exact.length) return exact[Math.min(index, exact.length - 1)];
  const prefix = ingredients.filter((i) => normalize(i.name).startsWith(wanted) || wanted.startsWith(normalize(i.name)));
  if (prefix.length === 1) return prefix[0];
  const contains = ingredients.filter((i) => normalize(i.name).includes(wanted));
  return contains.length === 1 ? contains[0] : undefined;
}

/**
 * Retire l'article devant un jeton d'ingrédient : « ajoutez les {œufs} » →
 * « ajoutez {œufs} » (qui s'affichera « ajoutez 4 œufs »). Les durées
 * ({8 min}) ne sont pas concernées.
 */
export function stripArticlesBeforeTokens(text: string): string {
  return text.replace(/\b(le|la|les|du|des|l['’])\s*(?=\{(?!\d)[^{}]+\}(?!\}))/gi, (m, _a, offset: number) => {
    const next = text.slice(offset + m.length);
    const inner = next.match(/^\{([^{}]+)\}/)?.[1] ?? "";
    return parseDuration(inner) != null ? m : "";
  });
}

export function tokensToMarkers(
  text: string,
  ingredients: Pick<Ingredient, "id" | "name">[],
): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  // (?<!\{) … (?!\}) : ne touche pas aux marqueurs {{…}} déjà présents
  const out = text.replace(/(?<!\{)\{([^{}]+)\}(?!\})/g, (_all, inner: string) => {
    const minutes = parseDuration(inner);
    if (minutes != null && minutes > 0) return `{{timer:${Number(minutes.toFixed(2))}}}`;
    const ing = findIngredient(inner, ingredients);
    if (ing) return `{{ing:${ing.id}}}`;
    unresolved.push(inner);
    return inner;
  });
  return { text: out, unresolved };
}
