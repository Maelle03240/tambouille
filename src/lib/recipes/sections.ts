/**
 * Parties d'une liste (ingrédients ou étapes) : chaque élément porte le nom
 * de sa partie (`section`), l'éditeur affiche une ligne de titre au début de
 * chaque partie. Fonctions pures, testées : passage éléments ⇄ lignes,
 * déplacement (un élément glissé sous un titre rejoint cette partie),
 * renommage et suppression d'un titre.
 * `section: ""` = partie pas encore nommée (devient null à l'enregistrement).
 */

export interface Sectioned {
  id: string;
  section: string | null;
}

export type SectionRow<T> = { kind: "section"; key: string; name: string; firstId: string } | { kind: "item"; item: T };

export function toRows<T extends Sectioned>(items: T[]): SectionRow<T>[] {
  const rows: SectionRow<T>[] = [];
  items.forEach((item, i) => {
    if (item.section != null && item.section !== items[i - 1]?.section) {
      rows.push({
        kind: "section",
        key: `sec:${item.id}`,
        name: item.section,
        firstId: item.id,
      });
    }
    rows.push({ kind: "item", item });
  });
  return rows;
}

/** Lignes → éléments : chacun prend le nom du dernier titre au-dessus de lui. */
export function fromRows<T extends Sectioned>(rows: SectionRow<T>[]): T[] {
  let section: string | null = null;
  const out: T[] = [];
  for (const r of rows) {
    if (r.kind === "section") section = r.name;
    else out.push(r.item.section === section ? r.item : { ...r.item, section });
  }
  return out;
}

export function moveRow<T extends Sectioned>(items: T[], from: number, to: number): T[] {
  const rows = toRows(items);
  const [r] = rows.splice(from, 1);
  rows.splice(to, 0, r);
  return fromRows(rows);
}

/**
 * Monte (-1) ou descend (+1) toute une partie, en passant la partie voisine.
 * Impossible (mêmes éléments renvoyés) au bord, ou face aux éléments sans partie du haut.
 */
export function movePart<T extends Sectioned>(items: T[], firstId: string, dir: -1 | 1): T[] {
  const start = items.findIndex((x) => x.id === firstId);
  if (start < 0) return items;
  const section = items[start].section;
  let end = start;
  while (end < items.length && items[end].section === section) end++;
  if (dir < 0) {
    const above = items[start - 1]?.section;
    if (above == null) return items;
    let from = start;
    while (from > 0 && items[from - 1].section === above) from--;
    return [...items.slice(0, from), ...items.slice(start, end), ...items.slice(from, start), ...items.slice(end)];
  }
  const below = items[end]?.section;
  if (below == null) return items;
  let to = end;
  while (to < items.length && items[to].section === below) to++;
  return [...items.slice(0, start), ...items.slice(end, to), ...items.slice(start, end), ...items.slice(to)];
}

/** Renomme la partie qui commence à `firstId`. */
export function renameSection<T extends Sectioned>(items: T[], firstId: string, name: string | null): T[] {
  const start = items.findIndex((x) => x.id === firstId);
  if (start < 0) return items;
  const old = items[start].section;
  const out = [...items];
  for (let i = start; i < out.length && out[i].section === old; i++) out[i] = { ...out[i], section: name };
  return out;
}

/** Retire le titre : ses éléments rejoignent la partie d'au-dessus. */
export function removeSection<T extends Sectioned>(items: T[], firstId: string): T[] {
  const start = items.findIndex((x) => x.id === firstId);
  if (start < 0) return items;
  return renameSection(items, firstId, items[start - 1]?.section ?? null);
}

/**
 * Ajoute une partie. Première partie : un titre au-dessus de tout ce qui est
 * déjà écrit. Sinon : un titre et un élément vide (`blank`) à la fin.
 */
export function addSection<T extends Sectioned>(items: T[], blank: (section: string) => T): { items: T[]; focusId: string } {
  if (items.length && items.every((x) => x.section === null)) {
    const out = items.map((x) => ({ ...x, section: "" }));
    return { items: out, focusId: `sec:${out[0].id}` };
  }
  const b = blank("");
  return { items: [...items, b], focusId: `sec:${b.id}` };
}

/** À l'enregistrement : partie sans nom = pas de partie. */
export const cleanSection = (s: string | null | undefined) => s?.trim() || null;
