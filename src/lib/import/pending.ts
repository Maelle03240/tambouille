/**
 * Passe le fichier choisi (photo / capture) de la feuille « Ajouter » à
 * l'écran /ajouter, en mémoire seulement : la photo n'est jamais stockée.
 */
export type PendingImport = { kind: "image"; file: File; source: "photo" | "capture" };

let pending: PendingImport | null = null;

export function setPendingImport(p: PendingImport) {
  pending = p;
}

export function peekPendingImport(): PendingImport | null {
  return pending;
}

export function clearPendingImport() {
  pending = null;
}
