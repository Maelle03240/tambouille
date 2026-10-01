/**
 * Quelles recettes apparaissent dans mes listes (accueil, menu, frigo…) :
 * - la bibliothèque commune ;
 * - mes versions perso, qui REMPLACENT l'originale pour moi ;
 * - les recettes perso des membres de mes foyers (à côté de l'originale).
 * La base ne m'envoie déjà que ce que j'ai le droit de voir (RLS) ; l'admin
 * reçoit tout, mais ne voit dans ses listes que la même chose que les autres
 * (le reste est dans Admin → Propositions). Fonction pure, testée.
 */
import type { Recipe } from "./types";

export function visibleRecipes(all: Recipe[], me: string | null, housemates: readonly string[]): Recipe[] {
  if (!me) return all; // mode local
  const mates = new Set(housemates);
  const replaced = new Set(all.filter((r) => r.status === "personal" && r.ownerId === me && r.forkedFromId).map((r) => r.forkedFromId!));
  return all.filter((r) => {
    if (r.status === "personal") return r.ownerId === me || (!!r.ownerId && mates.has(r.ownerId));
    return !replaced.has(r.id);
  });
}
